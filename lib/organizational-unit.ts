import * as core from "@aws-cdk/core"
import * as cr from "@aws-cdk/custom-resources"

/**
 * OrganizationalUnitProps are the properties for OrganizationalUnit
 */
export interface OrganizationalUnitProps {
  Name: string,
  ParentId: string
}
/**
 * Organizational Unit is a Custom Resource Construct that represents an OU on AWS Organizations.
 */
export class OrganizationalUnit extends core.Construct {
  /**
   * id is the unique identifier of the OrganizationalUnit.
   */
  readonly id: string
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   * @param props - Organizational Unit properties.
   */
  constructor(scope: core.Construct, id: string, props: OrganizationalUnitProps) {
    super(scope, id)
    /**
     * Organizational Unit Custom Resource
     */
    let ou = new cr.AwsCustomResource(this, "OUCustomResource", {
      /**
       * createOrganizationalUnit creates an organizational unit (OU) within a root or parent OU.
       * An OU is a container for accounts that enables you to organize your accounts to apply policies
       * according to your business requirements. The number of levels deep that you can nest OUs is
       * dependent upon the policy types enabled for that root. For service control policies, the limit is five.
       *
       * @return
       * ```typescript
       * {
       *   OrganizationalUnit: {
       *     Arn: "arn:aws:organizations::111111111111:ou/o-exampleorgid/ou-examplerootid111-exampleouid111",
       *     Id: "ou-examplerootid111-exampleouid111",
       *     Name: "AccountingOU"
       *   }
       * }
       * ```
       */
      onCreate: {
        service: "Organizations",
        action: "createOrganizationalUnit", //@see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Organizations.html#createOrganizationalUnit-property
        physicalResourceId: cr.PhysicalResourceId.fromResponse("OrganizationalUnit.Id"),
        region: "us-east-1", //AWS Organizations API are only available in us-east-1 for root actions
        parameters: {
          /**
           * Name to assign to the new OU.
           */
          Name: props.Name,
          /**
           * The unique identifier (ID) of the parent root or OU that you want to create the new OU in.
           */
          ParentId: props.ParentId
        }
      },
      /**
       * updateOrganizationalUnit renames the specified organizational unit (OU). The ID and ARN don't change.
       * The child OUs and accounts remain in place, and any attached policies of the OU remain attached.
       *
       * This operation can be called only from the organization's management account.
       *
       * @returns
       * ```typescript
       * {
       *   OrganizationalUnit: {
       *     Arn: "arn:aws:organizations::111111111111:ou/o-exampleorgid/ou-examplerootid111-exampleouid111",
       *     Id: "ou-examplerootid111-exampleouid111",
       *     Name: "AccountingOU"
       *   }
       * }
       * ```
       */
      onUpdate: {
        service: "Organizations",
        action: "updateOrganizationalUnit", //@see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Organizations.html#updateOrganizationalUnit-property
        physicalResourceId: cr.PhysicalResourceId.fromResponse("OrganizationalUnit.Id"),
        region: "us-east-1", //AWS Organizations API are only available in us-east-1 for root actions
        parameters: {
          /**
           * Name is the new name that you want to assign to the OU.
           */
          Name: props.Name,
          /**
           * OrganizationalUnitId is the unique identifier (ID) of the OU that you want to rename
           */
          OrganizationalUnitId: new cr.PhysicalResourceIdReference()
        }
      },
      /**
       * deleteOrganizationalUnit deletes an organizational unit (OU) from a root or another OU.
       * You must first remove all accounts and child OUs from the OU that you want to delete.
       *
       * This operation can be called only from the organization's management account.
       */
      onDelete: {
        service: "Organizations",
        action: "deleteOrganizationalUnit", //@see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Organizations.html#deleteOrganizationalUnit-property
        region: "us-east-1", //AWS Organizations API are only available in us-east-1 for root actions
        parameters: {
          /**
           * The unique identifier (ID) of the organizational unit that you want to delete.
           */
          OrganizationalUnitId: new cr.PhysicalResourceIdReference()
        }
      },
      installLatestAwsSdk: false,
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
      })
    })
    // Store the OrganizationalUnit Id on the construct.
    this.id = ou.getResponseField("OrganizationalUnit.Id")
  }
}