import * as cdk from '@aws-cdk/core';
import * as iam  from '@aws-cdk/aws-iam';
import * as ec2  from '@aws-cdk/aws-ec2';
import * as eks from '@aws-cdk/aws-eks';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

import {readYamlFromDir} from '../utils/read-file';
/*
* EMR adds a label emr-containers.amazonaws.com/resource.type=job.run to all the pods used to run for the jobs.
* Another label emr-containers.amazonaws.com/component=controller is added for the three different types of pods we launch. 
* Values can be executor|driver|controller. Use this to provide fine grained placement policy eg if user wants only executors on Fargate but rest on ec2.
*/
export class EksStack extends cdk.Stack {
  
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
      desiredCapacity:0,
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
    
    /*
    *. Uncomment the snippet below if you want to use managed node groups for spark instead of self-managed node groups
    *
    *
    const userData = [
      "IDX=1 && for DEV in /dev/disk/by-id/nvme-Amazon_EC2_NVMe_Instance_Storage_*-ns-1; do  mkfs.xfs ${DEV};mkdir -p /pv-disks/local${IDX};echo ${DEV} /pv-disks/local${IDX} xfs defaults,noatime 1 2 >> /etc/fstab; IDX=$((${IDX} + 1)); done",
      "mount -a"
    ].join('\r\n');
    const userDataMime = `MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="==MYBOUNDARY=="

--==MYBOUNDARY==
Content-Type: text/x-shellscript; charset="us-ascii"

#!/bin/bash
${userData}

--==MYBOUNDARY==--\\
`;
    const lt = new ec2.CfnLaunchTemplate(this, 'LaunchTemplate', {
      launchTemplateData: {
        instanceType: 'r5d.xlarge',
        userData: cdk.Fn.base64(userDataMime),
        
      },
    });
    
    const sparkSpotNodeGroup = eksCluster.addNodegroupCapacity('sparkSpot', {
      launchTemplateSpec: {
        id: lt.ref,
        version: lt.attrLatestVersionNumber
      },
      minSize:0,
      capacityType:eks.CapacityType.SPOT,
      labels:{arch:"intel",os:"linux",lifecycle:"spot",disk:"nvme",noderole:"spark","emr-containers.amazonaws.com/resource.type":"job.run"}
    });
*/
    
    //Tag groups to be discoverable by autoscaler
    cdk.Tags.of(asgSparkSpot).add('k8s.io/cluster-autoscaler/'+cdk.Token.asString(eksCluster.clusterName), "owned", { applyToLaunchedInstances: true });
    cdk.Tags.of(asgSparkSpot).add("k8s.io/cluster-autoscaler/enabled", "true", { applyToLaunchedInstances: true });
    cdk.Tags.of(asgSparkOnDemand).add('k8s.io/cluster-autoscaler/'+cdk.Token.asString(eksCluster.clusterName), "owned", { applyToLaunchedInstances: true });
    cdk.Tags.of(asgSparkOnDemand).add("k8s.io/cluster-autoscaler/enabled", "true", { applyToLaunchedInstances: true });
      
    
    // Add EKS Fargate profile for EMR workloads
    eksCluster.addFargateProfile('fargate',{selectors:[{namespace:'spark-serverless'}]});
    
    //install cert manager by importing and running Kubernetes manifest file
    readYamlFromDir('./k8s/cert/', eksCluster);
    //add Kubernetes namespace for Fargate by importing and running Kubernetes manifest file
    readYamlFromDir('./k8s/namespaces/', eksCluster);

    //Create ClusterAutscaler IAM Role 
    const ClusterAutoscalerPolicyDocument = iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync('./k8s/iam-policy-autoscaler.json', 'utf8')));
    const ClusterAutoscalerIAMPolicy = new iam.Policy(this,'ClusterAutoscalerIAMPolicy',{document:ClusterAutoscalerPolicyDocument});
    
    //Attach policy to both spot and ondemand node groups
    ClusterAutoscalerIAMPolicy.attachToRole(asgSparkSpot.role);
    ClusterAutoscalerIAMPolicy.attachToRole(asgSparkOnDemand.role);
    
    const AutoscalerServiceAccount = eksCluster.addServiceAccount('Autoscaler',{name:'cluster-autoscaler',namespace:'kube-system'});
    ClusterAutoscalerIAMPolicy.attachToRole(AutoscalerServiceAccount.role);


    //install cluster autoscaler manifest
    const caYaml = fs.readFileSync('./k8s/auto-scaler/auto-scaler.yaml', 'utf8');
    //replace {{EKSCLUSTER}} placeholder in yaml file with the actual cluster name
    const manifest = yaml.safeLoadAll(caYaml.replace('{{EKSCLUSTER}}',eksCluster.clusterName));
    eksCluster.addManifest('ClusterAutoScaler',...manifest);
    
 

    //Create IAM policy, role and Service Account for ALB Ingress 
    const albPolicyDocument = iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync('./k8s/iam-policy.json', 'utf8')));
    const albIAMPolicy = new iam.Policy(this,'AWSLoadBalancerControllerIAMPolicy',{document:albPolicyDocument});
    const albServiceAccount = eksCluster.addServiceAccount('ALB',{name:'aws-load-balancer-controller',namespace:'kube-system'});
    albIAMPolicy.attachToRole(albServiceAccount.role);
  
     //Create serviceLinkedRole for EMR and add to kubernetes configmap
    new iam.CfnServiceLinkedRole(this, 'EmrServiceIAMRole', {awsServiceName:'emr-containers.amazonaws.com'});
    /*  
    * Bit of cheating here adding to masters group, we should be adding RBAC Role and RoleBinding for that user and also add Identity into configMap, but CDK doesn't give an easy option just yet. 
    * If you don't want to add it to masters, the easiest way would be to comment out two lines below and use eksctl command from this page: https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-cluster-access.html    
    */
    eksCluster.awsAuth.addMastersRole(iam.Role.fromRoleArn(this, 'ServiceRoleForAmazonEMRContainers', `arn:aws:iam::${cdk.Stack.of(this).account}:role/AWSServiceRoleForAmazonEMRContainers`),'emr-containers');
    // add Kubernetes Role and RoleBindings for the account
    readYamlFromDir('./k8s/rbac/', eksCluster);
  
     //Create EMR Worker IAM Role and trust policy
    const EmrWorkerPolicyDocument = iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync('./k8s/iam-policy-emr-job-role.json', 'utf8')));
    const EmrWorkerIAMPolicy = new iam.Policy(this,'EMRWorkerIAMPolicy',{document:EmrWorkerPolicyDocument});
    const EmrWorkerIAMRole = new iam.Role(this,'EMRWorkerIAMRole',{assumedBy: new iam.FederatedPrincipal(eksCluster.openIdConnectProvider.openIdConnectProviderArn,[],'sts:AssumeRoleWithWebIdentity')});
    EmrWorkerIAMPolicy.attachToRole(EmrWorkerIAMRole);
  
      // Output the value for EMRJobRole to be used when submitting your jobs
    
    new cdk.CfnOutput(this, 'EMRJobRoleArn', {
      value: EmrWorkerIAMRole.roleArn,
      description: 'The role ARN to use when submitting jobs'
    });
    new cdk.CfnOutput(this, 'EKSClusterName', {
      value: eksCluster.clusterName,
      description: 'The cluster name for emrStack',
      exportName:"EKSClusterName"
    });
    new cdk.CfnOutput(this,'EKSClusterKubectlRole',{
      value: eksCluster.role.roleArn,
      description: 'The cluster name for emrStack'
    })
  
  

  }
}
