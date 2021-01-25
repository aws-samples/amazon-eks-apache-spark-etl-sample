#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as iam  from '@aws-cdk/aws-iam';
import * as ec2  from '@aws-cdk/aws-ec2';
import * as eks from '@aws-cdk/aws-eks';
import * as emrcontainers from '@aws-cdk/aws-emrcontainers';

import * as fs from 'fs';

import {readYamlFromDir} from '../utils/read-file';

const app = new cdk.App();


/*
* EMR adds a label emr-containers.amazonaws.com/resource.type=job.run to all the pods used to run for the jobs.
* Another label emr-containers.amazonaws.com/component=controller is added for the three different types of pods we launch. 
* Values can be executor|driver|controller. Use this to provide fine grained placement policy eg if user wants only executors on Fargate but rest on ec2.
*/

class EksEmrStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    /*
    * CFN Config parameters: use cdk deploy --parameters <StackName>:<PARAMETER_NAME>=<PARAMETER_VALUE> to override default options
    */
    const adminRoleArn = new cdk.CfnParameter(this, "adminRoleArn", {
      type: "String",
      allowedPattern:"^arn:aws:iam::[0-9]+:role/.+$",
      minLength:10, //arn:aws:iam::763234233692:role/AdminRole
      description: "The role Arn you use in the AWS console so you can see EKS cluster settings"});
    
    // create EKS cluster
    const eksCluster = new eks.Cluster(this, 'Cluster', {
      defaultCapacity: 0,  
      version: eks.KubernetesVersion.V1_18
    });
    
    // Add the role to Kubernetes auth configMap so you can manage the kubernetes cluster with this role
    const clusterAdmin = iam.Role.fromRoleArn(this,'AdminRole',adminRoleArn.valueAsString);
    eksCluster.awsAuth.addMastersRole(clusterAdmin,'AdminRole');
  
    // Add EKS-managed node group for running cert manager and ALB Ingress controller
    eksCluster.addNodegroupCapacity('tooling', {
      instanceType: new ec2.InstanceType('t3.medium'),
      minSize: 2,
      labels:{"lifecycle":"od","noderole":"tooling"}
    });
    
    //Add self-managed EC2 Autoscaling Node group for on-demand EMR jobs
    // @TODO - Figure out how to specify Availability zones as it seems to be a bug in CDK
    const asgSparkOnDemand = eksCluster.addAutoScalingGroupCapacity('sparkOnDemand', {
      instanceType: new ec2.InstanceType('r5d.xlarge'),
      minCapacity: 0,
      maxCapacity: 4,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE }, // specifying availabilityZones:[`${cdk.Stack.of(this).region}a`]  give CDK error
      bootstrapOptions: {
        kubeletExtraArgs: '--node-labels  arch=intel,os=linux,lifecycle=od,disk=nvme,noderole=spark,emr-containers.amazonaws.com/resource.type=job.run'
      }
    });
    
    asgSparkOnDemand.addUserData(
      "IDX=1 && for DEV in /dev/disk/by-id/nvme-Amazon_EC2_NVMe_Instance_Storage_*-ns-1; do  mkfs.xfs ${DEV};mkdir -p /pv-disks/local${IDX};echo ${DEV} /pv-disks/local${IDX} xfs defaults,noatime 1 2 >> /etc/fstab; IDX=$((${IDX} + 1)); done",
      "mount -a"
    );
    
    //Add self-managed EC2 Autoscaling Node group for spot EMR workloads
    const asgSparkSpot = eksCluster.addAutoScalingGroupCapacity('sparkSpot', {
      instanceType: new ec2.InstanceType('r5d.xlarge'),
      minCapacity: 0,
      maxCapacity: 4,
      spotPrice: '0.28',
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
      bootstrapOptions: {
        kubeletExtraArgs: '--node-labels  arch=intel,os=linux,lifecycle=spot,disk=nvme,noderole=spark,emr-containers.amazonaws.com/resource.type=job.run'
      }
    });
    
    asgSparkSpot.addUserData(
      "IDX=1 && for DEV in /dev/disk/by-id/nvme-Amazon_EC2_NVMe_Instance_Storage_*-ns-1; do  mkfs.xfs ${DEV};mkdir -p /pv-disks/local${IDX};echo ${DEV} /pv-disks/local${IDX} xfs defaults,noatime 1 2 >> /etc/fstab; IDX=$((${IDX} + 1)); done",
      "mount -a"
    );
    
    
    // Add EKS Fargate profile for EMR workloads
    eksCluster.addFargateProfile('fargate',{selectors:[{namespace:'spark-serverless'}]});
    
    //install cert manager by importing and running Kubernetes manifest file
    readYamlFromDir('./k8s/cert/', eksCluster);
    //add Kubernetes namespace for Fargate by importing and running Kubernetes manifest file
    readYamlFromDir('./k8s/namespaces/', eksCluster);
    // install ALB Ingress Controller by importing and running Kubernetes manifest file
    readYamlFromDir('./k8s/alb/', eksCluster);
    
    
    //Create IAM policy, role and Service Account for ALB Ingress 
    const albPolicyDocument = iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync('./k8s/iam-policy.json', 'utf8')));
    const albIAMPolicy = new iam.Policy(this,'AWSLoadBalancerControllerIAMPolicy',{document:albPolicyDocument});
    const albServiceAccount = eksCluster.addServiceAccount('ALB',{name:'aws-load-balancer-controller',namespace:'kube-system'});
    albIAMPolicy.attachToRole(albServiceAccount.role);
  
    
    //Create serviceLinkedRole for EMR and add to kubernetes configmap
    new iam.CfnServiceLinkedRole(this, 'EmrServiceIAMRole', {awsServiceName:'emr-containers.amazonaws.com'});
    /*  
    * Bit of cheating here adding to masters group, we should be adding RBAC Role and RoleBinding for that user and also add Identity into configMap, but CDK doesn't give an easy option just yet. 
    * If you don't want to add it to masters, the easiest way would be to comment out the line below and use eksctl command from here: https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-cluster-access.html    
    */
    eksCluster.awsAuth.addMastersRole(iam.Role.fromRoleArn(this, 'AWSServiceRoleForAmazonEMRContainers', `arn:aws:iam::${cdk.Stack.of(this).account}:role/AWSServiceRoleForAmazonEMRContainers`),'emr-containers');

    
    
    //Create EMR Worker IAM Role and trust policy
    const EmrWorkerPolicyDocument = iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync('./k8s/iam-policy-emr-job-role.json', 'utf8')));
    const EmrWorkerIAMPolicy = new iam.Policy(this,'EMRWorkerIAMPolicy',{document:EmrWorkerPolicyDocument});
    const EmrWorkerIAMRole = new iam.Role(this,'EMRWorkerIAMRole',{assumedBy: new iam.FederatedPrincipal(eksCluster.openIdConnectProvider.openIdConnectProviderArn,[],'sts:AssumeRoleWithWebIdentity')});
    EmrWorkerIAMPolicy.attachToRole(EmrWorkerIAMRole);
    
    //create virtual clusters
    
    new emrcontainers.CfnVirtualCluster(this, 'EMRClusterEc2', {name:'spark-ec2',containerProvider:{
      id:eksCluster.clusterName, type:'EKS', info:{eksInfo:{namespace:"default"}}
    }});
    
    new emrcontainers.CfnVirtualCluster(this, 'EMRClusterFargate', {name:'spark-fargate',containerProvider:{
      id:eksCluster.clusterName, type:'EKS', info:{eksInfo:{namespace:"spark-serverless"}}
    }});
    
    // Output the value for EMRJobRole to be used when submitting your jobs
    
    new cdk.CfnOutput(this, 'EMRJobRoleArn', {
      value: EmrWorkerIAMRole.roleArn,
      description: 'The role ARN to use when submitting jobs', 
      exportName: 'EMRJobRoleArn'
    });
    
  }
}

new EksEmrStack(app, 'EksEmrStack');
