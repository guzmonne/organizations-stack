import * as path from "path"
import * as iam from "@aws-cdk/aws-iam"
import * as lambda from "@aws-cdk/aws-lambda"
import { Construct, Duration, NestedStack, Stack } from "@aws-cdk/core"
import * as cr from "@aws-cdk/custom-resources"


/**
 * PipelineProvider is a Custom Resource provider capable of creating CDK Pipelines
 */
export class PipelineProvider extends NestedStack {
  /**
   * Creates a stack-singleton resource provider nested stack.
   */
  public static getOrCreate(scope: Construct) {
    const stack = Stack.of(scope)
    const uid = "@aws-cdk/organizations.PipelineProvider"
    return stack.node.tryFindChild(uid) as PipelineProvider || new PipelineProvider(stack, uid)
  }
  /**
   * provider is the custom resource provider.
   */
  public readonly provider: cr.Provider
  /**
   * onEventHandler holds a reference to the onEvent handler lambda function.
   */
  public readonly onEventHandler: lambda.Function
  /**
   * isCompleteHandler holds a reference to the isComplete handler lambda function.
   */
  public readonly isCompleteHandler: lambda.Function
  /**
   * Constructor
   *
   * The constructor is private because we are using a Singleton pattern.
   *
   * @param scope - The parent Construct instantiating this CDK Pipeline.
   * @param id - The instance unique identifier.
   */
  private constructor(scope: Construct, id: string) {
    super(scope, id)
    /**
     * Lambda
     */
    const code = lambda.Code.fromAsset(path.join(__dirname, "../lambda/pipeline-provider"))
    /**
     * Issues UpdateTable API calls
     */
    this.onEventHandler = new lambda.Function(this, "OnEventHandler", {
      code,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.onEventHandler",
      timeout: Duration.minutes(5),
    })
    this.onEventHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [         
          "organizations:TagResource"
        ],
        resources: ["*"],
      }),
    )
    /**
     * Checks if account is ready
     */
    this.isCompleteHandler = new lambda.Function(this, "IsCompleteHandler", {
      code,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.isCompleteHandler",
      timeout: Duration.seconds(30),
    })
    this.isCompleteHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [          
          "organizations:TagResource"
        ],
        resources: ["*"],
      }),
    )
    /**
     * Custom PipelineProvider resource.
     */
    this.provider = new cr.Provider(this, "PipelineProvider", {
      onEventHandler: this.onEventHandler,
      isCompleteHandler: this.isCompleteHandler,
      queryInterval: Duration.seconds(10),
    })
  }
}
