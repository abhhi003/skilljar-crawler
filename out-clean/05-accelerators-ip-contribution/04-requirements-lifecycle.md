# Requirements & Lifecycle

## From business requirements to functional and infrastructure requirements

*Teaching | Requirements & Lifecycle | 8 min*

The deployment-platform decisions that follow all assume the requirements already exist: the residency rule, the latency target, the identity model. This screen is where those requirements come from: turning a business problem into the functional and infrastructure requirements a deployment decision can be defended against.

#### Capturing functional requirements from a business problem

A functional requirement names what the system must do, stated with enough detail to check. A business problem (e.g. "help support agents answer faster") is not yet a requirement; the functional requirements derive from it (e.g. "classify each ticket into one of four queues; draft a reply citing the relevant policy; never auto-send without human approval"). The discipline is to write each as a checkable statement of behavior. A vague goal cannot be designed against or verified, while a specific one becomes a line in an eval and a criterion at review.

#### Deriving infrastructure requirements

Infrastructure requirements are the non-functional constraints the deployment must satisfy. Most of them are not stated in the business problem; instead, you derive them by asking the questions the business problem implies. Latency: how fast does a response need to be, measured where the user is? Scale: how many requests, and at what peak? Residency: where must the data be processed, and under which regulation? Identity: who acts, under what credentials, and what must be auditable? Latency, scale, residency, and identity are the infrastructure requirements that most often decide the deployment platform, and they are easiest to capture at the start, before a platform is chosen for other reasons.

#### Documenting requirements so a decision can be defended

Requirements are written down because the deployment decision will be reviewed by people who did not gather them. A short requirements record covering the functional behaviors, the infrastructure constraints, and the regulation each constraint comes from lets you defend a platform choice as following from the requirements rather than from familiarity. This record is the input the next screen's deployment decision reads from.

Handles well

Turning a business problem into checkable functional and infrastructure requirements before any platform is chosen.

Adds cost or complexity

Eliciting infrastructure constraints up front takes a scoping conversation the team is tempted to skip.

Use a different approach

For a throwaway prototype with no review and no regulated data, lightweight notes are enough.

## Checkpoint 3: extract the requirements

*Checkpoint | Requirements & Lifecycle | 2 min*

Try it now. A regulated EU bank wants an agent that summarizes customer call transcripts for its support team, with summaries reviewed before they are stored in the EU.

Question 1

A regulated EU bank wants an agent that summarizes customer call transcripts for its support team. Which of the following is a valid functional requirement?

AThe agent should be fast and accurate.

BThe agent produces a summary that a human approves before it is stored.

CThe system must be built using an approved cloud provider.

DTranscript data must not leave the EU.

Question 2

From the same scenario, which of the following is a valid infrastructure requirement?

AThe agent must produce summaries quickly enough for support staff to act on them.

BThe agent summarizes transcripts using a pre-approved prompt template.

CTranscript data is processed in the EU.

DA human reviews each summary before it is stored.

## Systems lifecycle for Claude applications

*Teaching | Requirements & Lifecycle | 8 min*

The requirements you just captured are the first phase of a longer arc. This screen names that arc as the systems lifecycle, so the deployment, versioning, and boundary work in the rest of this module sits in the right phase rather than arriving as unrelated tasks.

#### The lifecycle phases applied to a Claude application

A Claude application moves through the same lifecycle as any engineered system, with the model work mapped onto it:

- 1**Requirements:** capture functional and infrastructure needs
- 2**Design:** choose the platform, the model, and the trust boundaries
- 3**Build:** write the agent, tools, and prompts
- 4**Test:** evals, unit, integration, and end-to-end checks
- 5**Deploy:** pin the version, gate promotion on the eval
- 6**Operate:** instrument cost, latency, and errors; enforce guardrails
- 7**Iterate:** feed production findings back into requirements

The phases are the same ones the earlier modules taught one at a time. Identifying them as a lifecycle is what shows how they connect.

#### Gating between phases

A gate is a decision to move from one phase to the next, and it is where a regulated engagement keeps control. You do not move from design to build until the platform satisfies the residency requirement; you do not move from deploy toward full production until the new version clears the eval against the pinned baseline. Placing engineering work in the right phase, and refusing to skip a gate, is what keeps a Claude application reviewable.

Handles well

Placing each piece of engineering work in the lifecycle phase it belongs to, with a defined artifact and gate.

Adds cost or complexity

Gating between phases adds checkpoints a team under deadline is tempted to skip.

Use a different approach

A one-off experiment may collapse phases, but a regulated deployment cannot.

## Checkpoint 4: place the work in the right phase

*Checkpoint | Requirements & Lifecycle | 2 min*

Try it now. Place each activity in the lifecycle phase it belongs to: requirements, design, test, deploy, operate.

(a) pinning the full model ID and keeping the prior version

requirementsdesigntestdeployoperate

(b) gating promotion on the eval result before a version goes to production

requirementsdesigntestdeployoperate

(c) deciding data must be processed in a specific region

requirementsdesigntestdeployoperate

(d) instrumenting token cost and latency per call in production

requirementsdesigntestdeployoperate

(e) choosing Amazon Bedrock because the customer holds its compliance posture there

requirementsdesigntestdeployoperate
