import * as cdk from '@aws-cdk/core';
import * as iam  from '@aws-cdk/aws-iam';
import * as ec2  from '@aws-cdk/aws-ec2';
import * as eks from '@aws-cdk/aws-eks';
import * as emrcontainers from '@aws-cdk/aws-emrcontainers';

import * as fs from 'fs';

import {readYamlFromDir} from '../utils/read-file';

export class EmrStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    /*
    * CFN Config parameters: use cdk deploy --parameters <StackName>:<PARAMETER_NAME>=<PARAMETER_VALUE> to override default options
    */
    const eksClusterName = new cdk.CfnParameter(this, "eksClusterName", {
      type: "String",
      minLength:5, 
      description: "your EKS cluster name"});
      
  
    const eksCluster = eks.Cluster.fromClusterAttributes(this,'eksCluster',{clusterName:eksClusterName.valueAsString});
    

    
    //create virtual clusters
    
    new emrcontainers.CfnVirtualCluster(this, 'EMRClusterEc2', {name:'spark-ec2',containerProvider:{
      id:eksClusterName.valueAsString, type:'EKS', info:{eksInfo:{namespace:"default"}}
    }});
    
    new emrcontainers.CfnVirtualCluster(this, 'EMRClusterFargate', {name:'spark-fargate',containerProvider:{
      id:eksClusterName.valueAsString, type:'EKS', info:{eksInfo:{namespace:"spark-serverless"}}
    }});
    
  }
}