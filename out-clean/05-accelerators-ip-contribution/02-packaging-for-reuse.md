# Packaging for Reuse

## Packaging a working build so the next engagement starts from an asset

*Teaching | Packaging for Reuse | 16 min*

You finished the prior modules with a build that runs: an agent loop, a configured MCP server, an eval that proves that the prompt works. The most time-consuming and expensive thing on a team is the engineering time that gets spent rebuilding the same thing for the next customer.

#### What an accelerator does: keep the reusable parts and separate out the rest

An **accelerator** is a solution packaged so future engagements start from a working foundation rather than from a blank repository. In blueprint terms, this is packaging for reuse: separating engagement-specific code from the reusable core and parameterizing the rest. Take a working build, separate the parts that are customer-specific, and expose them as parameters with documented defaults. The asset then configures rather than gets entirely rewritten. Packaging for reuse while the build is fresh is cheaper than reconstructing the intent months later, when the person who knew why a value was hardcoded has moved on.

##### Most reusable work falls into different asset types, and each one packages differently

Most reusable work falls into one of three categories used throughout this module: a template, a configurable server, or a portable eval. Each type holds a different kind of work and needs to be packaged in its own way. Reaching for the wrong type can make an asset look reusable while still making it difficult to apply.

| Asset type | What it bundles | What correct packaging requires |
|---|---|---|
| Agent Template | The system prompt, the tool schemas, and the loop structure from a working agent. | Pull the domain-specific values into configuration with documented defaults, so a new team sets the values rather than editing the loop. |
| MCP Server Package | The tools the server exposes, with their inputs and the scope the installing team controls. | Document each tool input and let the installing team set the scope, so the server installs into a new environment without code edits. |
| Eval Suite | The graded test set and the judge rubric that prove the asset works. | Ship the dataset and rubric together so a new team can run them in their own context and confirm the asset still works there. The same eval suite also acts as the gate at deployment. When you promote a new model version to production, run it against a pinned baseline score before the version goes live. |

Shipping an agent as a set of loose scripts instead of a template is the most common version of the wrong approach. The scripts run, so they look reusable, but every customer-specific value is buried in a different file, and the next team copies and diverges them instead of configuring one asset.

##### Document both the code and the assumptions

Code describes behavior. Documentation covers what a future builder cannot reliably infer from reading the source: the assumptions the asset makes about its environment, the inputs it expects, the failure modes it already handles, and the eval that defines whether it still works. Without this, the next team treats the asset as a black box and rebuilds it.

##### Bundle the audit log as part of the package

A regulated customer's reviewer asks what data the asset touches, what identity it acts under, and what log it leaves. An accelerator without these passes a demo and stalls at the first security review. Treat the audit log as part of the package.

##### The packaging checklist

Keep this checklist next to the build while you package it. Each column is a decision you make once per asset.

| Asset type | What to parameterize | What to document | What to bundle for audit |
|---|---|---|---|
| Agent template | Every value that changes per customer: prompts, paths, scopes, credentials by reference, and thresholds. | Environment assumptions, expected inputs, handled failure modes, and the eval that defines working. | The data touched, the identity acted under, and the log of what the asset did. |
| MCP Server | Scopes, credentials by reference, and per-customer paths. | Expected inputs per tool, scope boundaries, and handled failure modes. | The data touched, the identity acted under, and the log of what the asset did. |
| Eval Suite | Thresholds and dataset paths that change per customer or environment. | The rubric logic, what the scores mean, and the baseline the asset is pinned to. | The data touched, the identity acted under, and the log of what the asset did. |

Handles well

Parameterizing while the build is fresh turns one delivery into an asset the next engagement configures in hours.

Adds cost or complexity

Separating generalizable from customer-specific parts and documenting assumptions adds real time to the first build.

Use a different approach

For a one-off a customer will never reuse, packaging overhead is not worth it: ship the build and move on.

## The template that shipped fast and could not be reused

*Watch Out | Packaging for Reuse | 2 min*

#### The template that shipped fast and could not be reused

Setup

Hardcoding ships faster and you were working under a deadline, so you hardcoded the values that made the demo. The template worked. That is exactly why nobody looked at it again until the next team tried to reuse it.

This is a postmortem, written the way a team writes one after the reuse attempt fails, so you can see the failure form before anyone labels it as a mistake.

##### What happened

A team built an agent template for a customer engagement and shipped it on time. To hit the due date, the customer-specific values went straight into the code: the repository path, the model name, the review thresholds, and a handful of prompt fragments specific to that customer's domain. The template ran, the engagement closed, and the build went into the shared repository labeled as reusable.

Months later a second team picked it up for a similar engagement. They could not configure it, because there was nothing to configure. Every value that needed to change was baked into the loop where the second team could not see it without reading the whole file. There was no document saying which values were customer-specific and which were load-bearing. There was also no bundled eval, so even after they guessed at the edits, nothing confirmed the template still worked in the new context. They had to rewrite it from scratch.

Why it broke

The build was treated as finished the moment it ran rather than at the moment it could be reused. Hardcoding was the reasonable call under a deadline, and it was never revisited. A working template does not announce that it cannot be reused. The cost appeared only when a second team paid for the rebuild that packaging was supposed to prevent, along with the time they lost discovering the template was a dead end.

What to Watch Out for

A template that runs has not been packaged for reuse. These are different finishing states. The warning signs are the absence of three things: no parameters where customer-specific values belong, no documentation describing the assumptions, and no bundled eval proving the asset still works in a different context. Package the asset while the build is fresh. The knowledge of what is customer-specific is most expensive to reconstruct after the people who had it have moved on.

## Checkpoint 1: Fix the broken accelerator template

*Checkpoint | Packaging a reusable accelerator | 4 min*

Try it now. Below is an agent template another team is supposed to reuse. It has one defect: a customer-specific value is hardcoded where a parameter belongs.

The template as shipped

# agent_template.py : "reusable" code-review agent def build_review_agent(): return Agent( model="claude-opus-4-8", system_prompt=SYSTEM_PROMPT, tools=[read_file, run_linter], repo_path="/home/acme/checkout-service", # customer repo )

(Confirm current model ID at platform.claude.com/docs/en/about-claude/models at build time.)

Identify the hardcoded value, then write the corrected function signature and the parameterized line that replaces it.

Skipped

Move on if you need to but come back before the cumulative task. A later checkpoint plants a version of this same hardcoding defect among two others and is harder to spot under multi-layer load.
