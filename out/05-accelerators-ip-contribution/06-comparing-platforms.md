# Comparing Platforms

## Comparing platforms on latency, compliance, and cost so the choice survives review

TeachingComparing Platforms·12 min

 

### Comparing platforms on latency, compliance, and cost so the choice survives review

 

In the last two screens you chose a platform and pinned its version. That choice was right for the customer's cloud, but "right for their cloud" is not yet an argument a procurement and security team will sign off on.

 

#### Measure latency from the customer's region

 

Latency depends on where the platform runs relative to the customer and on how access to new features is routed. A platform running in the customer's own cloud region can reduce round-trip time compared to a first-party endpoint located farther away. The trade-off is timing of access: the first-party API typically receives new capabilities before they reach other platforms. The number is only accurate when you measure it from the customer's actual region against their actual payload. A measurement from your laptop hides the round-trip penalty that appears once the workload runs where the customer is. Within Bedrock specifically, the choice between global and regional endpoints is also the primary residency control and can affect cost. You should measure from the customer's actual region against both options before committing.

 

#### Compliance often determines the platform

 

Compliance is often the dimension that ends the debate. A customer who already holds a certification on one cloud is unlikely to re-certify on another. Data residency is a rule that a customer's data must be processed in a specific country or region. Available compliance certifications and who can audit access differ by platform, and a regulated financial or healthcare customer treats these as pass-or-fail rather than as tradeoffs to balance. The first-party Claude API may not offer EU data residency; confirm current regional coverage at platform.claude.com, since EU-only residency typically requires Bedrock or Vertex AI; on third-party platforms such as Microsoft Foundry, hosting is per-model: Azure-hosted Foundry models run inference end-to-end on Azure infrastructure, while Anthropic-hosted Foundry models do not satisfy EU regional residency requirements. Residency must be confirmed per model and deployment with Microsoft. Raise the compliance constraint during scoping, or it surfaces at contract review after the work is done.

 

#### What drives total cost beyond the per-token rate

 

Per-token rates are broadly aligned across platforms; total cost moves on egress, platform fees, and integration effort. A lower token price can cost more in total once data transfer and integration are factored in. Instrument cost per call for each platform. Confirm the current pricing pages at scoping.

 

##### The cross-platform comparison reference

 

| Dimension | How it differs by platform | How to measure it | Where each platform wins | 
| Latency | A platform in the customer's region shortens the round trip, while the first-party API may reach new features first. | From the customer's actual region against their actual payload. | An in-region cloud platform wins on round-trip latency, while the first-party API is advantaged on earliest feature access. | 
| Compliance | Data residency, certifications, and audit controls are determined by the deployment platform. | Against the customer's existing certification and residency requirements during scoping. | The cloud platform the customer has already certified wins, because it needs no re-certification. | 
| Cost | Token price, data egress, platform fees, and integration effort all vary. | Total cost per call per platform, including egress and integration, rather than token price alone. | The platform with the lowest total cost for the actual workload wins, which is not always the cheapest token. |

 

Handles well

 

Measuring all three dimensions per platform turns a placement into one a procurement team will sign off on.

 

Adds cost or complexity

 

Instrumenting latency, compliance, and cost across platforms requires real measurement work before any code ships.

 

Use a different approach

 

When the customer's compliance requirement is already pass-or-fail, skip the full comparison. That constraint determines the placement on its own.

## The platform picked on familiarity that failed residency

Watch OutComparing Platforms·2 min

 

#### The platform picked on familiarity that failed residency

 

Setup

 

You picked the platform your team was already familiar with, because the migration looked easy and the deadline was approaching rapidly. It built just fine; the trouble was that easy-to-build and allowed-to-ship are different criteria.

 

The following anecdote is the kind a developer tells a teammate after a review goes sideways. It lets you see the familiar platform trap before anyone calls it a mistake.

 

##### What happened

 

A developer building for a regulated customer chose the platform the team had shipped on before. The integration came together quickly because the team knew the tools and resources. The build passed its functional tests. At the customer's security review, the reviewer asked where data was being processed. The selected platform did not satisfy the customer's residency requirements. A different platform, one the team knew less well, would have satisfied the requirement through regional deployment options the customer had already cleared. The placement was rejected, and the integration had to be rebuilt on the platform that met the residency constraint.

 

Why it broke

 

Familiarity optimized for the wrong test. The easy migration answered whether the team could build quickly. It never answered whether the deployment would pass the customer's residency review, which was the test that determined whether it could ship. Because the compliance requirement was not fulfilled during scoping, it arrived at the go-no-go review instead. This is the most expensive place to discover it, because the build was already complete.

 

What to Watch Out for

 

A platform that is easy for your team to build on is not necessarily a platform the customer is allowed to run. When the customer is regulated, the residency and compliance constraint is often pass-or-fail, rather than tradeoffs. Identify them early during scoping and let them influence the placement before familiarity does. Checking early costs a scoping conversation, while checking late costs an entire rebuild.

## Checkpoint 6: Diagnose the platform mismatch from a comparison trace

CheckpointComparing platforms on latency, compliance, and cost·3 min

 

### Checkpoint 6: Diagnose the platform mismatch from a comparison trace

 

Try it now. The comparison trace below shows a deployment platform selected on familiarity failing a customer requirement. Identify the mechanism, then pick the targeted fix from the three options.

 

The trace

 

platform_selected = "team_default" # chosen on familiarity latency_test: measured from dev laptop -> 180ms (looked fine) customer_region: eu-west, payload 12 KB compliance_check: data residency = EU-only required result: REJECTED reason="data processed outside EU on selected platform"

 

AOption 1: Optimize the parser to cut the 180ms latency measured on the laptop.

BOption 2: Remeasure latency from EU-west and select the platform whose region satisfies EU-only residency.

COption 3: Add a caching layer to reduce per call cost on the selected platform.
