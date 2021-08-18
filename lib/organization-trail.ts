import * as core from "@aws-cdk/core"
import { AwsCustomResource, PhysicalResourceId, AwsCustomResourcePolicy } from "@aws-cdk/custom-resources"
import { Bucket, BlockPublicAccess } from "@aws-cdk/aws-s3"
import { Effect, PolicyStatement, ServicePrincipal } from "@aws-cdk/aws-iam"

/**
 * OrganizationTrailProps are the properties of an OrganizationTrail
 */
export interface OrganizationTrailProps {
  /**
   * OrganizationId is the Id of the organization which the trail works on
   */
  OrganizationId: string
}

/**
 * This represents an organization trail. An organization trail logs all events for all AWS accounts in that organization
 * and write them in a dedicated S3 bucket in the master account of the organization.
 *
 * You must be logged in with the management account for the organization to create an organization trail. You must also
 * have sufficient permissions for the IAM user or role in the management account to successfully create an organization
 * trail. If you do not have sufficient permissions, you cannot see the option to apply a trail to an organization.
 *
 * It deploys a S3 bucket, enables cloudtrail.amazonaws.com to access the organization API, creates an organization
 * trail and start logging. To learn about AWS Cloud Trail and organization trail, check:
 * https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-trail-organization.html
 */
export class OrganizationTrail extends core.Construct {
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   */
  constructor(scope: core.Construct, id: string, props: OrganizationTrailProps) {
    super(scope, id)
    /**
     * Organization Trail Bucket
     */
    const orgTrailBucket = new Bucket(this, "OrganizationTrailBucket", { blockPublicAccess: BlockPublicAccess.BLOCK_ALL })
    orgTrailBucket.addToResourcePolicy(new PolicyStatement({
      actions: ["s3:GetBucketAcl"],
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("cloudtrail.amazonaws.com")],
      resources: [orgTrailBucket.bucketArn]
    }))
    orgTrailBucket.addToResourcePolicy(new PolicyStatement({
      actions: ["s3:PutObject"],
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("cloudtrail.amazonaws.com")],
      resources: [orgTrailBucket.bucketArn + "/AWSLogs/" + props.OrganizationId + "/*"],
      conditions: {
        StringEquals: {
          "s3:x-amz-acl": "bucket-owner-full-control"
        }
      }
    }))
    orgTrailBucket.addToResourcePolicy(new PolicyStatement({
      actions: ["s3:PutObject"],
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("cloudtrail.amazonaws.com")],
      resources: [orgTrailBucket.bucketArn + "/AWSLogs/" + core.Stack.of(this).account + "/*"],
      conditions: {
        StringEquals:
        {
          "s3:x-amz-acl": "bucket-owner-full-control"
        }
      }
    }))

    const enableAWSServiceAccess = new AwsCustomResource(this, "EnableAWSServiceAccess", {
      /**
       * enableAWSServiceAccess enables the integration of an AWS service (the service that is specified by
       * ServicePrincipal) with AWS Organizations.
       */
      onCreate: {
        service: "Organizations",
        action: "enableAWSServiceAccess", //call enableAWSServiceAcces of the Javascript SDK https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Organizations.html#enableAWSServiceAccess-property
        physicalResourceId: PhysicalResourceId.of("EnableAWSServiceAccess"),
        region: "us-east-1", //AWS Organizations API are only available in us-east-1 for root actions
        parameters: {
          /**
           * The service principal name of the AWS service for which you want to enable integration with your organization.
           */
          ServicePrincipal: "cloudtrail.amazonaws.com",
        }
      },
      /**
        * disableAWSServiceAccess disables the integration of an AWS service (the service that is specified by
        * ServicePrincipal) with AWS Organizations.
        */
      onDelete: {
        service: "Organizations",
        action: "disableAWSServiceAccess", //call disableAWSServiceAcces of the Javascript SDK https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Organizations.html#disableAWSServiceAccess-property
        region: "us-east-1", //AWS Organizations API are only available in us-east-1 for root actions
        parameters: {
          /**
           * The service principal name of the AWS service for which you want to enable integration with your organization.
           */
          ServicePrincipal: "cloudtrail.amazonaws.com",
        }
      },
      installLatestAwsSdk: false,
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE
      })
    })

    const organizationTrailName = "OrganizationTrail"

    let organizationTrailCreate = new AwsCustomResource(this, "OrganizationTrailCreate", {
      /**
       * createTrail creates a trail that specifies the settings for delivery of log data to an Amazon S3 bucket.
       */
      onCreate: {
        service: "CloudTrail",
        action: "createTrail", //call createTrail of the Javascript SDK https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudTrail.html#createTrail-property
        physicalResourceId: PhysicalResourceId.of("OrganizationTrailCreate"),
        parameters: {
          /**
           * IsMultiRegionTrail specifies whether the trail is created in the current region or in all regions. The
           * default is false, which creates a trail only in the region where you are signed in. As a best practice,
           * consider creating trails that log events in all regions.
           */
          IsMultiRegionTrail: true,
          /**
           * IsOrganizationTrail specifies whether the trail is created for all accounts in an organization in AWS
           * Organizations, or only for the current AWS account. The default is false, and cannot be true unless the
           * call is made on behalf of an AWS account that is the master account for an organization in AWS Organizations.
           */
          IsOrganizationTrail: true,
          /**
           * Name specifies the name of the trail.
           */
          Name: organizationTrailName,
          /**
           * S3BucketName specifies the name of the Amazon S3 bucket designated for publishing log files.
           */
          S3BucketName: orgTrailBucket.bucketName
        }
      },
      /**
       * deleteTrail deletes a trail.
       */
      onDelete: {
        service: "CloudTrail",
        action: "deleteTrail", //call deleteTrail of the Javascript SDK https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudTrail.html#deleteTrail-property
        parameters: {
          /**
           * Name specifies the name or the CloudTrail ARN of the trail to be deleted. The format of a trail
           * ARN is: `arn:aws:cloudtrail:us-east-2:123456789012:trail/MyTrail`.
           */
          Name: organizationTrailName
        }
      },
      installLatestAwsSdk: false,
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE
      })
    })
    organizationTrailCreate.node.addDependency(enableAWSServiceAccess)
    // need to add an explicit dependency on the bucket policy to avoid the creation of the trail before the policy is set up
    if (orgTrailBucket.policy) {
      organizationTrailCreate.node.addDependency(orgTrailBucket.policy)
    }
    organizationTrailCreate.grantPrincipal.addToPrincipalPolicy(PolicyStatement.fromJson(
      {
        "Effect": "Allow",
        "Action": [
          "iam:GetRole",
          "organizations:EnableAWSServiceAccess",
          "organizations:ListAccounts",
          "iam:CreateServiceLinkedRole",
          "organizations:DisableAWSServiceAccess",
          "organizations:DescribeOrganization",
          "organizations:ListAWSServiceAccessForOrganization"
        ],
        "Resource": "*"
      }
    ))

    const startLogging = new AwsCustomResource(this, "OrganizationTrailStartLogging", {
      /**
       * startLoggin Starts the recording of AWS API calls and log file delivery for a trail. For a trail
       * that is enabled in all regions, this operation must be called from the region in which the trail
       * was created. This operation cannot be called on the shadow trails (replicated trails in other
       * regions) of a trail that is enabled in all regions.
       */
      onCreate: {
        service: "CloudTrail",
        action: "startLogging", //call startLogging of the Javascript SDK https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudTrail.html#startLogging-property
        physicalResourceId: PhysicalResourceId.of("OrganizationTrailStartLogging"),
        parameters: {
          /**
           * Name specifies the name or the CloudTrail ARN of the trail for which CloudTrail logs AWS API calls.
           */
          Name: organizationTrailName
        }
      },
      /**
       * stopLogging Suspends the recording of AWS API calls and log file delivery for the specified trail.
       * Under most circumstances, there is no need to use this action. You can update a trail without stopping
       * it first. This action is the only way to stop recording. For a trail enabled in all regions, this
       * operation must be called from the region in which the trail was created, or an
       * InvalidHomeRegionException will occur. This operation cannot be called on the shadow trails
       * (replicated trails in other regions) of a trail enabled in all regions.
       */
      onDelete: {
        service: "CloudTrail",
        action: "stopLogging", //call stopLogging of the Javascript SDK https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudTrail.html#stopLogging-property
        physicalResourceId: PhysicalResourceId.of("OrganizationTrailStartLogging"),
        parameters: {
          /**
           * Name specifies the name or the CloudTrail ARN of the trail for which CloudTrail will stop logging AWS API calls.
           */
          Name: organizationTrailName
        }
      },
      installLatestAwsSdk: false,
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE
      })
    })
    startLogging.node.addDependency(organizationTrailCreate)
  }
}