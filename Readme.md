
# Description

Spark job example on EKS processing NYC taxi events. The job takes 4 arguments:
* The yellow NYC taxi rides source (can be the official NYC taxi bucket)
* The green NYC taxi rides source (can be the official NYC taxi bucket)
* The taxi zone referential data that will be joined with taxi rides
* The target bucket that will contain geo-localized taxi rides and statistics for identifying the most profitable zones for drivers

## Data format

The job follows the data format provided by 2017 and 2018 NYC taxi rides

## Pre-requisite

* Compatibility: Spark 2.4.3, Scala 2.11.12, Sbt 1.2.8
* eksctl for EKS cluster creation

`eksctl create cluster -f example/eksctl.yaml`


# Building

`docker build -t <YOUR_DOCKER_REPO>/spark-on-eks:v1.0 .`


# Deployment

## Configure EKS

### RBAC

`kubectl apply -f example/kubernetes/spark-rbac.yaml`

### Secret

1. Create the Spark IAM user and get its access key ID and secret key ID
2. Create the Kubernetes Secret with AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

`kubectl create secret generic spark-on-EKS --from-literal=aws_access_key_id=' <YOUR_AWS_ACCESS_KEY_ID>' --from-literal=aws_secret_access_key='<YOUR_AWS_SECRET_ACCESS_KEY>'`

## Run the application on EKS cluster

### Spark job

* Change the image name and the S3 bucket name in example/kubernetes/spark-job.yaml to match your environment
* Run the job

`kubectl apply -f spark-job.yaml`
