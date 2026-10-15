# Accelerators & IP Contribution - Study Notes

Source: Developer course Module 5 (Accelerators and IP Contribution), 9 course screens plus index.
Throughline of the module: the point where code starts working is where this module's work begins.

---

## 1. Big Picture

- Modules 1-4 produced a working build (production agent, Claude Code configuration, MCP connections, evals and security). Module 5 covers what happens after it works.
- Choice on the next engagement: rebuild from scratch, or package once so the next team configures an asset.
- A build that works is not yet a build that survives reuse, review, or deployment. Each topic in the module is a different version of this one gap.
- Five skills: (1) package an accelerator, (2) contribute back through documented channels, (3) choose the platform and version what ships, (4) compare platforms on latency, compliance and cost, (5) coordinate several Claude deployments with trust boundaries held under review.
- Much of the decision-making is driven by the customer's existing cloud, compliance posture and review process, not by technical merit alone.
- The work is mostly decisions that make finished code reusable, deployable and defensible to people who did not write it.
- Systems lifecycle ties it together: Requirements, Design, Build, Test, Deploy, Operate, Iterate, with gates between phases.

```
 working build
      |
      v
 [PACKAGE]  parameters + documented assumptions + bundled eval + audit log
      |                                   |
      |                                   +--> same eval = deployment gate
      v
 [CONTRIBUTE]  focused code + example + test + assumptions
      |         (rights/licensing check FIRST)
      v
 [REQUIREMENTS] functional + infrastructure (latency, scale,
      |          residency, identity) -> written record
      v
 [PLACE + PIN]  customer cloud decides platform; pin full model ID;
      |         keep prior version; promote through eval
      v
 [COMPARE]  latency (measure from customer region) / compliance
      |     (often pass-or-fail) / total cost per call
      v
 [CONNECT]  mark every seam as trust boundary; least privilege;
            fetched content = data, not instructions
      |
      v
 deployable, auditable, reusable asset
```

---

## 2. Course Sections

### 2.1 Module Introduction

Key ideas
- Document the build well and the next engagement builds from it instead of from scratch.
- Module audience: a Developer with a working build who must make it last. It does not re-teach agents, Claude Code, MCP or evals.
- The module asks: can someone else reuse it, can a maintainer accept it, can it survive a model update, can a security or procurement team sign off on where it runs.
- Each "works in development" fact has a finished-state counterpart:
  - template ran -> must be configurable by a team that never spoke to you
  - contribution solved your problem -> must be verifiable by a maintainer who reconstructs nothing
  - model responded -> must be pinned so an upstream change is a decision, not a surprise
  - platform was easy -> must clear the customer's residency and compliance review
  - connected platforms passed their own tests -> must hold trust boundaries under audit

Rules and traps
- Treating "it runs" as "it is finished" is the shared root cause of every failure story in the module.

### 2.2 Packaging for Reuse (16 min teaching, plus Watch Out and Checkpoint 1)

Key ideas
- Accelerator: a solution packaged so future engagements start from a working foundation rather than a blank repository.
- Packaging for reuse = separate engagement-specific code from the reusable core, and parameterize the rest. Expose customer-specific parts as parameters with documented defaults.
- Do it while the build is fresh; reconstructing intent months later (after the person who knew why a value was hardcoded has left) is more expensive.
- Three asset types, each packaged differently:

| Asset type | What it bundles | What correct packaging requires |
|---|---|---|
| Agent Template | System prompt, tool schemas, loop structure | Pull domain-specific values into configuration with documented defaults; new team sets values rather than editing the loop |
| MCP Server Package | Tools exposed, their inputs, and scope the installing team controls | Document each tool input; let installing team set scope; installs into a new environment without code edits |
| Eval Suite | Graded test set and judge rubric | Ship dataset and rubric together so a new team can run them in their own context; also acts as the deployment gate (run new model version against a pinned baseline score before it goes live) |

- Document both code and assumptions: environment assumptions, expected inputs, failure modes already handled, and the eval that defines "still works". Without this, the next team treats the asset as a black box and rebuilds it.
- Bundle the audit log as part of the package. A regulated reviewer asks what data the asset touches, what identity it acts under, and what log it leaves. An accelerator without these passes a demo and stalls at the first security review.

Packaging checklist (decide once per asset)

| Asset type | Parameterize | Document | Bundle for audit |
|---|---|---|---|
| Agent template | Every per-customer value: prompts, paths, scopes, credentials by reference, thresholds | Environment assumptions, expected inputs, handled failure modes, eval that defines working | Data touched, identity acted under, log of what the asset did |
| MCP Server | Scopes, credentials by reference, per-customer paths | Expected inputs per tool, scope boundaries, handled failure modes | Same three audit items |
| Eval Suite | Thresholds and dataset paths per customer or environment | Rubric logic, what scores mean, baseline the asset is pinned to | Same three audit items |

Rules and traps
- Loose scripts instead of a template is the most common wrong approach: they run, so they look reusable, but customer values are buried in different files and the next team copies and diverges them.
- Handles well: parameterizing while fresh turns one delivery into an asset configured in hours.
- Adds cost: separating generalizable from customer-specific parts and documenting assumptions adds real time to the first build.
- Use a different approach: for a one-off a customer will never reuse, packaging overhead is not worth it; ship and move on.

Watch Out: the template that shipped fast and could not be reused
- Hardcoded under deadline: repository path, model name, review thresholds, customer-specific prompt fragments.
- Second team could not configure it (nothing to configure), had no document saying which values were customer-specific vs load-bearing, and no bundled eval to confirm it worked in the new context. They rewrote it.
- Why: build treated as finished when it ran, not when it could be reused.
- Warning signs: absence of (1) parameters where customer-specific values belong, (2) documentation of assumptions, (3) a bundled eval proving it still works elsewhere.

### 2.3 Contributing Back (12 min teaching, plus Watch Out and Checkpoint 2)

Key ideas
- An asset packaged for internal reuse is already close to what a maintainer needs: parameters show it is configurable, documented assumptions show expected environment, bundled eval shows it still works.
- The contribution channel carries version, installation steps and components as a single unit.
- Contributing back = moving an asset from private reuse to shared infrastructure through a documented channel. Match the contribution to the channel built for it:
  - Claude Cookbook: a GitHub repository of focused reference implementations; self-contained single- or multi-pattern implementations demonstrated clearly and working end to end.
  - Open-source MCP servers and tools: each lives in its own repository with its own contribution conventions.
- A maintainer accepts what they can verify. Four things make verification possible:
  1. The code does one thing.
  2. An example shows it running.
  3. A test proves it works.
  4. A short statement names the assumptions.
- Rights and attribution come BEFORE technical review: confirm you have the right to contribute code carried in from a customer engagement and attribute anything you built on.
- The worked example: a customer service agent's reusable conversation-handling pattern, stripped of customer specifics, prepared as a general Cookbook example.
- The contribution-back motion is shared across all three roles in the curriculum; the Developer's job is technical readiness (focused code, example, test, assumptions, rights check). Engagement context comes from the broader team.

Contribution-readiness reference

| Channel | What a maintainer checks | Licensing and attribution | Example and test bar |
|---|---|---|---|
| Cookbook for a focused example, or the tool/server's own repository for a tool or fix | Code does one thing and can be read in full | Confirm right to contribute engagement code; attribute prior work | Runnable example plus a test that proves the behavior, not just a description |

Rules and traps
- Sending a full multi-component application to the Cookbook is a mismatch: it reviews one focused pattern, so the submission stalls. One of the most common reasons a contribution is never reviewed.
- Skipping the rights check turns a contribution into a problem the legal team must unwind later.
- Handles well: a packaged asset needs only example, test and rights check to become shared infrastructure.
- Adds cost: clearing the maintainer bar and licensing gate is real work on top of making code run for you.
- Use a different approach: if code carries an engagement licensing constraint you cannot clear, do not contribute it; escalate to the owner.

Watch Out: the pull request a maintainer could not verify
- PR open three weeks, code worked for the author. Maintainer: no test to run, no example proving behavior, nothing stating environment assumptions.
- A contribution a reviewer cannot verify sits at the back of the queue until someone has time to reconstruct what it does. A focused PR with a test and example is reviewed fast.
- The gap is easy to overlook because the author already has the missing context.

### 2.4 Requirements & Lifecycle (two teaching screens, 8 min each, plus Checkpoints 3 and 4)

Key ideas: functional requirements
- A functional requirement names what the system must do, with enough detail to check.
- A business problem ("help support agents answer faster") is not yet a requirement. Derived functional requirements example: "classify each ticket into one of four queues; draft a reply citing the relevant policy; never auto-send without human approval".
- Write each as a checkable statement of behavior; it becomes a line in an eval and a criterion at review. A vague goal cannot be designed against or verified.

Key ideas: infrastructure requirements
- Non-functional constraints the deployment must satisfy. Mostly not stated in the business problem; derive them by asking:
  - Latency: how fast must a response be, measured where the user is?
  - Scale: how many requests, what peak?
  - Residency: where must data be processed, under which regulation?
  - Identity: who acts, under what credentials, what must be auditable?
- These four most often decide the deployment platform. Easiest to capture at the start, before a platform is chosen for other reasons.

Key ideas: documentation
- Write a short requirements record: functional behaviors, infrastructure constraints, and the regulation each constraint comes from. It lets you defend a platform choice as following from requirements rather than familiarity. It is the input to the deployment decision.

Key ideas: lifecycle phases applied to a Claude application
1. Requirements: capture functional and infrastructure needs
2. Design: choose the platform, the model, and the trust boundaries
3. Build: write the agent, tools, and prompts
4. Test: evals, unit, integration, and end-to-end checks
5. Deploy: pin the version, gate promotion on the eval
6. Operate: instrument cost, latency, and errors; enforce guardrails
7. Iterate: feed production findings back into requirements

- Gate = a decision to move from one phase to the next; where a regulated engagement keeps control. Examples: no move from design to build until the platform satisfies the residency requirement; no move from deploy toward full production until the new version clears the eval against the pinned baseline.

Rules and traps
- Eliciting infrastructure constraints up front takes a scoping conversation the team is tempted to skip.
- Gating adds checkpoints a team under deadline is tempted to skip; refusing to skip a gate keeps the application reviewable.
- Throwaway prototype with no review and no regulated data: lightweight notes are enough. A one-off experiment may collapse phases, but a regulated deployment cannot.

### 2.5 Deployment & Versioning (15 min teaching, plus Watch Out and Checkpoint 5)

Key ideas
- Platform decision is rarely about technical merit alone; it is usually shaped by where the customer already has cloud infrastructure, identity management and compliance agreements. First question: which platform does the customer already trust and operate on.
- Deployment platform = the environment where the Claude workload runs. Same model can run in several; the customer's existing cloud usually decides.
- Platforms as the source describes them:
  - First-party Claude API: Anthropic's own environment; typically receives new features first.
  - Claude Platform on AWS: accessed through the customer's AWS account using Anthropic's own model IDs and lifecycle; inference is Anthropic-operated, outside the AWS boundary.
  - Amazon Bedrock has two integrations: Claude in Amazon Bedrock (Messages API at /anthropic/v1/messages, broad feature parity; confirm feature-specific requirements against Bedrock docs, as a features-not-supported list exists) and Claude on Amazon Bedrock (legacy) (InvokeModel/Converse APIs, ARN-versioned identifiers).
  - Google Vertex AI: the same idea inside Google Cloud.
  - Third-party platforms (e.g. Microsoft Foundry): embed Claude inside a product the customer already uses.
- Microsoft Foundry has two hosting forms:
  - Hosted on Azure: currently Claude Opus 4.8, Claude Sonnet 5, Claude Haiku 4.5; inference end-to-end on Azure infrastructure; generally available.
  - Hosted on Anthropic: all other Foundry Claude models; inference on Anthropic-operated infrastructure.
  - Residency for regulated customers depends on the hosting form of the specific model. Confirm hosting form and current model split with Microsoft at build time.
- Identity and data location are answered by the platform, not your code. Bedrock: AWS identity, data inside the customer's AWS boundary. Vertex: Google Cloud identity and boundary. Both offer regional routing when residency is a constraint. Matching the platform to the customer's existing compliance agreement avoids a residency review from scratch.

Versioning
- Every Claude model ID points to a specific model snapshot. Aliases such as Opus and Sonnet are convenient but evolve over time and may resolve to different versions across platforms. A pinned full model ID resolves to a fixed snapshot.
- Pin the specific version, not the alias, so an upstream update is a deliberate choice. Then: version the prompt and the asset alongside the code; keep the prior version available so a regression can be rolled back.
- Gate promotion on the eval suite: send a new version to a portion of traffic, compare against the pinned baseline, promote or roll back on the result. The eval becomes the deployment gate rather than a one-time test.

Snippet from the course (pre-4.6 convention; model strings copied as shown):

```
# Pre-4.6 example: a convenience alias can resolve to a new
# version without you knowing
model = "claude-haiku-4-5"
# Pre-4.6 pinned snapshot: the version is fixed until you change this line
model = "claude-haiku-4-5-20251001"
```

- Convention note: for Claude 4.6 and later, the model ID alone pins to a specific snapshot; for earlier models, ID plus a date suffix is required. Verify the current convention at platform.claude.com at build time.

Deployment-platform decision table (from the source)

| Platform | Identity and data model | When to choose | How versioning is pinned |
|---|---|---|---|
| First-party Claude API | Anthropic identity and terms | No binding cloud or residency constraint; wants newest capabilities | Pin full model ID; keep prior snapshot |
| Claude Platform on AWS | Anthropic identity and terms via customer's AWS account; inference Anthropic-operated outside AWS boundary; lifecycle follows Anthropic's deprecation schedule | On AWS but wants Anthropic model IDs, lifecycle and feature parity with first-party API | Same model ID format as Claude API (e.g. claude-opus-4-8); lifecycle follows Anthropic's schedule (confirm at publish time) |
| Claude in Amazon Bedrock | Messages API at /anthropic/v1/messages; broad feature parity (confirm feature-specific needs); data inside customer's configured AWS boundary | On AWS, wants broad parity, holds compliance posture there | Pin full model ID using the anthropic. prefix format; partner retirement dates differ from Anthropic's schedule; confirm at publish time |
| Claude on Amazon Bedrock (legacy) | AWS identity and billing; InvokeModel/Converse; ARN-versioned model identifiers | On an existing Bedrock integration via InvokeModel/Converse, not migrated to Messages API | Pin via ARN-versioned identifiers per Bedrock's versioning controls |
| Google Vertex AI | Google Cloud identity, IAM and billing; regional or global endpoints for residency | On Google Cloud and holds compliance posture there | Pin full model ID before rollout using Vertex's model ID format; partner retirement dates differ from Anthropic's schedule |
| Third-party platform | Wrapping product's identity and billing model; Foundry hosting forms as above; confirm residency and compliance terms with Microsoft | Customer already runs the platform that embeds Claude | Pin per the platform's versioning controls |

Rules and traps
- An unpinned deployment makes every upstream model update an untracked change to your output.
- Handles well: matching platform to customer cloud and pinning keeps migration reviewable and rollback possible.
- Adds cost: pinning, retaining prior versions and gating on the eval add release-process overhead.
- Use a different approach: a throwaway prototype that never touches production can use a moving alias; pinning is for what ships.

Watch Out: the deployment that broke when the model alias moved
- Log shows: deploy with model="opus" ok; alias advanced to a new opus version with no app change; parser KeyError "summary" because output shape changed; rollback attempted and failed since no pinned prior version was retained; hotfix of parser; root cause = unpinned deployment.
- The application never changed; the alias did. The hotfix left the unpinned deployment in place.
- Fix pattern: pin the full ID, retain the prior pinned version (regression becomes a rollback, not a hotfix), gate the new version through the eval so output-shape change shows in a test run, not production.

### 2.6 Comparing Platforms (12 min teaching, plus Watch Out and Checkpoint 6)

Key ideas
- "Right for their cloud" is not yet an argument procurement and security will sign off on. Measure three dimensions.
- Latency: depends on where the platform runs relative to the customer and how feature access is routed. A platform in the customer's own cloud region can cut round-trip time vs a farther first-party endpoint; trade-off is that the first-party API typically gets new capabilities first. Measure from the customer's actual region against their actual payload; a laptop measurement hides the round-trip penalty. Within Bedrock, global vs regional endpoints is also the primary residency control and can affect cost; measure from the customer's region against both options before committing.
- Compliance: often ends the debate. A customer certified on one cloud is unlikely to re-certify on another. Data residency = a rule that data must be processed in a specific country or region. Certifications and who can audit access differ by platform; regulated finance or healthcare treat these as pass-or-fail.
  - The first-party Claude API may not offer EU data residency; confirm current regional coverage at platform.claude.com. EU-only residency typically requires Bedrock or Vertex AI.
  - On third-party platforms such as Microsoft Foundry, hosting is per-model: Azure-hosted models run inference end-to-end on Azure; Anthropic-hosted Foundry models do not satisfy EU regional residency requirements. Confirm residency per model and deployment with Microsoft.
  - Raise the compliance constraint during scoping, or it surfaces at contract review after the work is done.
- Cost: per-token rates are broadly aligned across platforms; total cost moves on egress, platform fees and integration effort. A lower token price can cost more in total. Instrument cost per call per platform; confirm current pricing pages at scoping.

Cross-platform comparison reference

| Dimension | How it differs | How to measure | Where each wins |
|---|---|---|---|
| Latency | In-region platform shortens round trip; first-party may reach new features first | From customer's actual region, actual payload | In-region cloud wins round trip; first-party wins earliest feature access |
| Compliance | Residency, certifications, audit controls set by platform | Against customer's existing certification and residency requirements during scoping | The cloud the customer has already certified (no re-certification) |
| Cost | Token price, egress, platform fees, integration effort | Total cost per call per platform incl. egress and integration | Lowest total cost for the actual workload, not always the cheapest token |

Rules and traps
- Adds cost: real measurement work before any code ships.
- Use a different approach: when compliance is already pass-or-fail, skip the full comparison; that constraint places the workload on its own.

Watch Out: the platform picked on familiarity that failed residency
- Team used the platform it had shipped on before; it built fast and passed functional tests. At the security review the reviewer asked where data was processed; it failed the residency requirement. A less familiar platform with regional deployment options the customer had cleared would have passed. Integration was rebuilt.
- Familiarity answered "can we build quickly", not "will it pass residency review". Checking early costs a scoping conversation; checking late costs an entire rebuild.

### 2.7 Trust Boundaries (14 min teaching, plus Watch Out and Checkpoint 7)

Key ideas
- A multi-component app coordinates more than one Claude capability in one workflow (e.g. an API request triggers a Claude Code task, which reaches a customer system through an MCP server). Each connection creates a place where identity, secrets and untrusted input can cross. Map which component does what before connecting anything.
- Trust boundary: the point where data or instructions move from one deployment environment to another; exactly where the injection and access controls from the prior module apply.
- Content fetched by a Claude Code task is untrusted when it reaches the next component. The receiver treats it as data, not instructions.
- Core discipline: identify every seam as a boundary; do not assume a component is trusted because it worked correctly on its own.
- Least privilege (each component gets only the access its task needs) applies to the whole application. The application is only as contained as its most privileged seam; one component scoped too broadly is the weak point. Scoping each component to least privilege keeps a steered component from reaching beyond its task.
- Regulated review requires justifying audit logging, data-residency decisions and permission controls across the full application. Bedrock and Vertex AI are typically the platforms that satisfy regional residency constraints. Confirm ZDR and HIPAA BAA eligibility per component against the Anthropic Trust Center and platform.claude.com before scoping.

Multi-component integration map

| Component | Contributes | Trust boundary at its seam | Control that enforces it |
|---|---|---|---|
| First-party API | Orchestrates workflow, holds entry point | Request entering the app from outside | Input validation and the identity the call runs under |
| Claude Code task | Runs agentic work, may fetch external content | Content it fetched, untrusted downstream | Treat fetched content as data at the next seam |
| MCP server | Reaches a customer system to read or act | System access it holds on the app's behalf | Scope to least privilege and log the access |

Rules and traps
- Adds cost: mapping seams, enforcing controls and logging boundary crossings adds design and audit work.
- Use a different approach: when a seam cannot be secured, do not ship around it; escalate to a human owner.

Watch Out: the seam nobody marked as a boundary
- Three components passed their own tests and were wired together. The Claude Code task's fetched customer-page content went straight into the next call as part of the prompt. If it carries instructions, the next component runs them.
- Passing individual tests says nothing about the seam. A component that passes its own tests has no seam-level controls. Every point where data crosses between deployment environments needs an explicit boundary control. The seam nobody identifies is the one a steered action crosses.

---

## 3. Checkpoints and Exercises

Note: the source shows the checkpoint prompts and options but, for most, not an answer key. Where the course does not state an answer, the reasoning below is derived from the teaching text and is labelled.

### Checkpoint 1: Fix the broken accelerator template
- What it tests: spotting a hardcoded customer-specific value and parameterizing it.
- Template as shipped (Python-like, copied from source): `build_review_agent()` returns `Agent(model="claude-opus-4-8", system_prompt=SYSTEM_PROMPT, tools=[read_file, run_linter], repo_path="/home/acme/checkout-service")`. Source note: confirm current model ID at platform.claude.com at build time.
- Reasoning: the defect is the hardcoded `repo_path` ("# customer repo"). The correction is to take the path as a parameter in the function signature and pass it in. The cumulative task's corrected version shows this form: `def build_agent(repo_path):` with `repo_path=repo_path` (set per engagement).
- Source says a later checkpoint plants this same defect among two others, harder to spot under multi-layer load.
- Source gap: Checkpoint 1's own model answer is not shown (free-response); the correction above is taken from the cumulative-task corrected code.

Java analogue (illustrative only, not from the course):

```java
// Before: customer value baked into the loop
Agent buildReviewAgent() { return new Agent("/home/acme/checkout-service"); }

// After: customer-specific value is a parameter with the caller deciding it
Agent buildReviewAgent(String repoPath) { return new Agent(repoPath); }
```

### Checkpoint 2: Choose the contribution channel and the readiness fix
- What it tests: matching a contribution to the channel built for it and to the one missing readiness item.
- Case A: focused tool wrapping a single API into a function, snippet is only the function.
- Case B: full customer-service application with UI and deployment scripts.
- Case C: one-line fix to an existing Cookbook example, carried in from a customer engagement.
- Options (channel): the tool's own repository; the Cookbook, but only after the reusable pattern is stripped out as a focused example; the Cookbook example's own repository.
- Options (missing item): a test that proves the wrapper behaves; reduction to a single focused pattern because a whole application does not fit a review built for one pattern; the rights check because engagement code can carry a licensing constraint that blocks the merge before technical review.
- Reasoning from the course text: A is a tool -> its own repository, missing a test (snippet is the function and nothing else). B is a whole application -> Cookbook only after the pattern is stripped to a focused example; missing item is reduction to a single focused pattern. C is a fix carried in from an engagement -> rights check; channel is the Cookbook example's own repository.
- Source gap: the answer key for the drag/select matching is not shown; the mapping above is inferred from the option wording and the Contributing Back text.

### Checkpoint 3: Extract the requirements
- Scenario: regulated EU bank, agent summarizes customer call transcripts for support team, summaries reviewed before they are stored in the EU.
- What it tests: distinguishing a functional requirement (checkable behavior) from an infrastructure requirement (non-functional constraint: latency, scale, residency, identity).
- Q1 (valid functional requirement), options: A fast and accurate; B agent produces a summary that a human approves before it is stored; C built using an approved cloud provider; D transcript data must not leave the EU.
  - Reasoning: B is a checkable behavior of the system. A is vague and not checkable; C and D are constraints on deployment.
- Q2 (valid infrastructure requirement), options: A quick enough for support staff to act on; B pre-approved prompt template; C transcript data is processed in the EU; D human reviews each summary before it is stored.
  - Reasoning: C is a residency constraint (infrastructure). A is a vague latency statement with no stated target; B and D are behavior/functional.
- Source gap: no answer key is shown; answers are derived from the definitions in the lesson.

### Checkpoint 4: Place the work in the right phase
- What it tests: mapping activities to lifecycle phases (requirements, design, test, deploy, operate).
- Items: (a) pinning the full model ID and keeping the prior version; (b) gating promotion on the eval result before production; (c) deciding data must be processed in a specific region; (d) instrumenting token cost and latency per call in production; (e) choosing Amazon Bedrock because the customer holds its compliance posture there.
- Reasoning from the lifecycle list: (a) Deploy (deploy phase = "pin the version, gate promotion on the eval"); (b) Deploy; (c) Requirements (residency is an infrastructure requirement); (d) Operate ("instrument cost, latency, and errors"); (e) Design ("choose the platform, the model, and the trust boundaries").
- Source gap: no explicit answer key shown; placements follow the phase definitions.

### Checkpoint 5: Match deployment platform and version pin to each scenario
- Scenario: customer runs AWS with a data-residency requirement and needs to roll back a model update. Select one correct piece per group.
- Groups: Platform (First-party API / Amazon Bedrock / Google Vertex AI); Identity (AWS identity reference / Anthropic API key); Model reference (a pinned full model ID / a moving alias); Rollback (retain the prior pinned version / no retention).
- Reasoning from the lesson: Amazon Bedrock (AWS customer; data inside customer's AWS boundary, regional routing for residency); AWS identity reference (Bedrock uses AWS identity); a pinned full model ID; retain the prior pinned version. Leave out first-party API, Vertex, Anthropic API key, moving alias, no retention.
- Source gap: no answer key shown; selections derived from the decision table.

### Checkpoint 6: Diagnose the platform mismatch from a comparison trace
- Trace: platform_selected = "team_default" (chosen on familiarity); latency measured from dev laptop = 180ms (looked fine); customer_region eu-west, payload 12 KB; compliance_check requires data residency EU-only; result REJECTED, reason "data processed outside EU on selected platform".
- What it tests: identifying the mechanism (platform chosen on familiarity, latency measured from the wrong place, residency pass-or-fail never checked) and the targeted fix.
- Options: 1 optimize parser to cut 180ms; 2 remeasure latency from EU-west and select the platform whose region satisfies EU-only residency; 3 add a caching layer to cut per-call cost.
- Reasoning: Option 2. The rejection is a residency failure, not a latency or cost problem; the laptop measurement hides the in-region picture; compliance should have been raised in scoping and drives placement.
- Source gap: no answer key shown; Option 2 is derived from the Comparing Platforms text.

### Checkpoint 7: Complete the multi-component boundary configuration
- Wiring: API -> Claude Code task -> MCP server. Code: `fetched = code_task.run(fetch_url=customer_page)`; BLANK 1 is the control on `next_call(input=<drop here>(fetched))`; BLANK 2 is `scope=<drop here>` on `MCPServer(system=customer_db, ...)`, the most privileged component.
- Token bank (two distractors): treat_as_data, least_privilege_read_only, run_as_instructions, full_access.
- Reasoning: BLANK 1 = treat_as_data (fetched content is data, not instructions); BLANK 2 = least_privilege_read_only (least privilege). Distractors: run_as_instructions, full_access.
- Source gap: the answer key is not displayed; treat_as_data is confirmed by the cumulative-task corrected code, while `least_privilege_read_only` is inferred from least-privilege teaching and the token names.

### Cumulative Task, part 1: find all three defects
- What it tests: finding one defect per layer (packaging, deployment/versioning, multi-component boundary) in one code listing under load.
- Code as shipped (Python-like, from source): `build_agent()` returns `Agent(model="opus", system_prompt=SYSTEM_PROMPT, repo_path="/home/acme/checkout", tools=[read_file, run_linter])`; `deploy(platform="amazon_bedrock", identity=aws_role_arn)`; then `fetched = code_task.run(fetch_url=customer_page)` and `next_call(input=fetched)`.
- Three defects: (1) hardcoded `repo_path`; (2) `model="opus"` is a moving alias with no retained prior version; (3) `fetched` passed straight into the next call.
- The student writes the three corrected lines to carry into part 2.

### Cumulative Task, part 2: assemble and verify the corrected deployment
- Corrected code (from source, copied as shown):
  - `def build_agent(repo_path):  # parameterized for reuse`
  - `model="us.anthropic.claude-opus-4-8",  # pinned full Bedrock model ID`
  - `repo_path=repo_path,  # set per engagement`
  - `deploy(platform="amazon_bedrock", identity=aws_role_arn, retain_previous_pinned_version=True)  # rollback target kept`
  - `next_call(input=treat_as_data(fetched))  # untrusted -> data, not instructions`
  - `assert eval_suite.run(model="us.anthropic.claude-opus-4-8") >= baseline_score` (verify before promoting: gate the version through the bundled eval)
- Model answer as the course states it:
  1. Hardcoded repository path: parameterizing restores reuse; a new engagement sets the value rather than editing the loop.
  2. Moving model alias: pinning the full Bedrock model ID (with the anthropic. prefix) with a retained previous version restores controlled rollout and gives a rollback target if the new version regresses.
  3. Fetched content passed directly as instructions: wrapping it in treat_as_data() closes the trust boundary; content from an untrusted source is data, not something the agent should act on.
  4. The eval assertion gates promotion on a proven baseline score before the version ships.
- Note: the course's code uses `identity=aws_role_arn` (AWS identity reference) for Bedrock. `retain_previous_pinned_version` and `treat_as_data` appear as the course's illustrative names in this exercise.

---

## 4. Common Mistakes

| Mistake | Fix |
|---|---|
| Hardcoding customer values (repo path, model name, thresholds, prompt fragments) to hit a deadline | Parameterize with documented defaults while the build is fresh |
| Shipping an agent as loose scripts and calling it a template | Package as one template; pull domain values into configuration so teams set values, not edit the loop |
| Packaging with no documentation of assumptions | Document environment assumptions, expected inputs, handled failure modes and the eval that defines working |
| No bundled eval | Ship dataset and rubric with the asset; it also becomes the deployment gate against a pinned baseline |
| Leaving out the audit log | Bundle what data is touched, what identity is used, and the log of what the asset did |
| Sending a whole multi-component app to the Cookbook | Strip the reusable pattern into one focused example; use the tool's own repository for tools and fixes |
| Opening a PR with only the code that worked for you | Add the runnable example, a test, and a short statement of assumptions |
| Skipping the rights/attribution check on engagement code | Confirm the right to contribute and attribute prior work before technical review; escalate to owner if it cannot be cleared |
| Treating a vague goal as a requirement ("fast and accurate") | Write checkable functional statements; derive latency, scale, residency, identity as infrastructure requirements |
| Skipping lifecycle gates under deadline | Do not move design -> build before residency is satisfied; do not move toward full production before the eval clears baseline |
| Deploying with a moving alias (e.g. model="opus") | Pin the full model ID; keep the prior pinned version for rollback |
| Choosing the platform the team already knows | Identify residency and compliance constraints during scoping; let them drive placement |
| Measuring latency from a dev laptop | Measure from the customer's actual region with their actual payload |
| Comparing platforms on token price alone | Compare total cost per call including egress, platform fees and integration effort |
| Trusting a seam because each component passed its own tests | Mark every cross-environment seam as a trust boundary with an explicit control |
| Passing fetched content directly into the next call | Treat fetched content as data, not instructions |
| Scoping one component broadly (e.g. MCP server with wide access) | Least privilege per component; the app is only as contained as its most privileged seam |
| Shipping around a seam that cannot be secured | Escalate to a human owner |

---

## 5. Key Terms

| Term | Meaning |
|---|---|
| Accelerator | A working solution packaged so the next engagement configures it rather than rebuilding it; customer-specific parts exposed as documented parameters, assumptions written down, eval bundled |
| Agent Template | Asset bundling system prompt, tool schemas and loop structure, with domain values pulled into configuration |
| MCP Server Package | Asset bundling exposed tools, inputs and installer-controlled scope |
| Eval Suite | Graded test set plus judge rubric; also the deployment gate against a pinned baseline score |
| Contribution readiness | What a maintainer needs to verify a contribution: focused code, runnable example, test proving behavior, statement of environment assumptions, confirmed rights to contribute |
| Claude Cookbook | GitHub repository of focused reference implementations (single- or multi-pattern, working end to end) |
| Functional requirement | A checkable statement of what the system must do |
| Infrastructure requirement | Non-functional constraint on the deployment: latency, scale, residency, identity |
| Systems lifecycle | Requirements, Design, Build, Test, Deploy, Operate, Iterate |
| Gate | Decision to move from one lifecycle phase to the next |
| Deployment platform | Where a Claude workload runs: first-party Claude API, Claude Platform on AWS, Claude in Amazon Bedrock, Claude on Amazon Bedrock (legacy), Google Vertex AI, third-party platforms; differ on identity, residency, latency and cost |
| Model alias versus pinned ID | Alias (e.g. opus, sonnet) resolves to a recommended version that updates over time and can differ by platform; a pinned full model ID is a fixed snapshot; pinning prevents a silent production change |
| Data residency | A rule that a customer's data must be processed in a specific country or region |
| Trust boundary | The seam where data or instructions move from one deployment environment to another; fetched content is untrusted at the next component, so it is treated as data, not instructions |
| Least privilege | Giving each component only the access its task needs and nothing more |
| Audit log (as package part) | Record of data touched, identity acted under, and what the asset did |

Public references named in the module (time-sensitive): S1 platform.claude.com (Claude in Amazon Bedrock, Claude on Vertex AI); S2 platform.claude.com (Model IDs and versioning, Model deprecations); S3 anthropic.com and the Anthropic GitHub organization (Cookbook); S4 Building with the Claude API (Skilljar); S5 Claude Code 101 In Action (Skilljar).

Five takeaways: (1) package while the build is fresh; (2) a maintainer accepts what they can verify; (3) pin what ships; (4) measure the dimension that decides the placement; (5) mark every seam as a boundary.

---

## 6. Exam-Style Self-Test

1. Q: What is an accelerator, and what does packaging for reuse involve?
   A: A solution packaged so future engagements start from a working foundation. Separate engagement-specific code from the reusable core and expose the customer-specific parts as parameters with documented defaults.

2. Q: Name the three asset types and what each bundles.
   A: Agent Template (system prompt, tool schemas, loop structure); MCP Server Package (tools, their inputs, installer-controlled scope); Eval Suite (graded test set and judge rubric).

3. Q: Why must an accelerator bundle an audit log?
   A: A regulated reviewer asks what data it touches, what identity it acts under and what log it leaves; without these it passes a demo and stalls at the first security review.

4. Q: A team hardcoded repo path, model name, thresholds and prompt fragments. Name the three things whose absence warns the template is not reusable.
   A: No parameters where customer-specific values belong, no documentation of assumptions, no bundled eval proving it still works in a different context.

5. Q: Which four things let a maintainer verify a contribution?
   A: Code that does one thing, an example showing it running, a test proving it works, and a short statement naming the assumptions.

6. Q: What gate comes before a contribution's technical review?
   A: Licensing and attribution: confirm the right to contribute code from a customer engagement and attribute anything built on. If a constraint cannot be cleared, escalate to the owner rather than contribute.

7. Q: Why does sending a full multi-component application to the Cookbook stall?
   A: The Cookbook is set up to review one focused pattern, not an entire application. Strip the reusable pattern into a focused example.

8. Q: Which are the four infrastructure requirements that most often decide the deployment platform?
   A: Latency, scale, residency, identity.

9. Q: Place "pin the version, gate promotion on the eval" and "instrument cost, latency, and errors" in lifecycle phases.
   A: Deploy and Operate respectively.

10. Q: Why is model="opus" risky in production, and what is the fix?
    A: An alias resolves to a moving target and may differ across platforms; an upstream update becomes a silent production change with nothing to roll back to. Pin the full model ID, keep the prior pinned version, gate promotion on the eval.

11. Q: For Claude 4.6 and later vs earlier models, how does pinning differ?
    A: For 4.6 and later, the model ID alone pins to a snapshot; for earlier models the ID plus a date suffix is required (e.g. claude-haiku-4-5-20251001). Verify the current convention at platform.claude.com.

12. Q: A customer is on AWS with a residency requirement and needs rollback. What is the minimal configuration?
    A: Amazon Bedrock, an AWS identity reference, a pinned full model ID, and retention of the prior pinned version (derived from the decision table; the course checkpoint shows no key).

13. Q: Why can a laptop latency measurement mislead, and what is the correct method?
    A: It hides the round-trip penalty once the workload runs in the customer's region. Measure from the customer's actual region with their actual payload; within Bedrock, test global and regional endpoints.

14. Q: Why is token price alone a poor cost comparison?
    A: Per-token rates are broadly aligned; total cost moves on egress, platform fees and integration effort. Compare total cost per call.

15. Q: What does the course say about the trust seam between two components that each passed their own tests?
    A: It is not automatically trusted. Mark it as a trust boundary and treat fetched content as data, not instructions; scope each component to least privilege, since the app is only as contained as its most privileged seam; if a seam cannot be secured, escalate to a human owner.
