Extending organizations-stack to support new workflow


Very rough outline of what is proposed

New Pipelines will be created and checked into a new branch

![Releaseambda](images/release-app/release-lambda.png
)

Not sure if we need an Account Lambda yet

![AccountLambda](images/account-lambda/account-lambda.png
)

The idea is to support a decoupled system where you can deploy to multiple accounts but there is no coupling between environments at the stack level.


![ImmutablePipeline1](images/ImmutablePipeline-Page-1.png
)


![ImmutablePipeline2](images/ImmutablePipeline-Page-2.png
)

![ImmutablePipeline3](images/ImmutablePipeline-Page-3.png
)

This builds on the work being performed in the organziations-stack project

![libdiagram](images/lib_diagram.png
)