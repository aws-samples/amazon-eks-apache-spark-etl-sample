## CDK Templates for deploying the stacks

We provide 3 templates to get started quickly

- **EksStack** which has the following
  1. EKS cluster in separate VPC
  2. 1 Managed OnDemand NodeGroup for running kubernetes tooling services 
  3. 1 self-managed onDemand Group for running Spark jobs
  4. 1 self-managed Spot Group for running Spark jobs
  5. Fargate profile for Running Spark Jobs on Fargate
  6. Cluster Autoscaler configured to manage Spark groups
  7. All necessary IAM Roles, IAM Service roles, Kubernetes RBAC policies
- **EmrStack** which has the following
  1. Creates 2 virtual clusters for Spark NodeGroups and Spark Fargate  
- **EmrStudioStack** which has the following
  1. Kubernetes ALB Ingress controller as a prerequisite

EmrStudioStack is not fully automated as there's no CDK/CFN constructs support yet, but its is expected when service becomes GA.
We still recommend deploying EmrStudioStack before going through the rest of the step manually.
Please see EmrStudioStack.md for details.

### Deployment

We recommend using Cloud9 instance as it contains CDK installed already. Please make sure that your 
Cloud9 instance has at least 15GB EBS volume attach to it to avoid *"out of space"* errors 
when deploying templates.

Open Cloud9 terminal window and clone the repository

```
git clone https://github.com/spark-eks/amazon-eks-spark-best-practices
```

Edit the cdk.json file to change the adminRoleArn to be used to manage EKS Cluster, usually it is expected to be the RoleArn you use to login to AWS Console  
 
Install the necessary modules and bootstrap your cdk installation

```
cd cdk/ 

npm install

cdk bootstrap aws://<ACCOUNT_ID>/<REGION_NAME> 
```

Deploy. 
The command below will install EksStack and EmrStack because EmrStack has a dependancy on EksStack

```
export CDK_DEFAULT_ACCOUNT = <ACCOUNT_ID>
export CDK_DEFAULT_REGION  = <REGION_NAME>
cdk deploy EmrStack

```

