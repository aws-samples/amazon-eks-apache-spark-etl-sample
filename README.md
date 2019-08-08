
# Description

Spark job example on Amazon EKS processing NYC taxi events. The job takes 4 arguments:
* The yellow NYC taxi rides source (can be the official NYC taxi bucket)
* The green NYC taxi rides source (can be the official NYC taxi bucket)
* The taxi zone referential data that will be joined with taxi rides
* The target bucket that will contain geo-localized taxi rides and statistics for identifying the most profitable zones for drivers

## Data format

The job follows the data format provided by 2018 NYC taxi rides

## Pre-requisite

* Compatibility: Spark 2.4.4, Scala 2.11.12, Sbt 1.2.8
* Amazon S3 bucket for writing results
* AWS IAM policy with permissions on the previous Amazon S3 bucket
* eksctl for Amazon EKS cluster creation. Change the AWS IAM policy ARN in the file to match the previous one. This will attach the policy to the worker nodes instance role

`eksctl create cluster -f example/eksctl.yaml`


# Building

* Build the spark base image

`docker build --target=spark -t <YOUR_DOCKER_REPO>/spark:v2.4.4 .`
* Build the application image

`docker build -t <YOUR_DOCKER_REPO>/spark-on-eks:v1.0 .`


# Deployment

## Configure EKS

### RBAC

`kubectl apply -f example/kubernetes/spark-rbac.yaml`

## Run the application on Amazon EKS cluster

### Spark job

* Change the image name and the Amazon S3 bucket name in example/kubernetes/spark-job.yaml to match your environment
* Run the job

`kubectl apply -f spark-job.yaml`


# License

Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.

SPDX-License-Identifier: MIT-0
