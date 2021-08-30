Extending organizations-stack to support new workflow


Very rough outline of what is proposed

New Pipelines will be created and checked into a new branch

![Releaseambda](images/release-app/release-lambda.png
)

Not sure if we need an Account Lambda yet

![AccountLambda](images/account-lambda/account-lambda.png
)

The idea is to support a decoupled system where you can deploy to multiple accounts via CDK Pipelines but there is no coupling between environments at the pipeline level.  For each environment there is one branch and one pipeline in one account.  This gives granular control over each deployment and will support extended use cases beyond the simple dev --> staging --> prod flow

Source code is managed via branching between environments.  This supports complex setups where there may be multiple test environments each with the ability to adjust its own code base.  

It is envisioned that upon stabilization of a feature it will be ported back into the lowest level of the branch tree that is applicable so that other environments can absorb the change.  

Deployment of upgrades to any environment should be done via blue / green deployments to an existing account.   Accounts in this proposal are reusable but only associated with one active pipeline at a time.  This is not quite at the level of ephemeral accounts, but it gives the benefits of them without having to cope with fact that accounts cannot currently be removed via the API directly.


![ImmutablePipeline1](images/ImmutablePipeline-Page-1.png
)


![ImmutablePipeline2](images/ImmutablePipeline-Page-2.png
)

![ImmutablePipeline3](images/ImmutablePipeline-Page-3.png
)

This builds on the work being performed in the organziations-stack project

![libdiagram](images/lib_diagram.png
)

Note:  If this could be driven off the changees to the account it might be interesting.  Detect changes to the repo - this will trigger deploying another pipeline pointing at the new repo.  Create works as is.  But update on the account triggers a new pipeline to be created if the repo is different.
