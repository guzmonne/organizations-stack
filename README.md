# Organizations Stack

## See this doc for additions made by this fork

[New Read Me](docs/ReadMe.md)

## Original docs below

CDK doesn't currently support AWS Organizations. Not even CloudFormation fully supports it. Luckily for us, CDK offers a workaround using Custom Resources.

AWS has provided an open-source repository called [`aws-bootstrap-kit`](https://github.com/awslabs/aws-bootstrap-kit) that includes an opinionated way of how these custom resources could work. A companion repository called [`aws-bootstrap-kit-examples`](https://github.com/aws-samples/aws-bootstrap-kit-examples) shows how these constructs can be used.

## Why creating this repo then?

The `aws-bootstrap-kit` was created as part of a whole workflow to implement a set of best practices when using AWS inside an organization. It is not just focused on the configuration of AWS Organization. So, I decided to easily extract just those that correspond to that to include them in their projects.

I've also refactored the code to make it easier to read, and I added several comments for those wanting to understand what is going on.

## What's missing?

Everything not related to AWS Organizations and AWS Accounts hasn't been included. The constructs necessary to deploy a Root DNS and a hosted zone for each account are also missing. So, the construct properties have been simplified.

## Is there an NPM package?

Not at the moment. If more than one person asks, I'll port it. But I don't want to go to the trouble if it ends up being something that only I will use.

## Getting started

On the `bin/` directory, there is an example of how to configure the stack. You have to provide your email and the `OU` tree, and CDK will do the rest.

You should also follow the `bootstrap` process indicated by CDK's documentation and run them using the management used for the root account. The management user is the only one who has the necessary permissions to create most of the resources.

## Tests

Fortunately, the `aws-bootstrap-kit` repo was already configured with a whole set of tests for each Construct. Those have also been ported and refactored so that the modifications on the code don't break the test suite.