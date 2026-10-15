# Trust Boundaries

## Coordinating several Claude deployments with the trust boundaries holding under review

*Teaching | Trust Boundaries | 14 min*

The accelerators, deployments, and tradeoffs now come together in a single application. Connecting components multiplies the places where identity, secrets, and untrusted input can cross. The discipline is to identify every boundary before connecting anything.

#### Map which component does what before you connect them

A multi-component app coordinates more than one Claude capability into a single workflow. An API request might trigger a Claude Code task, which then reaches a customer system through an MCP server. Each component contributes a capability the others do not have. The challenge is that every connection between them creates a place where identity, secrets, and untrusted input can cross. Map which component does what before connecting anything.

#### The trust boundary is where data moves

The trust boundary is the point where data or instructions move from one deployment environment to another. It is exactly where the injection and access controls from the prior module apply. Content fetched by a Claude Code task is untrusted when it reaches the next component. The receiving component should treat it as data, rather than as instructions, following the same principle used throughout the security module. The core discipline here is to identify every seam as a boundary. Don't assume a component is trusted simply because it worked correctly on its own.

#### Least privilege applies to the whole application

Identity and least privilege, which means giving each component only the access its task needs and nothing more, apply to the application as a whole. Each component operates under an identity. The application is only as contained as its most privileged seam, which means a single component scoped too broadly becomes the weak point even when every other component is properly scoped. You scope each component to the least privilege its role in the workflow requires. This is what keeps a steered component from reaching beyond its intended task.

#### Scoping for a regulated review pulls the module together

A regulated review requires justifying audit logging, data-residency decisions, and permission controls across the full application. For regulated deployments, Bedrock and Vertex AI are typically the platforms that satisfy regional residency constraints. Confirm ZDR and HIPAA BAA eligibility for each component against the Anthropic Trust Center and platform.claude.com before scoping.

##### The multi-component integration map

| Component | What it contributes | The trust boundary at its seam | The control that enforces it |
|---|---|---|---|
| First-party API | Orchestrates the workflow and holds the entry point. | The request entering the app from outside. | Input validation and the identity the call runs under. |
| Claude Code task | Runs the agentic work and may fetch external content. | Content it fetched, which is untrusted downstream. | Treat fetched content as data at the next seam. |
| MCP server | Reaches a customer system to read or act. | The system access it holds on the app's behalf. | Scope the server to least privilege and log the access. |

Handles well

Naming every seam as a boundary and scoping each component to least privilege makes a multi-component app deployable under review.

Adds cost or complexity

Mapping seams, enforcing controls at each, and logging boundary crossings adds design and audit work to every integration.

Use a different approach

When a seam cannot be secured, do not ship around it: escalate to a human owner.

## The seam nobody marked as a boundary

*Watch Out | Trust Boundaries | 2 min*

#### The seam nobody marked as a boundary

Setup

You connected the components that each passed their own tests. The parts were already checked and connecting verified parts feels safe. Each one was trusted in isolation. The gap was that a seam between two trusted parts cannot automatically be trusted itself.

This is a short transcript from a pairing session, the kind of back-and-forth that ends at the moment the unmarked seam gets identified.

##### The session

Dev A: All three components pass their own tests. I just wired them up. Dev B: Where does the Claude Code task send what it fetched? Dev A: Straight into the next call as part of the prompt. It is just the content we pulled from the customer page. Dev B: That content is untrusted. If it carries instructions, the next component runs them, because we never mark that seam as a boundary. Dev A: But each component was trusted on its own. Dev B: Right, and the seam between them was not. That is the one nobody treated as a boundary, so fetched content crosses as instructions.

Why it broke

Each component having passed its own tests said nothing about the seam between them. The fetched content was untrusted the moment it left the Claude Code task. It arrived from a component that worked in isolation and it was passed into the next call as if it were trusted instructions. The boundary existed in the data flow. It just was not marked, so no control checked it. A component that passes its own tests has no seam-level controls. Every point where data crosses between deployment environments requires an explicit boundary control regardless of how each component behaves independently.

What to Watch Out for

A component that is trusted in isolation does not automatically make the seam leaving it trustworthy. Mark every place data or instructions cross from one deployment environment to another as a boundary. Put a control there that treats fetched content as data rather than instructions, exactly as the security work taught. The seam nobody identifies is the one a steered action crosses.

## Checkpoint 7: Complete the multi-component boundary configuration

*Checkpoint | Multi-component app and trust boundaries | 3 min*

Try it now. The multi-component app below is wired, with two blanks left. Drag the correct control onto the seam that receives untrusted fetched content and drag the correct identity scope onto the most privileged component.

The partial app

# components wired: API -> Claude Code task -> MCP server fetched = code_task.run(fetch_url=customer_page) # BLANK 1: control on the seam receiving untrusted fetched content next_call(input=drop here(fetched)) # MCP server reaches the customer system (most privileged component) mcp_server = MCPServer( system=customer_db, scope=drop here, # BLANK 2: identity scope )

Drag tokens (shared bank, two are distractors)

treat_as_dataleast_privilege_read_onlyrun_as_instructionsfull_access
