import "@aws-cdk/assert/jest"
import { Stack } from "@aws-cdk/core"

import { AccountType } from "../lib/account"
import { OrganizationsStack } from "../lib/organizations-stack"
import type { OrganizationsStackProps } from "../lib/organizations-stack"

const organizationsStackProps: OrganizationsStackProps = {
  email: "test@test.com",
  nestedOU: [
    {
      name: "SDLC",
      accounts: [
        {
          name: "Account1",
          stageName: 'theStage',
        },
        {
          name: "Account2"
        }
      ]
    },
    {
      name: "Prod",
      accounts: [
        {
          name: "Account3"
        }
      ]
    }
  ]
}

test("when I define 1 OU with 2 accounts and 1 OU with 1 account then the stack should have 2 OU constructs and 3 account constructs", () => {

  const stack = new Stack()
  let organizationsStackProps: OrganizationsStackProps
  organizationsStackProps = {
    email: "test@test.com",
    nestedOU: [
      {
        name: 'Development',
        accounts: [
          {
            name: 'Account1',
            type: AccountType.PLAYGROUND,
            hostedServices: ['app1', 'app2']
          },
          {
            name: 'Account2',
            type: AccountType.STAGE,
            stageOrder: 1,
            stageName: 'stage1',
            hostedServices: ['app1', 'app2']
          }
        ]
      },
      {
        name: 'Prod',
        accounts: [
          {
            name: 'Account3',
            type: AccountType.STAGE,
            stageOrder: 2,
            stageName: 'stage2',
            hostedServices: ['app1', 'app2']
          }
        ]
      }
    ]
  }

  const organizationsStack = new OrganizationsStack(stack, "organizationsStack", organizationsStackProps)

  expect(organizationsStack).toHaveResource("Custom::AWS", {
    "Create": JSON.stringify({
      "service": "Organizations",
      "action": "createOrganization",
      "physicalResourceId": {
        "responsePath": "Organization.Id"
      },
      "region": "us-east-1"
    }),
    "Delete": JSON.stringify({
      "service": "Organizations",
      "action": "deleteOrganization",
      "region": "us-east-1"
    })
  })

  expect(organizationsStack).toHaveResource("Custom::AWS", {
    "Create": {
      "Fn::Join": [
        "",
        [
          "{\"service\":\"Organizations\",\"action\":\"createOrganizationalUnit\",\"physicalResourceId\":{\"responsePath\":\"OrganizationalUnit.Id\"},\"region\":\"us-east-1\",\"parameters\":{\"Name\":\"Prod\",\"ParentId\":\"",
          {
            "Fn::GetAtt": [
              "OrganizationRootCustomResource9416950B",
              "Roots.0.Id"
            ]
          },
          "\"}}"
        ]
      ]
    },
  })

  expect(organizationsStack).toHaveResource("Custom::AccountCreation", {
    "Email": {
      "Fn::Join": [
        "",
        [
          "test+Account1-",
          {
            "Ref": "AWS::AccountId"
          },
          "@test.com"
        ]
      ]
    },
    "AccountName": "Account1",
    "AccountType": AccountType.PLAYGROUND,
    "HostedServices": "app1:app2"
  })

  expect(organizationsStack).toHaveResource("Custom::AccountCreation", {
    "Email": {
      "Fn::Join": [
        "",
        [
          "test+Account2-",
          {
            "Ref": "AWS::AccountId"
          },
          "@test.com"
        ]
      ]
    },
    "AccountName": "Account2",
    "AccountType": AccountType.STAGE,
    "StageName": "stage1",
    "StageOrder": "1",
    "HostedServices": "app1:app2"
  })

  expect(organizationsStack).toHaveResource("Custom::AWS", {
    "Create": {
      "Fn::Join": [
        "",
        [
          "{\"service\":\"Organizations\",\"action\":\"createOrganizationalUnit\",\"physicalResourceId\":{\"responsePath\":\"OrganizationalUnit.Id\"},\"region\":\"us-east-1\",\"parameters\":{\"Name\":\"Prod\",\"ParentId\":\"",
          {
            "Fn::GetAtt": [
              "OrganizationRootCustomResource9416950B",
              "Roots.0.Id"
            ]
          },
          "\"}}"
        ]
      ]
    }
  })

  expect(organizationsStack).toHaveResource("Custom::AccountCreation", {
    "Email": {
      "Fn::Join": [
        "",
        [
          "test+Account3-",
          {
            "Ref": "AWS::AccountId"
          },
          "@test.com"
        ]
      ]
    },
    "AccountName": "Account3",
    "AccountType": AccountType.STAGE,
    "StageName": "stage2",
    "StageOrder": "2",
    "HostedServices": "app1:app2"
  })

})

test("should have have email validation stack with forceEmailVerification set to true", () => {

  const organizationsStack = new OrganizationsStack(
    new Stack(),
    "organizationsStack",
    { ...organizationsStackProps, forceEmailVerification: true }
  )

  expect(organizationsStack).toHaveResource("Custom::EmailValidation")
})

test("should not have have email validation stack with forceEmailVerification set to false", () => {

  const organizationsStack = new OrganizationsStack(
    new Stack(),
    "organizationsStack",
    { ...organizationsStackProps, forceEmailVerification: false }
  )

  expect(organizationsStack).not.toHaveResource("Custom::EmailValidation")
})

test("should not have have email validation stack by default without setting forceEmailVerification", () => {
  const organizationsStack = new OrganizationsStack(
    new Stack(),
    "organizationsStack",
    organizationsStackProps
  )

  expect(organizationsStack).not.toHaveResource("Custom::EmailValidation")
})