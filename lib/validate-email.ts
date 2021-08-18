import { Construct, CustomResource, Duration } from "@aws-cdk/core"
import { ValidateEmailProvider } from "./validate-email-provider"

/**
 * ValidateEmailProps are the properties of ValidateEmail
 */
export interface ValidateEmailProps {
  /**
   * email address of the Root account
   */
  readonly email: string
  /**
   * timeout to wait for the confirmation
   */
  readonly timeout?: Duration
}

/**
 * ValidateEmail is a Construct used to validate an email address.
 */
export class ValidateEmail extends Construct {
  /**
   * Constructor
   *
   * @param scope The parent Construct instantiating this construct
   * @param id This instance name
   * @param accountProps ValidateEmail properties
   */
  constructor(scope: Construct, id: string, props: ValidateEmailProps) {
    super(scope, id)

    const [prefix, domain] = props.email.split("@")

    if (prefix?.includes("+")) {
      throw new Error("root Email should be without + in it")
    }

    const subAddressedEmail = prefix + "+aws@" + domain

    const { provider } = ValidateEmailProvider.getOrCreate(this, { timeout: props.timeout })

    new CustomResource(this, "EmailValidateResource", {
      serviceToken: provider.serviceToken,
      resourceType: "Custom::EmailValidation",
      properties: {
        email: subAddressedEmail
      }
    })
  }
}
