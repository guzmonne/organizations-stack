import { Construct, Stack, StackProps } from "@aws-cdk/core"
import * as iam from "@aws-cdk/aws-iam"
import type { IDependable } from "@aws-cdk/core"

import { AccountType, Account } from "./account"
import { Organization } from "./organization"
import { OrganizationTrail } from "./organization-trail"
import { OrganizationalUnit } from "./organizational-unit"
import { ValidateEmail } from "./validate-email"

/**
 * AccountSpec is the interface for an AWS Account details.
 */
export interface AccountSpec {
  /**
   * name of the AWS Account.
   */
  readonly name: string,
  /**
   * email associated with the account.
   */
  readonly email?: string
  /**
   * type of the account.
   */
  readonly type?: AccountType;
  /**
   * stageName is the (optional) Stage name to be used in CI/CD pipeline
   */
  readonly stageName?: string;
  /**
   * stageOrder is the (optional) Stage deployment order
   */
  readonly stageOrder?: number;
  /**
   * hostedServices is the list of your services that will be hosted in this account.
   * Set it to [ALL] if you don't plan to have dedicated account for each service.
   */
  readonly hostedServices?: string[];
}
/**
 * OUSpec holds the details of an Organizational Unit
 */
export interface OUSpec {
  /**
   * name corresponds to the name of the OU.
   */
  readonly name: string;
  /**
   * accounts hold the information of the accounts created inside the OU.
   */
  readonly accounts: AccountSpec[];
  /**
   * nestedOU is the specification of the nested Organizational Unit.
   */
  readonly nestedOU?: OUSpec[];
}
/**
 * Properties for AWS SDLC Organizations Stack
 * @experimental
 */
export interface OrganizationsStackProps extends StackProps {
  /**
   * email is the email for the root account.
   */
  readonly email: string,
  /**
   * nestedOU is the specification of the root Organizational Unit
   */
  readonly nestedOU: OUSpec[],
  /**
  * forceEmailVerification enables the Email Verification Process
  */
  readonly forceEmailVerification?: boolean,
}

export class OrganizationsStack extends Stack {
  /**
   * emailPrefix corresponds to the section of an email before the `@`.
   */
  private readonly emailPrefix?: string;
  /**
   * domain corresponds to the section of an email after the `@`.
   */
  private readonly domain?: string;
  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this account.
   * @param id - The instance unique identifier.
   * @param props - AWS Organization Stack properties.
   */
  constructor(scope: Construct, id: string, props: OrganizationsStackProps) {
    super(scope, id, props)
    const { email, nestedOU, forceEmailVerification } = props

    if (nestedOU.length > 0) {
      const org = new Organization(this, "Organization")
      if (email) {
        this.emailPrefix = email.split("@", 2)[0]
        this.domain = email.split("@", 2)[1]
      }

      if (forceEmailVerification) {
        const validateEmail = new ValidateEmail(this, "EmailValidation", { email })
        org.node.addDependency(validateEmail)
      }

      const orgTrail = new OrganizationTrail(this, "OrganizationTrail", { OrganizationId: org.id })
      orgTrail.node.addDependency(org)

      let previousSequentialConstruct: IDependable = orgTrail

      nestedOU.forEach((nestedOU) => {
        previousSequentialConstruct = this.createOrganizationTree(nestedOU, org.rootId, previousSequentialConstruct)
      })
    }
  }

  createOrganizationTree(oUSpec: OUSpec, parentId: string, previousSequentialConstruct: IDependable): IDependable {
    const organizationalUnit = new OrganizationalUnit(this, `${oUSpec.name}-OU`, {
      Name: oUSpec.name,
      ParentId: parentId,
    })
    // Adding an explicit dependency as CloudFormation won't infer that Organization, Organizational Units and
    // Accounts must be created or modified sequentially
    organizationalUnit.node.addDependency(previousSequentialConstruct)

    previousSequentialConstruct = organizationalUnit

    oUSpec.accounts.forEach((accountSpec) => {
      let accountEmail: string;

      if (accountSpec.email) {
        accountEmail = accountSpec.email
      } else if (this.emailPrefix && this.domain) {
        accountEmail = `${this.emailPrefix}+${accountSpec.name}-${Stack.of(this).account}@${this.domain}`
      } else {
        throw new Error(`master account email must be provided or an account email for account ${accountSpec.name}`)
      }

      const account = new Account(this, accountSpec.name, {
        email: accountEmail,
        name: accountSpec.name,
        parentOrganizationalUnitId: organizationalUnit.id,
        type: accountSpec.type,
        stageName: accountSpec.stageName,
        stageOrder: accountSpec.stageOrder,
        hostedServices: accountSpec.hostedServices,
      })
      // Adding an explicit dependency as CloudFormation won't infer that Organization, Organizational Units and
      // Accounts must be created or modified sequentially
      account.node.addDependency(previousSequentialConstruct)
      previousSequentialConstruct = account
    })

    oUSpec.nestedOU?.forEach((nestedOU) => {
      previousSequentialConstruct = this.createOrganizationTree(nestedOU, organizationalUnit.id, previousSequentialConstruct)
    })

    return previousSequentialConstruct
  }
}