import { Construct, CustomResource } from "@aws-cdk/core"
import * as cr from "@aws-cdk/custom-resources"
import * as ssm from "@aws-cdk/aws-ssm"

import { PipelineProvider } from "./pipeline-provider"

/**
 * PipelineProps is the interface to configure the properties of the Pipeline Construct.
 */
export interface PipelineProps {
  /**
   * name of the CDK Pipeline.
   */
  name: string,
 
  /**
   * The CDK Pipeline ID
   */
  id?: string;
}

/**
 * Pipeline is a Custom Resource representation of an CDK Pipeline.
 */
export class Pipeline extends Construct {
  /**
   * pipelineName holds the name of the pipeline
   */
  readonly pipelineName: string
  /**
   * pipelineID holds the id of the pipeline
   */
  readonly pipelineID: string

  /**
   * Constructor
   *
   * @param scope - The parent Construct instantiating this pipeline.
   * @param id - The instance unique identifier.
   * @param props - Pipeline properties.
   */
  constructor(scope: Construct, id: string, props: PipelineProps) {
    super(scope, id)
    /**
     * Pipeline Provider
     */
    const pipelineProvider = PipelineProvider.getOrCreate(this)
    /**
     * Pipeline
     */
    let pipeline = new CustomResource(this, `Pipeline-${props.name}`, {
      serviceToken: pipelineProvider.provider.serviceToken,
      resourceType: "Custom::PipelineCreation",
      properties: {        
        PipelineName: props.name,       
      }
    })
    
    this.pipelineName = props.name
    
   
    //TODO - manage the current list of Pipelines maybe via API call???
    /*
    let pipelineLister = new cr.AwsCustomResource(this, "CDKPipelineLister", {
      
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
      */


    }   
    
}