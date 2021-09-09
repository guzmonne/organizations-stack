import { Construct, CustomResource } from "@aws-cdk/core"
import * as cr from "@aws-cdk/custom-resources"
import * as ssm from "@aws-cdk/aws-ssm"

import { BranchProvider } from "./branch-provider"

/**
 * BranchProps is the interface to configure the properties of the Pipeline Construct.
 */
export interface BranchProps {
  /**
   * name of the Git Branch .
   */
  name: string,
 
  /**
   * The Git branch url
   */
  url?: string;
}

/**
 * Branch is a Custom Resource representation of an Git Branch.
 */
export class Branch extends Construct {
  /**
   * branchName holds the name of the pipeline
   */
  readonly branchName: string
  /**
   * branchUrl holds the url of the branch
   */
  readonly branchUrl: string

  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this branch.
   * @param id - The instance unique identifier.
   * @param props - branch properties.
   */
  constructor(scope: Construct, id: string, props: BranchProps) {
    super(scope, id)
    /**
     * Branch Provider
     */
    const pipelineProvider = BranchProvider.getOrCreate(this)
    /**
     * Account
     */
    let account = new CustomResource(this, `Branch-${props.name}`, {
      serviceToken: pipelineProvider.provider.serviceToken,
      resourceType: "Custom::BranchCreation",
      properties: {        
        PipelineName: props.name,       
      }
    })
    
    this.branchName = props.name
  

    }   
    
}