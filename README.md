# amazon-eks-spark-best-practices
Examples providing best practices for Apache Spark on Amazon EKS

## Pre-requisite

 * Docker
 * Eksctl [https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html](https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html)
 * One of those:
    * An ECR repository accessible from the EKS cluster you will deploy
     * A Dockerhub account and public access for the EKS cluster you will deploy 
     
## Preparing the required Docker images

Run the folowwing command to build respectively a spark base image and the application image
   
   `cd spark-application`
   
   `docker build --target=spark -t <DOCKER_REPO>/spark:v3.0.1 .`
   
   `docker push <DOCKER_REPO>/spark:v3.0.1`
   
   `docker build -t <DOCKER_REPO>/spark-eks:v2 .`
   
   `docker push <DOCKER_REPO>/spark-eks:v2`
   
## Running the demo steps

 * Create the EKS cluster using eksctl
 
   eksctl create cluster -f kubernetes/eksctl.yaml
   
 * deploy the Kubernetes autoscaler
 
   kubectl create -f kubernetes/cluster_autoscaler.yaml
 * 

