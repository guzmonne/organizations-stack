import { Construct, CustomResource } from "@aws-cdk/core"
import * as cr from "@aws-cdk/custom-resources"
import * as ssm from "@aws-cdk/aws-ssm"

import { AccountProvider } from "./account-provider"

/**
 * AccountProps is the interface to configure the properties of the Accounts Construct.
 */
export interface AccountProps {
  /**
   * name of the AWS Account.
   */
  name: string,
  /**
   * email associated with the account.
   */
  email?: string
  /**
   * type of the account.
   */
  type?: AccountType;
  /**
   * stageName is the (optional) Stage name to be used in CI/CD pipeline
   */
  stageName?: string;
  /**
   * stageOrder is the (optional) Stage deployment order
   */
  stageOrder?: number;
  /**
   * hostedServices is the list of your services that will be hosted in this account.
   * Set it to [ALL] if you don"t plan to have dedicated account for each service.
   */
  hostedServices?: string[];
  /**
   * parentOrganizationalUnitId is the potential Organizational Unit Id the account should be placed in
   */
  parentOrganizationalUnitId?: string;
  /**
   * parentOrganizationalUnitName is the potential Organizational Unit Name the account should be placed in
   */
  parentOrganizationalUnitName?: string;
  /**
   * The AWS account Id
   */
  id?: string;
}
/**
 * AccountType holds the valid types of accounts.
 */
export enum AccountType {
  CICD = "CICD",
  STAGE = "STAGE",
  PLAYGROUND = "PLAYGROUND"
}

/**
 * Account is a Custom Resource representation of an AWS Account.
 */
export class Account extends Construct {
  /**
   * accountName holds the name of the account
   */
  readonly accountName: string
  /**
   * accountId holds the id of the account
   */
  readonly accountId: string
  /**
   * accountStageName holds the stage name
   */
  readonly accountStageName?: string
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   * @param props - Account properties.
   */
  constructor(scope: Construct, id: string, props: AccountProps) {
    super(scope, id)
    /**
     * Account Provider
     */
    const accountProvider = AccountProvider.getOrCreate(this)
    /**
     * Account
     */
    let account = new CustomResource(this, `Account-${props.name}`, {
      serviceToken: accountProvider.provider.serviceToken,
      resourceType: "Custom::AccountCreation",
      properties: {
        Email: props.email,
        AccountName: props.name,
        AccountType: props.type,
        StageName: props.stageName,
        StageOrder: props.stageOrder,
        HostedServices: props.hostedServices ? props.hostedServices.join(":") : undefined
      }
    })
    let accountId = account.getAtt("AccountId").toString()
    props.id = accountId
    this.accountName = props.name
    this.accountId = accountId
    this.accountStageName = props.stageName
    /**
     * Services System Manager
     */
    new ssm.StringParameter(this, `${props.name}-AccountDetails`, {
      description: `Details of ${props.name}`,
      parameterName: `/accounts/${props.name}`,
      stringValue: JSON.stringify(props),
    })
    /**
     * Parent Organizational Unit Id
     */
    if (props.parentOrganizationalUnitId) {
      let parent = new cr.AwsCustomResource(this, "ListParentsCustomResource", {
        /**
         * Lists the root or organizational units (OUs) that serve as the immediate parent of
         * the specified child OU or account.
         *
         * @example
         * ```typescript
         * listParents(params = {}, callback) ⇒ AWS.Request
         * ```
         *
         * @returns
         * ```typescript
         * data = {
         *  Parents: [
         *    {
         *      Id: "ou-examplerootid111-exampleouid111",
         *      Type: "ORGANIZATIONAL_UNIT"
         *     }
         *   ]
         * }
         * ```
          */
        onCreate: {
          service: "Organizations",
          action: "listParents",
          physicalResourceId: cr.PhysicalResourceId.fromResponse("Parents.0.Id"),
          region: "us-east-1",
          parameters: { ChildId: accountId },
        },
        onUpdate: {
          service: "Organizations",
          action: "listParents",
          physicalResourceId: cr.PhysicalResourceId.fromResponse("Parents.0.Id"),
          region: "us-east-1",
          parameters: { ChildId: accountId },
        },
        onDelete: {
          service: "Organizations",
          action: "listParents",
          physicalResourceId: cr.PhysicalResourceId.fromResponse("Parents.0.Id"),
          region: "us-east-1",
          parameters: { ChildId: accountId },
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        })
      })
      /**
       * Move Account Custom Resource
       */
      new cr.AwsCustomResource(this, "MoveAccountCustomResource", {
        /**
         * Moves an account from its current source parent root or organizational unit (OU)
         * to the specified destination parent root or OU.
         *
         * @example
         * ```typescript
         * moveAccount(params = {}, callback) ⇒ AWS.Request
         * ```
         */
        onCreate: {
          service: "Organizations",
          action: "moveAccount",
          physicalResourceId: cr.PhysicalResourceId.of(accountId),
          region: "us-east-1",
          parameters: {
            /**
             * AccountId is the unique identifier (ID) of the account that you want to move.
             */
            AccountId: accountId,
            /**
             * DestinationParentId is the unique identifier (ID) of the root or organizational
             * unit that you want to move the account to.
             */
            DestinationParentId: props.parentOrganizationalUnitId,
            /**
             * SourceParentId is the unique identifier (ID) of the root or organizational unit
             * that you want to move the account from.
             */
            SourceParentId: parent.getResponseField("Parents.0.Id"),
          },
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        })
      })
      // Enabling Organizations listAccounts call for auto resolution of
      // stages and DNS accounts Ids and Names
      if (props.type === AccountType.CICD) {
        this.registerAsDelegatedAdministrator(accountId, "ssm.amazonaws.com");
      } else {
        // Switching to another principal to workaround the max number of delegated
        // administrators (which is set to 3 by default).
        this.registerAsDelegatedAdministrator(accountId, "config-multiaccountsetup.amazonaws.com")
      }
    }
  }
  /**
   * registerAsDelegatedAdministrator creates custom resource according to the `registerDelegatedAdministrator`
   * method of AWS Organization JavaScript SDK.
   *
   * From the [docs:](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Organizations.html#registerDelegatedAdministrator-property)
   *
   * > Enables the specified member account to administer the Organizations features of the specified AWS service.
   * > It grants read-only access to AWS Organizations service data. The account still requires IAM permissions to
   * > access and administer the AWS service.
   * >
   * > You can run this action only for AWS services that support this feature. For a current list of services that
   * > support it, see the column Supports Delegated Administrator in the table at AWS Services that you can use
   * > with AWS Organizations in the AWS Organizations User Guide.
   * >
   * > This operation can be called only from the organization's management account.
   */
  registerAsDelegatedAdministrator(accountId: string, servicePrincipal: string) {
    /**
     * Register Delegated Administrator Custom Resource
     */
    new cr.AwsCustomResource(this,
      "registerDelegatedAdministrator",
      {
        onCreate: {
          service: "Organizations",
          action: "registerDelegatedAdministrator", // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Organizations.html#registerDelegatedAdministrator-property
          physicalResourceId: cr.PhysicalResourceId.of("registerDelegatedAdministrator"),
          region: "us-east-1", //AWS Organizations API are only available in us-east-1 for root actions
          parameters: {
            AccountId: accountId,
            ServicePrincipal: servicePrincipal
          }
        },
        onDelete: {
          service: "Organizations",
          action: "deregisterDelegatedAdministrator", // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Organizations.html#deregisterDelegatedAdministrator-property
          physicalResourceId: cr.PhysicalResourceId.of("registerDelegatedAdministrator"),
          region: "us-east-1", //AWS Organizations API are only available in us-east-1 for root actions
          parameters: {
            AccountId: accountId,
            ServicePrincipal: servicePrincipal
          }
        },
        installLatestAwsSdk: false,
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
        })
      }
    )
  }
}