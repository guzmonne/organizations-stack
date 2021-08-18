import * as core from "@aws-cdk/core"
import * as cr from "@aws-cdk/custom-resources"
import { PolicyStatement } from "@aws-cdk/aws-iam"

/**
 * Organization is a Construct that represent an AWS Organization
 */
export class Organization extends core.Construct {
  /**
   * id of the Organization
   */
  readonly id: string;
  /**
   * rootId is the id of the root Organizational Unit of the Organization
   */
  readonly rootId: string;
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   */
  constructor(scope: core.Construct, id: string) {
    super(scope, id)
    /**
     * Organization Custom Resource
     */
    let org = new cr.AwsCustomResource(this, "orgCustomResource", {
      /**
       * Creates an AWS Organization
       *
       * @example
       * ```typescript
       * createOrganization(params = {}, callback) ⇒ AWS.Request
       * ```
       *
       * @returns
       * ```typescript
       * data = {
       *   Organization: {
       *     Arn: "arn:aws:organizations::111111111111:organization/o-exampleorgid",
       *     AvailablePolicyTypes: [
       *       {
       *         Status: "ENABLED",
       *         Type: "SERVICE_CONTROL_POLICY"
       *       }
       *     ],
       *     FeatureSet: "ALL",
       *     Id: "o-exampleorgid",
       *     MasterAccountArn: "arn:aws:organizations::111111111111:account/o-exampleorgid/111111111111",
       *     MasterAccountEmail: "bill@example.com",
       *     MasterAccountId: "111111111111"
       *   }
       * }
       * ```
       */
      onCreate: {
        service: "Organizations",
        action: "createOrganization",
        physicalResourceId: cr.PhysicalResourceId.fromResponse("Organization.Id"),
        region: "us-east-1" //AWS Organizations API are only available in us-east-1 for root actions
      },
      /**
       * Retrieves information about the organization that the user's account belongs to.
       *
       * @example
       * ```typescript
       * describeOrganization(params = {}, callback) ⇒ AWS.Request
       * ```
       *
       * @returns
       * ```typescript
       * data = {
       *   Organization: {
       *     Arn: "arn:aws:organizations::111111111111:organization/o-exampleorgid",
       *     AvailablePolicyTypes: [
       *       {
       *         Status: "ENABLED",
       *         Type: "SERVICE_CONTROL_POLICY"
       *       }
       *     ],
       *     FeatureSet: "ALL",
       *     Id: "o-exampleorgid",
       *     MasterAccountArn: "arn:aws:organizations::111111111111:account/o-exampleorgid/111111111111",
       *     MasterAccountEmail: "bill@example.com",
       *     MasterAccountId: "111111111111"
       *   }
       * }
       * ```
       */
      onUpdate: {
        service: "Organizations",
        action: "describeOrganization",
        physicalResourceId: cr.PhysicalResourceId.fromResponse("Organization.Id"),
        region: "us-east-1" //AWS Organizations API are only available in us-east-1 for root actions
      },
      /**
       * Deletes the organization.
       *
       * @example
       * ```typescript
       * deleteOrganization(params = {}, callback) ⇒ AWS.Request
       * ```
       */
      onDelete: {
        service: "Organizations",
        action: "deleteOrganization",
        region: "us-east-1" //AWS Organizations API are only available in us-east-1 for root actions
      },
      installLatestAwsSdk: false,
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
      })
    })
    // The lambda needs to have the iam:CreateServiceLinkedRole permission so that the AWS Organizations
    // service can create Service Linked Role on its behalf.
    org.grantPrincipal.addToPrincipalPolicy(PolicyStatement.fromJson({
      "Sid": "CreateServiceLinkedRoleStatement",
      "Effect": "Allow",
      "Action": "iam:CreateServiceLinkedRole",
      "Resource": "arn:aws:iam::*:role/*",
    }))

    // Set the organization ID
    this.id = org.getResponseField("Organization.Id")

    /**
     * Root Custom Resource
     */
    let root = new cr.AwsCustomResource(this, "RootCustomResource", {
      /**
       * Lists the roots that are defined in the current organization.
       *
       * @example
       * ```typescript
       * listRoots(params = {}, callback) ⇒ AWS.Request
       * ```
       *
       * @returns
       * ```typescript
       * data = {
       *  Roots: [
       *    {
       *      Arn: "arn:aws:organizations::111111111111:root/o-exampleorgid/r-examplerootid111",
       *      Id: "r-examplerootid111",
       *      Name: "Root",
       *      PolicyTypes: [
       *       {
       *         Status: "ENABLED",
       *         Type: "SERVICE_CONTROL_POLICY"
       *       }
       *      ]
       *    }
       *   ]
       * }
       * ```
       */
      onCreate: {
        service: "Organizations",
        action: "listRoots",
        physicalResourceId: cr.PhysicalResourceId.fromResponse("Roots.0.Id"),
        region: "us-east-1", //AWS Organizations API are only available in us-east-1 for root actions
      },
      onUpdate: {
        service: "Organizations",
        action: "listRoots",
        physicalResourceId: cr.PhysicalResourceId.fromResponse("Roots.0.Id"),
        region: "us-east-1", //AWS Organizations API are only available in us-east-1 for root actions
      },
      onDelete: {
        service: "Organizations",
        action: "listRoots",
        physicalResourceId: cr.PhysicalResourceId.fromResponse("Roots.0.Id"),
        region: "us-east-1", //AWS Organizations API are only available in us-east-1 for root actions
      },
      installLatestAwsSdk: false,
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
      })
    })

    // Enabling SSM AWS Service access to be able to register delegated adminstrator
    const enableSSMAWSServiceAccess = this.enableAWSServiceAccess("ssm.amazonaws.com")
    const enableMultiAccountsSetupAWSServiceAccess = this.enableAWSServiceAccess("config-multiaccountsetup.amazonaws.com")

    enableMultiAccountsSetupAWSServiceAccess.node.addDependency(org)
    enableSSMAWSServiceAccess.node.addDependency(enableMultiAccountsSetupAWSServiceAccess)

    // Adding an explicit dependency as CloudFormation won"t infer that calling listRoots
    // must be done only when Organization creation is finished as there is no implicit dependency
    // between the 2 custom resources
    root.node.addDependency(org)

    // Set the Root ID
    this.rootId = root.getResponseField("Roots.0.Id")
  }

  /**
   * enableAWSServiceAccess enables the registration of delegated administrators.
   * @param principal - Principal resource name.
   */
  private enableAWSServiceAccess(principal: string) {
    const resourceName = principal === "ssm.amazonaws.com" ? "EnableSSMAWSServiceAccess" : "EnableMultiAccountsSetup"
    return new cr.AwsCustomResource(this, resourceName, {
      /**
       * [Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Organizations.html)
       *
       * ```javascript
       * enableAWSServiceAccess(params = {}, callback) => AWS.Request
       * ```
       *
       * Enables the integration of an AWS service (the service that is specified by ServicePrincipal) with AWS Organizations.
       */
      onCreate: {
        service: "Organizations",
        action: "enableAWSServiceAccess",
        physicalResourceId: cr.PhysicalResourceId.of(resourceName),
        region: "us-east-1",
        parameters: {
          /**
           * The service principal name of the AWS service for which you want to disable integration with
           * your organization. This is typically in the form of a URL, such as `service-abbreviation.amazonaws.com`.
           */
          ServicePrincipal: principal,
        }
      },
      /**
       * ```typescript
       * disableAWSServiceAccess(params = {}, callback) => AWS.Request
       * ```
       *
       * Disables the integration of an AWS service (the service that is specified by ServicePrincipal) with AWS Organizations.
       */
      onDelete: {
        service: "Organizations",
        action: "disableAWSServiceAccess",
        region: "us-east-1",
        parameters: {
          /**
           * The service principal name of the AWS service for which you want to disable integration with
           * your organization. This is typically in the form of a URL, such as `service-abbreviation.amazonaws.com`.
           */
          ServicePrincipal: principal,
        }
      },
      installLatestAwsSdk: false,
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
      })
    })
  }
}