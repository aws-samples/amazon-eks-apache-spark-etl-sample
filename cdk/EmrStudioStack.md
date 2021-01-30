### **EMR Studio Setup** 

**Prerequisites:** 

* EMR cluster setup on EKS - at least one working virtual cluster can be EC2-based and/or Fargate-based. [Use CDK templates provided]
* AWS SSO enabled (AWS SSO setup as identity source, you will have to enable AWS Organisations as well but there’s no need to add member accounts, or add external SSO providers) 

Official docs : [https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-studio-set-up.html]  

It’s better to start with creation of the managed endpoint **before** creating EMR studio.  


1. **Add AWS ALB Controller to your EKS cluster**  [Skip this point if you use CDK script provided]

    Use the guide below, choose “Via YAML manifests“ option to avoid installing Helm (which is default option) 
https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/

`Debug Tip:` in step 4 of the guide if you already have existing service accounts in your kubernetes cluster (e.g. autoscaler) then make sure you’re using --override-existing-serviceaccounts  flag to keep the existing service accounts, so the command from the guide will look like this 
```
eksctl create iamserviceaccount \ 
--cluster=<cluster-name> \ 
--namespace=kube-system \ 
--name=aws-load-balancer-controller \ 
--attach-policy-arn=arn:aws:iam::<AWS_ACCOUNT_ID>:policy/AWSLoadBalancerControllerIAMPolicy \ 
--approve \
--override-existing-serviceaccounts
```


2. **Create ACM Certificate** 

    If you have any existing public certificates you can use in your ACM (no matter what domains they are issued for) feel free to use them, if not then i suggest you create a private ACM cert (specify whatever domain you want - it doesn’t matter). 
    
    Adding a private ACM cert requires you to create Root Certificate Authority first but this is a simple console experience [https://console.aws.amazon.com/acm/home?region=us-east-1#/] 
    
    Once Root CA is created, you can request a private certificate for any domain you like, there will be no validation required and make sure that certificate has “Issued” state so it can be used. You will need certificate ARN for the step below. 

3. **Create managed endpoint for your EKS EMR cluster**

    Run the command below,  specify your EMR job execution IAM role  as —execution-role-arn  you should the role created when setting up your EMR cluster [https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/creating-job-execution-role.html]. 
    If you have used CDK - then you can find the roleArn in **EksStack** Cloudformation stack outputs under the name **EMRJobRoleArn** 

```bash 
aws emr-containers create-managed-endpoint \
--type JUPYTER_ENTERPRISE_GATEWAY \
--virtual-cluster-id <VIRTUAL_CLUSTER_ID> \
--name jupyter-fargate-endpoint \
--execution-role-arn <EMRJobRoleArn> \
--release-label emr-6.2.0-latest \ 
--certificate-arn <CERT_ARN>
```

It takes a few minutes to create a managed endpoint (the state should be ACTIVE) - you can check the status by running the command below and make sure you capture the list of subnets from the output as you will need them later. 

```bash
aws emr-containers describe-managed-endpoint --endpoint-id <endpoint-id> --virtual-cluster-id <virtual-cluster-id> 
```

`Debug Tip:` If you see the status of your managed endpoint as TERMINATED_WITH_ERRORS use the following command to see the logs: 

```
kubectl logs -n kube-system deployment.apps/aws-load-balancer-controller
```

4. **Log in to AWS SSO and create a user (or group) you will be using with EMR studio** [https://console.aws.amazon.com/singlesignon/home?region=us-east-1#/users]
5. **Create EMR service role (emr-studio-service-role) and trust policy** [https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-studio-service-role.html]
6. **Create EMR Studio user role (emr-studio-user-session-role) and trust policy** 

    Use BasicSessionPolicy example 
[https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-studio-user-role.html]

7. **Create 2 EMR Studio security groups**

    Please create them exactly as they are shown [https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-studio-security-groups.html] (e.g. no inbound rules for workgroup security group) otherwise EMR Studio will throw the error.

8. **Create emr-studio instance**

    Run the command below, use vpc-id of your EKS cluster and same subnets (space separated) that managed endpoint has been created in (step #3). Write down the access url of EMR studio.

```
aws emr create-studio \ 
--name emrstudio-test-private \
--auth-mode SSO --vpc-id <vpc-id> \
--subnet-ids <subnet-id-1> <subnet-id-2> <subnet-id-3> \ 
--service-role emr-studio-service-role \ 
--user-role emr-studio-user-session-role \ 
--workspace-security-group-id <sg-1> \
--engine-security-group-id <sg-2> \ 
--default-s3-location s3://<DEFAULT_S3_BUCKET>
```


Create EMR studio mapping, use identity name for the user (or group) you have created in SSO (step #4), and for session policy ran use the session policy you have attached to EMR Studio user role (step #6) 

```
aws emr create-studio-session-mapping \
--studio-id <es-studio-id> 
--identity-name emrstudio --identity-type USER \ 
--session-policy-arn <session-policy-arn>
```

9. **Copy the url from step #8 and paste it into the browser to access EMR studio**

    `Debug Tip:` If you are getting the authentication errors with 400 code, open the developer tools and check what response you are getting from the request that returns 400 HTTP error code - it may give a clue what went wrong, e.g. i had the error because i used IAM Role ARN instead of IAM Policy ARN by mistake and i was able to debug it this way

10. **Create Workspace (click Workspace Link on the left menu)  in EMR studio and attach it to you EMR on EKS cluster.** 

    After Workspace is created you can click on the created workspace to launch the notebook. 