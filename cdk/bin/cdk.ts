#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as iam  from '@aws-cdk/aws-iam';
import * as ec2  from '@aws-cdk/aws-ec2';
import * as eks from '@aws-cdk/aws-eks';
import * as emrcontainers from '@aws-cdk/aws-emrcontainers';

import * as fs from 'fs';

import {readYamlFromDir} from '../utils/read-file';
import {EksStack} from '../lib/eks-stack';
import {EmrStack} from '../lib/emr-stack';
import {EmrStudioStack} from '../lib/emrstudio-stack';


/*
* Set CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION if you want to deploy to non-default region
*/
const appEnv = process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_REGION ? {account: process.env.CDK_DEFAULT_ACCOUNT,region:process.env.CDK_DEFAULT_REGION} : {} ;
const app = new cdk.App();


const eksStack = new EksStack(app, 'EksStack', {env : appEnv});
const emrStack = new EmrStack(app, 'EmrStack',{env: appEnv}); 
const emrStudioStack = new EmrStudioStack(app,'EmrStudioStack',{env:appEnv});
emrStudioStack.addDependency(emrStack);
emrStack.addDependency(eksStack);