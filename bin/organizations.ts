import { App } from "@aws-cdk/core"

import { OrganizationsStack } from "../lib/organizations-stack"
import { Account, AccountType } from "../lib/account"

/**
 * App
 */
const app = new App()
/**
 * Context
 */
const email = app.node.tryGetContext("email")
const forceEmailVerification = app.node.tryGetContext("force_email_verification")
const nestedOU = [{
  name: "SharedServices",
  accounts: [{
    name: "CICD",
    type: AccountType.CICD,
  }]
}, {
  name: "Development",
  accounts: [{
    name: "Dev",
    type: AccountType.PLAYGROUND,
  }, {
    name: "Staging",
    type: AccountType.STAGE,
    stageName: "staging",
    stageOrder: 1,
    hostedServices: ["ALL"],
  }]
}, {
  name: "Production",
  accounts: [{
    name: "Prod",
    type: AccountType.STAGE,
    stageName: "prod",
    stageOrder: 2,
    hostedServices: ["ALL"],
  }]
}]
/**
 * Stack
 */
new OrganizationsStack(app, "Organizations", {
  email,
  nestedOU,
})