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
 
   `docker build -t <DOCKER_REPO>/spark-eks:v3.1.2 .`
   
   `docker push <DOCKER_REPO>/spark-eks:v3.1.2`
   
## Running the demo steps

 * Create the EKS cluster using eksctl
 
   `eksctl create cluster -f kubernetes/eksctl.yaml`
   
 * Deploy the Kubernetes autoscaler
 
   `kubectl create -f kubernetes/cluster_autoscaler.yaml`
 
 * Create an Amazon IAM Policy with the right permissions for the job
   
 * Create two IAM role for service accounts with the previous Policy ARN
```
eksctl create iamserviceaccount \
--name spark \
--namespace spark \
--cluster spark-eks-best-practices \
--attach-policy-arn <POLICY_ARN> \
--approve --override-existing-serviceaccounts
```
```
eksctl create iamserviceaccount \
--name spark-fargate \
--namespace spark-fargate \
--cluster spark-eks-best-practices \
--attach-policy-arn <POLICY_ARN> \
--approve --override-existing-serviceaccounts
```

 * Launch Spark jobs with self managed Amazon EKS Nodegroups or with AWS Fargate

`kubectl apply -f examples/spark-job-hostpath-volume.yaml`

`kubectl apply -f examples/spark-job-fargate.yaml`

 * Monitor Kubernetes Nodes and Pods via the Kubernetes Dashboard

 * Monitor the Spark job progress via the Spark UI. To do that I can forward the Spark UI port to localhost and access it via my browser
   * Get the Spark driver Pod name
   * Forward the 4040 port from the Spark driver Pod
   * Access the Spark UI via this URL https://localhost:4040

`kubectl get pod -n=spark`
   

`kubectl port-forward -n=spark <SPARK_DRIVER_NAME> 4040:4040`




   

