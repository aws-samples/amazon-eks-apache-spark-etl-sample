import * as cdk from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as iam  from '@aws-cdk/aws-iam';
import * as ec2  from '@aws-cdk/aws-ec2';
import * as eksStack from './eks-stack';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export class EmrStudioStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
     /*
    * CFN Config parameters: use cdk deploy --parameters <StackName>:<PARAMETER_NAME>=<PARAMETER_VALUE> to override default options
    */


    const eksClusterName = cdk.Fn.importValue('EKSClusterName');
    if (!eksClusterName){
      throw "EKSClusterName is not defined, make sure you have EksStack correctly deployed"
    }
    
    const eksClusterMasterRoleArn = cdk.Fn.importValue('EKSClusterKubectlRole');
    if (!eksClusterMasterRoleArn){
      throw "EKSClusterKubectlRole is not defined, make sure you have EksStack correctly deployed"
    }
    
    const eksCluster = eks.Cluster.fromClusterAttributes(this,'eksCluster',{clusterName:eksClusterName, kubectlRoleArn:eksClusterMasterRoleArn});
  
  
  
    /* install ALB Ingress Controller by importing and running Kubernetes manifest file 
    *  cert-manager has to be installed prior to installing ALB and this is handled in EksStack
    */
    
        //install cluster autoscaler manifest
    const caYaml = fs.readFileSync('./k8s/alb/alb.yaml', 'utf8');
    //replace {{EKSCLUSTER}} placeholder in yaml file with the actual cluster name
    const manifest = yaml.safeLoadAll(caYaml.replace('{{EKSCLUSTER}}',eksCluster.clusterName));
    const kManifest = new eks.KubernetesManifest(this,'ClusterAlb',{cluster:eksCluster,manifest:manifest,overwrite:true}) 
    //eksCluster.addManifest('ClusterALB',...manifest);xs
    
    
    /*
    * Setup EMRStudio Service Role 
    */
    const EmrStudioServiceRole = new iam.Role(this, 'EMRStudioServiceRole', {
      assumedBy: new iam.ServicePrincipal('elasticmapreduce.amazonaws.com')
    });
    const EmrStudioPolicyDocument = iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync('./k8s/iam-policy-emr-studio-service-role.json', 'utf8')));
    const EmrStudioIAMPolicy = new iam.Policy(this,'EMRStudioServiceIAMPolicy',{document:EmrStudioPolicyDocument});
    EmrStudioIAMPolicy.attachToRole(EmrStudioServiceRole)
    
    /*
    * Setup EMRStudio User Role
    */
    const defaultS3BucketName = this.node.tryGetContext('defaultS3BucketName'); 
    if (!defaultS3BucketName) throw 'Please specify default bucket name in cdk.json';
    const EmrStudioUserRole = new iam.Role(this,'EMRStudioUserRole',{assumedBy: new iam.ServicePrincipal('elasticmapreduce.amazonaws.com')});
    const EmrStudioUserPolicyJson = fs.readFileSync('./k8s/iam-policy-emr-studio-user-role.json', 'utf8');
    const EmrStudioUserPolicyDocument = iam.PolicyDocument.fromJson(JSON.parse(EmrStudioUserPolicyJson.replace('{{EMRSTUDIO_SERVICE_ROLE}}',EmrStudioServiceRole.roleArn).replace('{{DEFAULT_S3_BUCKET_NAME}}',defaultS3BucketName).replace('{{ACCOUNT_ID}}',cdk.Stack.of(this).account).replace('{{REGION}}',cdk.Stack.of(this).region)));
    const EmrStudioUserIAMPolicy = new iam.ManagedPolicy(this,'EMRStudioUserIAMPolicy1',{document:EmrStudioUserPolicyDocument});
    //EmrStudioUserIAMPolicy.attachToRole(EmrStudioUserRole);
    EmrStudioUserRole.addManagedPolicy(EmrStudioUserIAMPolicy);
    
    
    new cdk.CfnOutput(this,'EmrStudioUserSessionPolicyArn',{
      //value: "arn:aws:iam::"+cdk.Stack.of(this).account+":policy/"+EmrStudioUserIAMPolicy.managedPolicyArn,
      value: EmrStudioUserIAMPolicy.managedPolicyArn,
      description: 'EmrStudio user session policy Arn'
    });
    
    new cdk.CfnOutput(this,'EmrStudioServiceRoleName',{
      value: EmrStudioServiceRole.roleName,
      description: 'EmrStudio Service Role Name'
    });
    
    new cdk.CfnOutput(this,'EmrStudioUserRoleName',{
      value: EmrStudioUserRole.roleName,
      description: 'EmrStudio User Role Name'
    });

    
    
    
  }
}
  