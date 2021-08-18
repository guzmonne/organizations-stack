import { expect as expectCDK, haveResource } from "@aws-cdk/assert"
import { Stack } from "@aws-cdk/core"

import { Account } from "../lib/account"

test("HappyCase", () => {
  const stack = new Stack()
  new Account(stack, "myAccount", {
    email: "fakeEmail",
    name: "fakeAccountName",
    parentOrganizationalUnitId: "fakeOUId",
  })

  expectCDK(stack).to(
    haveResource("Custom::AccountCreation", {
      Email: "fakeEmail",
      AccountName: "fakeAccountName",
    })
  )
})
