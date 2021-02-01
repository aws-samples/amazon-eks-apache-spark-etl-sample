import * as cdk from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as iam  from '@aws-cdk/aws-iam';
import {readYamlFromDir} from '../utils/read-file';

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
    readYamlFromDir('./k8s/alb/', eksCluster);
    
  }
}
  