# Empatho Infrastructure

This repository holds all the configurations regarding Empatho's infrastructure on AWS. It's built around AWS Cloud Developer Kit or CDK.

## Actors

All the code written in this repository is made to help the following actors:

### Operators

Operators administrate the organization's IT environments.

They require:
An isolated set of secured environments.
- A web portal that allows them to access each domain.
- A central billing system that controls the spending among environments.
- A central activity view that provides visibility across environments.
- A central users and permissions management service.
An isolated DNS management zone to securely control your main DNS domains.
### Developers

Developers are members of an Organization that develop software.

They require:
- An environment with broad permissions to experiment, test, and develop.
- A web portal that allows them to log in to all their environments.
- A simple way to create multi-stage CI/CD pipelines to deploy code to production securely.
- A simple way to add public DNS records to expose their services.

## Stages

There are many ways to structure an organization. The proposed structure for this project has the following stages:
- **Dev**: Development environment playground.
- **Staging**: First stage of the CI/CD pipeline.
- **Prod**: Second (and last) stage of the CI/CD pipeline.
- **CI/CD**: Isolated environment to administer CI/CD pipelines.

### AWS Accounts

Following AWS best practices, a multi-account strategy is used to handle the different environments of the app. These environments stem from a central root account that holds the billing details but runs no AWS services. From it, multiple accounts are created underneath that run each environment.

The result should look similar to this:

![AWS Organizations with multiple accounts](https://activate.workshop.aws/images/020_landingzone/deploy/AWSOrganizationsConsoleAccountIdHighlight.png)

## Services

The developed stacks configure the following AWS Services:

- **AWS Organizations**: Handle multiple AWS Accounts for environment isolation.
- **AWS SSO**: Handles users and permissions.
- **AWS Cloudtrail**: Centralizes account activity logging.
- **AWS Consolidated Billing**: Centralized billing activities for all accounts.
- **AWS Config**: Setup security monitoring.
- **Route 53**: Handle DNS.

## DNS

The project requires ownership of a DNS domain. Each environment will then have a hosted DNS zone that stems from this domain. For example, if the domain were `empatho.io`, the following registries would be created:

- `dev.empatho.io`
- `staging.empatho.io`
- `cicd.empatho.io`
- `prod.empatho.io`

## AWS SSO

By configuring AWS SSO, all the actors will access any of the environments with the same set of credentials. It also simplifies the onboarding of new members and assignments of roles and permissions.

The following roles will be created:

**AdministratorAccess**: Grants admin access to an AWS Account.
**DeveloperAccess**: Allows developers to create, update, or delete AWS resources from an account, but prevents them from creating, updating, and deleting IAM users and groups.
**DevOpsAccess**: Allows DevOps engineers to deploy and manage CI/CD pipelines.
**ApproverAccess**: Allows users to view and approve manual changes for all pipelines.
**ViewOnlyAccess**: Allows users to view resources and basic metadata across all AWS services.
**BillingAccess**: Allows users to see the Billing details of an AWS Account.

## Billing

To enable consolidated billing is necessary to do the following manual steps on the **root** account by the **root** user:
In the AWS Management Console's navigation bar, choose your account name and choose "My Account."
Next to "IAM User and Role Billing Information," choose "Edit."
Select the "Activate IAM Access" check box.
Choose "Update."
![IAM User and Role Access to Billing Information](https://activate.workshop.aws/images/020_landingzone/prepare/enableIamUserBilling.png?width=100pc)

## Pipelines

Several CI/CD pipelines will be configured to handle the entire project:
**Organizations CI/CD**: This pipeline encompasses the necessary components to deploy AWS Organizations with multiple sub-accounts according to the detailed stages.
TBD

## CDK Resources

CDK needs specific resource files to deploy some of its constructs. These files are stored on an S3 Bucket that is created before any stack is deployed. The CDK tool can automatically bootstrap the project:

```
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

To access the `ACCOUNT-NUMBER` you can use the AWS `cli`:

```
aws sts get-caller-identity --profile PROFILE_NAME
```

The value of `PROFILE_NAME` should correspond to the profile's name used to access the appropiate account. Profiles can be configured on the `~/.aws/credentials` file.

If you plan to deploy a "Continuous Deployment Pipeline" from this project, you must run the `cdk bootstrap` command a second time with the following options:

```
cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

This will give CDK complete access to the account.

## AWS Toolkit for Visual Studio Code

If you use "Visual Studio Code" as your IDE, it is recommended to install this toolkit. It improves the experience of working with CDK. You can install it from the "Marketplace" tab in the editor by searching for "AWS Toolkit" on the search bar. Then follow the instructions to configure the extension.

## How does CDK work?

AWS CDK works similarly to other automation tools. You define your infrastructure using code, then deploy the updates to production. Under the hood, CDK creates CloudFormation templates to apply your configuration.

### Language

This project has decided to use Typescript as the only language to write CDK since other app services are also written in this language. CDK also supports Python, Java, JavaScript, C#, and Go.

### Credentials

To use CDK, you need to set up your profile credentials. By default, the project will use the `empatho` profile to run. Create inside the `~/.aws/credentials` the appropiate profile before running CDK.

### Testing

One of the main benefits of CDK is that we can include unit and integration tests to make sure our code works as intended. We'll use the `@aws-cdk/assert` library to write the specs. It includes several helper functions like `haveResource`, which checks if a stack has a specific resource configured.

```typescript
expect(stack).to(haveResource("AWS::CertificateManager::Certificate", {
	DomainName: "test.example.com",
	// ...
	ShouldNotExist: ABSENT,
}))
```

> `ABSENT` is a magic variable used to assert that a particular key in an object is _not_ set, or set to `undefined`.

All tests will be written on the `./test` directory.

Units tests should follow this template:

```typescript
const stack = new Stack()

new MyConstruct(stack, "MyConstruct", { /** ... **/ })

expect(stack).to(someExpectation(/** ... **/))
```

### Sample project

Create a new project by running:

```
cdk init app --language typescript
```

> `app` is the default template CDK uses to bootstrap a new project.

A Stack is an abstraction level used to hold the configuration of different AWS services. Each CDK project is composed of multiple stacks. You can create as many stacks as your project needs. A good rule of thumb is to separate stateful services from stateless services. Since updating a stateful stack may be destructive. You can list your current stacks by running `cdk ls`.

AWS Services are configured using "Constructs," which can be combined to create more complex entities. AWS provides low-level constructs for all their services and some high-level ones. The CDK community has also offered several CDK Constructs that can be included in your project.

The Amazon S3 construct can be included in your project by running:

```
npm install @aws-cdk/aws-s3
```

We can now import this construct and use it in our code.

```typescript
import * as cdk from "@aws-cdk/core"
import * as s3 from "@aws-cdk/aws-s3"

export class S3CdkStack extends cdk.Stack {
	constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
		super(scope, id, props)

		new s3.Bucket(this, "CDKBucket", { versioned: true })
	}
}
```
All constructs receive three parameters:

- `scope`: Defines the parent of the construct. This is how you couple constructs with one another.
- `id`: The logical id of the construct. CDK can generate ID automatically, which is usually recommended. It is preferable to use tags to identify the resources and leave CDK to auto-create their IDs.
- `props`: Properties of the construct. In the example, we configured the `versioned` property, but each service will have its own set of props. Your custom constructs can also consume custom properties.

After defining the stack with all its constructs, we need to synthesize it to create the CloudFormation stack to deploy our services. It is recommended to version the CloudFormation files to keep track of the modification being done to the infrastructure.

To synthesize the stack, run `cdk synth STACK_NAME`.

We can now deploy through CloudFormation, or by using the command `cdk deploy`. It's essential to remember that running the command `cdk deploy` will automatically synthesize the app. Nonetheless, it's considered a best practice always manually to synthesize the app before deployment.

The good thing about CDK is that it simplifies managing the whole lifecycle of our services. For example, suppose we modify our S3 Bucket file with the following code and redeploy. In that case, we'll configure the Bucket for automatic deletion upon stack cancelation, removing every file contained inside it automatically.

```typescript
// ...
new s3.Bucket(this, "CDKBucket", {
	versioned: true,
	removalPolicy: cdk.RemovalPolicy.DESTROY,
	autoDeleteObjects: true,
})
// ...
```
As with most IaaC solutions, we only declare the state of our services, and the tool itself applies the modifications needed to match the "desired" state with the "current" state.

We can check what changes CDK would apply by running: `cdk diff`. And then `cdk synth` and `cdk deploy` to apply the changes.

Lastly, we can delete the whole stack by running `cdk destroy`.

> All the commands mentioned before are run, providing the name of the stack.

## Resources

- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
- [AWS CDK API Reference](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html)
- [AWS CDK Examples](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript)
- [Awesome CDK](https://github.com/kolomied/awesome-cdk)
- [AWS Bootstrap Kit](https://github.com/aws-samples/aws-bootstrap-kit-examples)
- [AWS Activate Workshop](https://activate.workshop.aws/)

## Interesting Projects

- [CDK Watchful](https://github.com/cdklabs/cdk-watchful)
  - Construct library that makes it easy to monitor CDK apps.
- [CDK Billing Alarm](https://github.com/alvyn279/aws-cdk-billing-alarm)
  - Construct to deploy a billing alarm.
- [@cloudcomponents/cdk-constructs](https://github.com/cloudcomponents/cdk-constructs)
  - Collection of higher-level reusable CDK constructs.


















