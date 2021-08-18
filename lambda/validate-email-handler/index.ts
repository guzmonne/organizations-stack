import { SES, config } from "aws-sdk";
import type {
  IsCompleteRequest,
  IsCompleteResponse,
  OnEventResponse
} from "@aws-cdk/custom-resources/lib/provider-framework/types";

config.update({ region: "us-east-1" });

/**
 * onEventHandler sends a verification email
 * @param event - An event with the following ResourceProperties:
 * @property event.email - root email.
 * @returns Returns a PhysicalResourceId
 */
export async function onEventHandler(event: any): Promise<OnEventResponse | void> {
  console.log("Event: %j", event);

  if (event.RequestType === "Create") {
    const ses = new SES();
    await ses.verifyEmailIdentity({ EmailAddress: event.ResourceProperties.email }).promise();
    return { PhysicalResourceId: 'validateEmail' };
  }

  if (event.RequestType === "Delete") {
    return { PhysicalResourceId: event.PhysicalResourceId };
  }
}

/**
 * isCompleteHandler is a function that checks email has been verified
 * @param event - An event with the following ResourceProperties:
 * @property event.email - Root email.
 * @returns A payload containing the IsComplete Flag requested by cdk Custom Resource
 *          to figure out if the email has been verified and if not retries later
 */
export async function isCompleteHandler(event: IsCompleteRequest): Promise<IsCompleteResponse | void> {
  console.log("Event: %j", event);

  if (!event.PhysicalResourceId) {
    throw new Error("Missing PhysicalResourceId parameter.");
  }

  const email = event.ResourceProperties.email;
  if (event.RequestType === "Create") {
    const ses = new SES();
    const response = await ses.getIdentityVerificationAttributes({ Identities: [email] }).promise();

    return {
      IsComplete: response.VerificationAttributes[email]?.VerificationStatus === "Success"
    };
  }
  if (event.RequestType === "Delete") {
    return { IsComplete: true };
  }
}
