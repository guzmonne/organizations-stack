import type {
  IsCompleteRequest,
  IsCompleteResponse,
  OnEventResponse,
} from "@aws-cdk/custom-resources/lib/provider-framework/types";



/**
 * onEventHandler creates a Bitbucket Branch 
 * @param event - An event with the following ResourceProperties:
 * @property event.branchName - branch name 
 * @property event.branchUrl - branch repo url
 * @returns A PhysicalResourceId corresponding to the CreateBranch request's id necessary to
 *          check the status of the creation
 */
export async function onEventHandler(event: any): Promise<OnEventResponse> {
  console.log("Event: %j", event);

  switch (event.RequestType) {
    case "Create":
     
    case "Update":

    case "Delete":
     
    default:
      throw new Error(`${event.RequestType} is not a supported operation`);
  }

}

/**
 * isCompleteHandler is capable to check if an account creation request has been completed
 * @param event An event containing a PhysicalResourceId corresponding to a CreateAccountRequestId
 * @returns A payload containing the IsComplete Flag requested by cdk Custom Resource fwk to figure out
 *          if the resource has been created or failed to be or if it needs to retry
 */
export async function isCompleteHandler(event: IsCompleteRequest): Promise<IsCompleteResponse> {
  console.log("Event: %j", event);

  if (!event.PhysicalResourceId) {
    throw new Error("Missing PhysicalResourceId parameter.");
  }

  //TODO: fill in logic to determine if pipeline is created
  const CreateAccountStatus = true

  const createCompleted = true

  switch (event.RequestType) {
    case "Create":
      return { IsComplete: CreateAccountStatus === createCompleted, Data: { PiplineID: "pipleineID" } };
    case "Update":      
    return { IsComplete: CreateAccountStatus === createCompleted, Data: { PiplineID: "pipleineID" } };
    case "Delete":
      return { IsComplete: CreateAccountStatus === createCompleted, Data: { PiplineID: "pipleineID" } };
     
  }
}
