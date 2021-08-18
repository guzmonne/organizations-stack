import * as path from "path"
import * as iam from "@aws-cdk/aws-iam"
import * as lambda from "@aws-cdk/aws-lambda"
import { Construct, Duration, Stack, NestedStack, StackProps } from "@aws-cdk/core"
import { Provider } from "@aws-cdk/custom-resources"

/**
 * ValidateEmailProviderProps are the properties of ValidateEmail.
 */
export interface ValidateEmailProviderProps extends StackProps {
  /**
   * timeout to wait for validation.
   */
  timeout?: Duration;
}
/**
 * ValidateEmailProvider is a custom Resource provider capable of validating emails
 */
export class ValidateEmailProvider extends NestedStack {
  /**
   * provider is the custom resource provider.
   */
  readonly provider: Provider;
  /**
   * getOrCreate creates a stack-singleton resource provider nested stack.
   */
  public static getOrCreate(scope: Construct, props: ValidateEmailProviderProps) {
    const stack = Stack.of(scope)
    const uid = "empathp/infrastructure.ValidateEmailProvider"
    return ((stack.node.tryFindChild(uid) as ValidateEmailProvider) || new ValidateEmailProvider(stack, uid, props))
  }
  /**
   * Constructor
   *
   * @param scope The parent Construct instantiating this construct
   * @param id This instance name
   */
  constructor(scope: Construct, id: string, props: ValidateEmailProviderProps) {
    super(scope, id)
    /**
     * Lambda
     */
    const code = lambda.Code.fromAsset(path.join(__dirname, "../lambda/validate-email-handler"))
    const onEventHandler = new lambda.Function(this, "OnEventHandler", {
      code,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.onEventHandler",
      timeout: Duration.minutes(5)
    })
    onEventHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:verifyEmailIdentity"],
        resources: ["*"]
      })
    )
    const isCompleteHandler = new lambda.Function(this, "IsCompleteHandler", {
      code,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.isCompleteHandler",
      timeout: props.timeout ? props.timeout : Duration.minutes(10)
    })
    isCompleteHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:getIdentityVerificationAttributes"],
        resources: ["*"]
      })
    )
    /**
     * Custom Provider
     */
    this.provider = new Provider(this, "EmailValidationProvider", {
      onEventHandler: onEventHandler,
      isCompleteHandler: isCompleteHandler,
      queryInterval: Duration.seconds(10)
    })
  }
}
