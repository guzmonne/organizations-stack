# Extending organizations-stack to support new workflow


Very rough outline of what is proposed

New Pipelines will be created and checked into a new branch

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

## Two new providers and custom resources will be added

![branchProvider](images/branch-provider/branchProvider.png
)

![pipelineProvider](images/pipeline-provider/pipelineProvider.png
)

It is intended that an association to existing account will be added 

### Account-Pipeline-Branch would be the logical grouping

![newCustomResources](images/new-custom-resources.png
)

# Target Architecture 

The goal is to be able to provision set of "environments" for a "customer"

#### Customer Organization:
+ Shared Services Account
    + DymamoDB - keep track of IP ranges
+ VPC linked to Transit Gateway

#### Environment Organization 
+ 3 Work Accounts (maybe more?)
+ Shared Services Account
    + RDS application DB
+ 2 Deployment Accounts
    + CDK Pipeline in each account - initially pointing at template repo
    + Blue Green Deployment from first to second or second to first






![ImmutablePipeline4](images/ImmutablePipeline-Page-4.png
)


