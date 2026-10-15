# Claude Code, MCP & Integration - Study Notes

Module 3 of the Anthropic Claude Developer course. Source: out-clean\03-claude-code-mcp-integration (index plus files 01-10).
Course section order: Orientation, Permission Modes & Human Gates, Durable Project Context, Packaging Workflows, MCP Servers, Enterprise Integration, Cumulative Integration Task, Key Takeaways, Glossary, Module Complete.

Conventions in these notes: configuration artifacts (settings.json, SKILL.md, .mcp.json, hook config) are shown as the course shows them. Java appears only for client-side logic the course describes in words (a hook script, an env-var preflight). Where the course states a fact only by implication, the note says so. Where the checkpoint answer is not marked in the source, the answer is derived from the course text and labeled as such.

---

## 1. Big Picture

- The recurring problem: code that works on your machine, in your session, or in staging must hold up when someone else runs it, in production, against real company systems.
- Each local convenience becomes a failure when work leaves your machine: a permission mode deletes an out-of-scope file, one rule is buried in hundreds of lines, a skill points at a path that exists on no other machine, a committed key leaks, a staging-only OAuth step breaks production.
- Claude Code runs the same agent loop as the API (Module 2) in your terminal, but adds a permission layer, a configuration system, and team-sharing features.
- MCP (Model Context Protocol) connects Claude to external services through servers that expose tools, resources, and prompts.
- The module teaches which configuration decision prevents which failure: permission mode and deny rules (what the agent may do), CLAUDE.md / rules / hooks / subagents (what it knows and how it behaves), skills / commands / plugins (how to share it), MCP transport + scope + auth (how it reaches systems), enterprise patterns (how it passes a security review).
- Single unifying question, used for modes and for human gates: what is the worst outcome if this action runs without a person checking it?

```
                      WORKS ON MY MACHINE  -->  HOLDS UP FOR OTHERS / IN PROD
                                  |
   +------------------------------+--------------------------------+
   |                              |                                |
   v                              v                                v
 WHAT IT MAY DO            WHAT IT KNOWS / HOW IT           HOW IT IS SHARED
 (permission layer)        BEHAVES (durable context)        (packaging)
 - permission modes        - CLAUDE.md (always on)          - skill (SKILL.md)
 - allow / deny rules      - rules files (paths glob)       - custom command
 - human gate by           - hooks (deterministic)          - plugin + marketplace
   worst-case cost         - subagents (isolated)           - portable paths
   |                              |                                |
   +------------------------------+--------------------------------+
                                  |
                                  v
                       HOW IT REACHES SYSTEMS
                       MCP server: tools + resources + prompts
                       transport (stdio | HTTP) x scope (local | user | project | enterprise)
                                  |
                                  v
                       ENTERPRISE / REGULATED USE
                       OAuth | env-var API key | file-system perms
                       separation + secret store + rotation
                       PostToolUse audit hook, managed settings lock,
                       data residency, scoped modernization work
```

Module learning objectives (from Orientation):
1. Run the explore, plan, code loop and select a permission mode matching the risk of the work.
2. Read AI-generated code and review output with calibrated trust; place a human review gate where a wrong call is costly.
3. Give Claude Code durable context using CLAUDE.md, rules instruction files, hooks, and subagents.
4. Package a workflow as skills, custom commands, and a plugin; author a skill once that runs across Claude Code, the Messages API, and the Agent SDK.
5. Build an MCP server exposing tools, resources, and prompts; pick the transport; set the configuration scope.
6. Connect Claude to enterprise systems, authenticate using patterns a regulated customer accepts, scope a code modernization engagement for a security review.

Source gap: Objective 2 and Key Takeaway 2 (AI code review as findings to triage, calibrated trust) are stated, but no teaching section in this module's source files covers code-review triage beyond the human-gate placement material. Nothing further is available to note.

Target reader: a Developer who already has Claude working in code (assumes Module 2 patterns; does not re-teach the agent loop, tool schemas, or context engineering).

---

## 2. Section: Permission Modes & Human Gates (17 min)

### Key ideas

- Explore, plan, code: Claude Code reads files and traces logic first (explore), then creates a plan (a structured description of intended edits), and only after you review and approve the plan does it write and execute changes (code).
- Why it matters: better output (fewer assumptions, catches downstream effects) and it is where permission modes plug in. Plan mode holds Claude Code in the explore phase, blocking all file edits and shell commands until you release it; a useful default for unfamiliar codebases or high-stakes work.
- Permission modes control how often Claude Code stops to ask for confirmation; each mode trades speed against oversight. Choice depends on how well you know the codebase and how reversible the changes are.

Modes (as the course describes them):

| Mode | Auto-approves | Still gates | Limitation / use |
|---|---|---|---|
| default | Reads only; prompts before nearly every edit or command | All file edits and shell commands | Safe but slow on trusted work; baseline for new project or unfamiliar codebase |
| acceptEdits | Reads, file edits, and common filesystem commands (mkdir, touch, rm, rmdir, mv, cp, sed) inside the working directory | All other shell commands; writes outside the working directory; writes to protected paths | Trusted local work where shell execution needs a human eye; not for an agent that must run scripts |
| plan | Reads only; researches and proposes, makes no edits | All file edits and shell commands until you approve a plan | Exploration and planning on sensitive or unfamiliar codebases; not for tasks that must write output |
| auto | Everything, but a separate classifier reviews each action first and blocks escalation beyond your request, unrecognized infrastructure, or actions driven by hostile or inappropriate content | Production deploys and migrations, mass deletes, credential exfiltration, force-push to main are blocked by default | Reduces prompts, does not guarantee safety; a research preview; availability depends on plan, model version, admin settings; verify requirements before build |
| (locked-down mode; name not shown) | Only tools pre-approved in an allow rule, plus read-only commands; auto-DENIES everything else | Every tool call not on the allow list is denied; no confirmation queue | Built for locked-down CI and scripts; not a way to reduce friction on local interactive work |
| bypassPermissions | All tool calls; no prompts and no safety checks | Nothing normally; only catastrophic deletes such as `rm -rf /` and `rm -rf ~` trigger a last-resort prompt | Only inside an isolated container or VM that is disposable; never on a developer workstation against a live codebase |

Source gap: the course shows the modes as unlabeled tabs. Names default, acceptEdits, plan, auto, and bypassPermissions are given elsewhere in the text; the fifth mode (auto-denies everything not on an allow list) is never named in the source.

Where configuration lives (scope of each level):

| Level | File | Applies to |
|---|---|---|
| User | `~/.claude/settings.json` | Every project on the machine; personal preferences |
| Project | `.claude/settings.json` (committed) | Everyone who clones the repo; team conventions, allow rules, deny rules for untouchable paths |
| Local project | `.claude/settings.local.json` | Personal overrides for one project; automatically git-ignored |
| Enterprise | `managed-settings.json` (set by administrators) | Cannot be overridden by users or project files; org-wide security controls |

- Allow and deny rules layer on top of the selected mode. A deny rule always wins over an allow rule regardless of mode.
- The most durable governance control is an enterprise-level deny rule: no individual developer can remove it, and it applies even when a bypass mode is set.

Placing the human gate by worst-case cost:
- Permission modes and deny rules decide what the agent can do without asking; they do not decide where a human still has to look.
- Question: what is the worst outcome if this action runs without a person checking it? Lower cost of being wrong, more you can let through; higher cost and harder to undo, the more it needs a human gate before it executes.
- Applies whether the agent writes code or runs unattended (for example a bot that comments on or blocks a pull request).
- Three placements:
  1. Let low-stakes, reversible actions through without a gate (formatting fix, edit confined to the working directory). This is what `acceptEdits` is built for.
  2. Gate any action that is hard to undo or reaches a sensitive path: write outside the working directory, destructive shell command, edit to a security-relevant or protected file. A deny rule enforces this deterministically; default or plan mode keeps the prompt in place while you decide.
  3. Never let the agent be the only gate on a change to code your team has marked sensitive. The agent's work is an input to a human decision; a person must review before merge no matter how confident the agent or its own review sounds.
- Mode and gate are the same decision from two sides: the mode sets the session default; the gate overrides it for the one action whose cost is too high for the default.

Cost / Complexity / Risk:
- Cost: default mode on trusted work adds prompt latency to every tool call, accumulating on a long refactor.
- Complexity: multiple settings levels and an override hierarchy need consistent care; an enterprise deny that contradicts a project allow must be understood by everyone maintaining the config.
- Risk: wrong mode for the context. Bypass set out of impatience on a non-isolated machine removes every safety prompt and, unlike other modes, also removes the protected-path guard.

### Rules and traps

- Trap: switching to bypassPermissions "because the work felt routine".
- Case (Watch Out): a rename of `/v1/legacy/` endpoint references, 47 files found. The pattern also matched files in `/deploy/config/prod/`; a post-rename `cleanup.sh` script deleted 3 production override files with no confirmation.
- The precise gate location: the script invocation would have prompted in default or acceptEdits, not `rm` by itself. acceptEdits auto-approves `rm` on paths inside the working directory; had Claude issued the deletions directly as `rm`, acceptEdits would have let them through silently. Only default mode prompts for those.
- Bypass also skips the protected-path guard the other modes keep, so even repo state and Claude's own configuration lose their automatic prompt.
- Fix: set a deny rule on sensitive directories BEFORE switching modes. For fewer prompts without losing the safety net, use a classifier-gated mode (auto) instead of full bypass.
- A deny rule on a path is deterministic; a mode is only a default.

Settings pieces the course uses (native JSON):

```json
{ "permissions": { "allow": ["Bash(npm run:*)"], "deny": ["Bash(rm:*)", "Bash(git push:*)"] } }
```

```json
{ "permissions": { "deny": ["Read(.env.production)"] } }
```

Corrected settings from the cumulative task (acceptEdits plus a deny rule):

```json
{ "permissions": { "defaultMode": "acceptEdits", "deny": ["Read(.env.production)"] } }
```

---

## 3. Section: Durable Project Context (20 min)

### Key ideas

CLAUDE.md
- File named CLAUDE.md at the project root; read at the start of every session; contents appended to your prompt before any message from you arrives.
- `/init` scans the codebase and generates a starter CLAUDE.md. Good baseline; validate it before using. Refine to hold: testing commands, framework conventions, paths the agent should not touch, style decisions that differ from defaults.
- Size is the main failure mode: a larger file consumes more context window and makes any single instruction a smaller fraction of what loads, reducing the chance the agent follows the one rule that catches a real mistake.
- Keep only constraints that change behavior; move everything else into Skills that load on demand.
- Glossary figure: files that grow beyond roughly 200-300 lines risk diluting critical rules.

Rules instruction files
- Live in `.claude/rules/`; scoped to specific paths with a `paths` glob in YAML frontmatter. A path-scoped rule loads only when Claude Code works with files matching the pattern.
- Scoping comes from the frontmatter, not file placement. Subdirectories (for example `.claude/rules/database/`) are organizational only. A rules file without `paths` loads unconditionally at launch, with the same priority as CLAUDE.md, wherever it sits.
- Division of labor: broad, universal constraints (for example "never modify the database schema") go in CLAUDE.md; narrow ones (for example "all SQL in the database module must include an explicit transaction boundary") go in `.claude/rules/database.md`.

The course's frontmatter example (rendered here as multi-line YAML; the source text is flattened to one line):

```
---
paths:
  - "src/db/**/*.sql"
---
```

Source gap: the source shows the frontmatter on a single flattened line (`--- paths: - "src/db/**/*.sql" ---`); the multi-line layout above is the standard YAML reading of it.

Hooks
- A hook intercepts and controls tool calls before or after they execute. A CLAUDE.md rule ("run Prettier after every edit") is followed most of the time; a hook happens every time because it fires independently of what the model decides.
- Defined in settings files and configured using the `/hooks` command. Each hook has: a lifecycle event, an optional matcher scoping it to tool types, and a command that runs when the event fires.

| Event | When it runs | Notes |
|---|---|---|
| PreToolUse | Before a tool call executes | Can examine the call and exit with code 2 to block it; writes reason to stderr as feedback the agent sees. Enforces access controls at the config layer |
| PostToolUse | After a tool call completes | Cannot block (call already happened). For side effects: formatter after edit, tests after change, audit logging |
| UserPromptSubmit | When you submit a prompt, before the model processes it | Inject context or validate the request before work starts |
| Stop | When the model finishes responding | Notifications, cleanup, committing the audit log |
| Notification | When Claude Code sends a notification: needs permission for a tool, or idle for 60 seconds | Route signals to an external channel or log |
| SessionStart | When a session starts or resumes | Initialize state, validate env vars, confirm required services are reachable |
| SessionEnd | When a session ends | Teardown, final audit writes, session-closed notifications |

- A PreToolUse hook blocking edits to a production config path enforces the constraint at every tool call during every session, regardless of permission mode. That is the difference between a guardrail and a convention.

Hook configuration shape (from Checkpoint 2; correct blanks filled in; the command value is a placeholder, the course describes the script only in words):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [{ "type": "command", "command": "<script that checks the path and exits 2 for .env.production>" }]
      }
    ]
  }
}
```

Java sketch of the guard script's logic (client-side; stdin is treated as opaque text because the source does not specify the payload schema):

```java
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class BlockEnvProduction {
    public static void main(String[] args) throws IOException {
        // Read the whole tool call from stdin (payload format not specified in the course).
        String toolCall = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);

        if (toolCall.contains(".env.production")) {
            // Reason goes to stderr: that is the feedback the agent sees.
            System.err.println("Blocked: reading .env.production is not allowed.");
            System.exit(2);   // exit code 2 blocks the tool call in a PreToolUse hook
        }
        System.exit(0);       // anything else proceeds
    }
}
```

Subagents
- A specialized assistant Claude Code delegates to; runs a task in its own separate context and returns only its output. It does not inherit main conversation history, accumulated files, or session state; starts from a clean slate.
- Built-in subagents differ in what they load. Explore and Plan skip CLAUDE.md and git status (fast and cheap), so project rules are not in their context. The general-purpose subagent loads both. Check the current list in the Claude Code docs; the set has grown, but this split holds across versions.
- If project constraints must be respected, use the general-purpose subagent or a custom subagent that explicitly loads the rules it needs.
- Custom subagents (defined in `.claude/agents`) do not automatically see skills; list the needed skill in the agent's front matter. Built-in agents have no preloaded skills; for skill-backed behavior, create a custom subagent listing those skills.

Mechanism map:

| Mechanism | What it loads | When it runs | Context cost | Belongs here |
|---|---|---|---|---|
| CLAUDE.md | Full file prepended at session start | Every session, unconditionally | Persistent; dilutes with size | Universal constraints, commands, framework decisions |
| Rules file | File contents; scoped by `paths` glob; without `paths` loads like CLAUDE.md | When Claude reads a file matching `paths`; unscoped at session start | Path-scoped: only when triggered; unscoped: same as CLAUDE.md | Path-specific guidance that would be noise elsewhere |
| Hook | Runs your script at the event; no content added to context | At the configured event | Minimal: only script output if routed back to Claude | Enforced guardrails, automated side effects, audit logging |
| Subagent | Task context only; isolated | When dispatched for a delegated task | Returns a summary, not full task history | Exploration, investigation, output that would bloat main context; parallelizable tasks |

- Handles well: projects you return to across many sessions (stable rules, per-directory variation, unconditional guardrails).
- Use a different approach: one-off tasks you will not revisit; setup overhead is not warranted.

### Rules and traps

- Trap: CLAUDE.md that keeps growing because each addition feels reasonable.
- Case (Watch Out): 847-line CLAUDE.md after two months of team additions. Layout: framework preferences (lines 1-40), testing (41-90), style guide (91-210), dependency rules (211-320), path restrictions (321-360; the rule was at line 347), historical decisions log (361-700), archived notes (701-847). Prompt said do not modify `/legacy/tokens/`; the agent still edited `/legacy/tokens/store.ts` to update the token interface and did not flag the conflict.
- Diagnosis: the rule was present and accessible; the failure was dilution (846 other lines reduced its weight). History logs and archived notes did not belong in CLAUDE.md.
- Fixes: CLAUDE.md is a working set of rules, not an append log. Path-specific rule goes in a rules file; historical context goes in a separate reference document read on demand. Audit when it grows past a few hundred lines. The one rule you cannot afford to dilute should be the shortest path to a hook.
- PostToolUse cannot block; use PreToolUse (exit 2) to block.
- Explore/Plan subagents will not see CLAUDE.md rules.

---

## 4. Section: Packaging Workflows (8 min)

### Key ideas

Skills
- A skill is a portable Markdown file (`SKILL.md`) in `.claude/skills`. Front matter identifies the skill and describes when it applies; body holds the steps.
- The same skill can run in Claude Code, be invoked through the Messages API, or be loaded by the Agent SDK. The file does not change; where it runs, how it loads, and what it may touch change.

| Runtime | How the skill loads | Where steps run | What to know |
|---|---|---|---|
| Claude Code | Discovered from `.claude/skills` on the filesystem; loads on a description match or when invoked by name | Your terminal session, against local files, under the active permission mode and deny rules | Filesystem-based; governed by the settings layer |
| Messages API | Sent with the request; runs inside the code execution container. Requires code-execution and skills beta headers | Anthropic's code execution container, not your machine | A skill assuming local files or tools will not behave the same |
| Agent SDK | Loaded by the agent the SDK runs; whether filesystem settings (CLAUDE.md, skills) load is controlled by `settingSources` (TypeScript) / `setting_sources` (Python). Always set explicitly; do not rely on a default; confirm current default against the Agent SDK reference | The process the SDK runs, i.e. your environment, once filesystem sources are loaded | Common surprise: a skill that worked in Claude Code does nothing under the SDK because settingSources was never set |
| Managed Agents | Defined once as an API resource naming model, system prompt, tools, MCP servers, and skills; Anthropic loads the skill server-side; no filesystem discovery on your side | A sandbox Anthropic provisions; your app sends user events and reads streamed results | Public beta; requires the `managed-agents-2026-04-01` beta header; sessions stored server-side, so not currently eligible for Zero Data Retention or HIPAA BAA coverage. Skills attach when defining the agent resource, not at session time; update the agent definition to change skills |

Three portability rules
1. Write the description as the matching criterion. The model loads a skill by comparing your request to its description; a vague description fails to load in every runtime.
2. Do not assume a local filesystem or local tools inside the skill body. A skill that shells out to a local command works in Claude Code but breaks on the Messages API (container without that command). Confine steps to what the runtime guarantees, or document the dependency.
3. Subagents do not inherit skills (same as Module 2). List the skill for the subagent explicitly, in every runtime that supports subagents.

- Table summary: Handles well - a task-specific procedure authored once and reused across terminal, API integration, headless SDK job. Adds complexity - each runtime loads and sandboxes differently (beta headers on API, settingSources on SDK). Different approach - for instructions that must apply to every session, CLAUDE.md is still right; skills are on-demand, portable procedures.

Custom commands and plugins
- Custom command = a shortcut for a defined procedure. In current Claude Code, skills are the recommended format for both explicit and automatic invocation: invoke directly with `/skill-name`, or Claude loads it automatically when relevant. The older `.claude/commands/` directory still works but is legacy.
- For a workflow that only runs when you call it, use a skill with `disable-model-invocation: true` in the frontmatter.
- Plugin commands are namespaced automatically: plugin name becomes the prefix. A `run-tests` command in a plugin named `payments` is invoked as `/payments:run-tests`. Two plugins can both ship `run-tests` without collision. Treat the plugin name as part of the interface; renaming the plugin renames every command.
- A plugin bundles skills, hooks, subagents, and MCP servers into one installable unit, distributed through a marketplace (a catalog of plugins others created and shared). The official Anthropic marketplace is available automatically at start; add third-party marketplaces hosted in a GitHub repository with `/plugin marketplace add <owner/repo>`. Teammates then run one install command to get the same setup. A plugin replaces a page of manual steps with a versioned, auditable install.
- Placement: skills go in a skills directory; hooks, subagents, and settings go in their respective locations. The plugin manifest describes the bundle; the install command wires it into the target installation. Plugins can be installed by individuals or enterprise-wide.
- Enterprise: administrators deploy plugins organization-wide through managed settings. A managed marketplace allowlist gates which marketplace sources users may add; it restricts what users can add but does not register marketplaces automatically. To push a marketplace to all users without them running the add command, pair the allowlist setting with `extraKnownMarketplaces` in managed settings. Managed scope sits above user and project settings, so a plugin deployed there takes priority and cannot be overridden. Review the reference layer for exact setting names.

Source gap: the course does not show a plugin manifest file, its filename, or the install command text (it says "a simple install command" and "the plugin manifest describes the bundle"). No manifest example can be given from the source.

Packaging decision table:

| Layer | What it is | Who | When |
|---|---|---|---|
| Skill | Markdown file in `.claude/skills`; loads on description match or by name | Individual or team using Claude Code interactively | Procedure should stay out of context until needed (PR review, deployment checklist) |
| Custom command | Named shortcut that runs a defined procedure when invoked explicitly | Developers wanting a predictable entry point for high-frequency procedures | Procedure has a clear name and you want to trigger it directly rather than rely on description matching |
| Plugin | Versioned bundle of skills, hooks, subagents, MCP servers distributed via marketplace | Team wanting one-step install of a shared, versioned setup | A working setup lives on one machine and must be shared, versioned, consistent across a team |

Cost / Complexity / Risk:
- Cost: skills add context cost on activation; a plugin adds install and maintenance overhead. Pay setup once (plugin install) rather than repeatedly (manual steps by each developer).
- Complexity: absolute paths in a plugin's skills install fine for the author and fail for everyone else; any path or environment assumption in a skill or hook command is the likeliest cross-machine break.
- Risk: a plugin carries only the components it bundles. A deny rule or hook the author relied on locally is NOT included unless explicitly listed in the bundle; a guardrail not bundled does not protect a teammate.

### Rules and traps

- Install success is not execution success: install copies files; execution resolves paths and variables against the running machine.
- Case (Watch Out): deployment-workflow skill packaged as a plugin and passed local testing; every teammate's install succeeded, every run failed. Root cause 1: SKILL.md command pointed at `/Users/alexmorgan/projects/deploy-utils/validate.sh` (exists only on the author's machine). Root cause 2: another skill used env var `DEPLOY_TOKEN` set in the author's shell profile and never mentioned in the README; three teammates spent two hours debugging.
- The absolute path is visible as plain text in review; the env var is dangerous because nothing in the package announces the dependency.
- Fixes: path references must be relative to the project root or use an env var base path. `$CLAUDE_PROJECT_DIR` for scripts stored in the project; `${CLAUDE_PLUGIN_ROOT}` for scripts bundled inside the plugin. Bundle or share every script/config/asset the plugin depends on. Document every required env var and validate it at install time so a missing one surfaces immediately. Test the install on a clean machine before distribution.

Java sketch of an install-time env-var validation (the course says to validate at install time; it gives no mechanism, so this is only the logic):

```java
import java.util.List;

public class RequiredEnvCheck {
    public static void main(String[] args) {
        // Every env var the plugin needs must be listed here AND documented in the README.
        List<String> required = List.of("DEPLOY_TOKEN");
        boolean ok = true;
        for (String name : required) {
            String value = System.getenv(name);
            if (value == null || value.isBlank()) {
                System.err.println("Missing required environment variable: " + name);
                ok = false;
            }
        }
        System.exit(ok ? 0 : 1); // fail at install time, not mid-run
    }
}
```

Broken SKILL.md from Checkpoint 4 (frontmatter shown as multi-line; the source is flattened):

```
---
name: deploy-validate
description: Validates a deployment configuration before release.
---
## Steps
1. Run the validation script: /Users/alexmorgan/projects/deploy-utils/validate.sh
2. If the script exits with a non-zero code, report the error to the developer.
3. If validation passes, confirm the deployment configuration is safe to proceed.
```

---

## 5. Section: MCP Servers (21 min)

### Key ideas

What an MCP server is
- Wiring a tool directly: schema and functionality live in one application's code; three applications needing the same service each maintain their own integration.
- MCP separates tool definitions from applications into a process called a server. An MCP server exposes tools, resources, and prompts to MCP clients. Claude Code has a built-in MCP client; it discovers the server's tools and can invoke them during a session. Build once; every client gets access.

Tools, resources, prompts
- Tool: an action the model can call.
- Resource: read-only data the server exposes for the client to fetch and place into context directly (not via a model tool call). Requested by address. Two forms: direct resource (fixed address, no parameters, e.g. list of available documents) and templated resource (parameter in the address, e.g. a document address taking a document identifier). Use when you want known data in context from the start of a turn and pulling it in is cheaper and more predictable than a tool call. Resource support varies across MCP clients; verify your client can inject resources into context before relying on this.
- Prompt: a pre-written instruction template the server exposes so a client can invoke a vetted prompt by name. Useful when specific wording materially improves results and you want every client to get the same quality; maintained in one place and reused everywhere.

Transport (client to server channel)
- stdio: server runs as a local process on the same machine; client launches it as a subprocess and talks over standard input/output. Right for local tools, personal scripts, a dev server on your machine. Does not work for sharing across a team or remote hosting.
- HTTP: recommended for any server that is not local. You provide the URL; the client connects over the network. Shared team servers and hosted integrations use HTTP.
- SSE (Server-Sent Events): older transport that predates HTTP transport; superseded and no longer recommended for new servers. Treat as legacy if encountered.

Context cost of connected servers
- Each connected server contributes tool definitions. By default Claude Code defers these and uses a search step to discover and load relevant tools only when a task needs them; only called-for tools enter context.
- Opt-in mode loads definitions upfront when they fit within roughly 10 percent of the context window, deferring only when exceeded.
- Either way, connect only the servers you need.

Prompt caching (taught in this section as the cost lever)
- Caching stores processing work for a stable prefix so a follow-up request reuses it. The first request writes the prefix; follow-ups send identical content up to the same point at a fraction of the cost. Content must match exactly: a single changed character before the cache point invalidates the cache. Best candidates: long system prompt, large set of tool definitions, a reference document asked about repeatedly.
- No global setting; you mark a cache breakpoint. In the Messages API, add a `cache_control` field of type `ephemeral` to the last block to cache; it caches everything up to and including that block. Up to four breakpoints.
- Processing order is tools, system prompt, messages; a breakpoint after tools caches tool definitions while messages stay dynamic.
- Default lifetime: five minutes from the last read (each read resets the clock). Opt-in one hour: set a `ttl` of `1h` on the breakpoint. Suits longer gaps between requests (for example an agent that pauses between steps); if the window expires you pay the write cost again for no read benefit.
- Minimum token threshold applies (1,024 tokens for most current models); shorter prompts are not cached even if a breakpoint is set.

Snippet showing the fields the course names (the exact surrounding request shape is not given in the course; field names and values are as stated in the prose):

```
cache_control: { "type": "ephemeral" }         // on the last block to cache
cache_control: { "type": "ephemeral", "ttl": "1h" }   // opt-in one-hour lifetime
```

Source gap: the course describes `cache_control` (type `ephemeral`) and `ttl` of `1h` in prose only; the exact JSON nesting inside a request is not shown, so the lines above are field illustrations, not a full request.

RAG (retrieval-augmented generation)
- A model reads everything in its context window each request; loading all reference documents up front uses context and leaves less room for work. RAG stores material outside the window, finds the most relevant parts for the current request, and supplies only those.
- Classical RAG: upfront work. Source is split into chunks; each chunk converted to an embedding (numbers capturing meaning) stored in a database. At question time the question is converted the same way and the chunks with the most similar numbers are fetched. Analogy: a librarian who pre-wrote summary cards for every chapter.
- Agentic search: no upfront indexing, no pre-built database. The model decides what it needs when asked and fetches it live (searching sources, reading documents on demand). Analogy: a researcher who goes and finds the answer. Examples: Claude Code loading only the MCP tools a task needs; Claude.ai Projects surfacing only relevant document sections when the knowledge base exceeds the active window.
- Difference is timing: classical RAG matches against an index built in advance; agentic search searches at the moment of need.
- Two properties: it scales (per-request cost stays roughly flat as the source grows); it is only as good as what it finds (if retrieval misses the document, the model never sees it). Organization matters: descriptive names ("Q3 refund policy, updated August 2024") beat vague ones ("notes_final_v3.pdf"); group related files.

Configuration scope: who loads the server

| Scope | Where config is stored | Who sees it | Right for |
|---|---|---|---|
| Local | `~/.claude.json` under the current project's path | Only you, only that project; not shared | A server tied to one project context you are not ready to commit; tooling relevant to one project |
| User | Your personal Claude settings | You, across all your projects; teammates do not see it; not in the repo | Personal utility used in every project (local DB tool, a script) |
| Project | `.mcp.json` at the repo root | Everyone who clones the repo, when committed | Server the whole team accesses; config travels with the code |
| Enterprise | Centrally managed configuration controlled by an administrator | All users in the org without individual steps | Shared internal services, security tooling, anything that must be present org-wide |

- Project-scope caveat: a project-scoped server runs from each teammate's machine. For a stdio server, the committed config stores the launch command and every clone spawns its own local subprocess, so each teammate needs the runtime (such as Node for an npx-launched server) installed.

Permission rules for a single MCP tool
- An MCP tool is identified in a permission rule as `mcp__server__tool`. An allow rule on `mcp__github__create_issue` lets that one tool run without a prompt while other tools on the GitHub server still prompt. A deny on a write-capable tool blocks it while read-only tools stay available. A deny on one tool overrides an allow on the server.
- API MCP connector: an `mcp_toolset` object lets you set an `enabled` flag per tool, so you register a server but expose only specific tools to the model.
- Difference: a permission rule decides whether an exposed tool may run (governance control); the enabled flag decides whether the model sees the tool at all (context-cost and scope control). Often used together. Verify exact rule syntax and the connector beta header against the docs before publishing.

The GitHub MCP server (worked example)
- Remote server maintained by GitHub: repository management, reviewing pull requests, opening issues, searching code. Uses HTTP transport (hosted remotely); you register it by giving the URL.
- Scope: project scope when the whole team needs the same repository tooling; local scope when only you need it.
- Authentication: Personal Access Token generated in GitHub, passed as a Bearer token in the request header of the MCP config. The token must be supplied through an environment variable and referenced in the config; never inline in `.mcp.json` (committed content enters history and overwriting does not remove it).
- OAuth contrast: used where the service authenticates individual users via a browser sign-in flow. Linear is the example: on first connect the client redirects to Linear's sign-in page; after you approve, a token is issued and stored automatically; no credential copied by hand. Right when the service's authorization model is tied to user identity.
- GitHub = service credential you generate and store; Linear = sign-in flow handles the credential. Both are remote HTTP servers and follow the same transport and scope logic; only authentication differs.

MCP setup reference

| Context | Transport | Scope | Config location | Secrets handling |
|---|---|---|---|---|
| Personal local tool (your machine only) | stdio | Local | `~/.claude.json` (per-project entry) | Environment variables only; never in config file |
| Shared team server | HTTP | Project (`.mcp.json`) | `.mcp.json` committed to repo root | OAuth or env variables; API keys never committed to `.mcp.json` |
| Personal experiment (not ready to share) | stdio or HTTP | Local | Personal Claude settings | Environment variables only |
| Organization-wide (admin-managed) | HTTP | Enterprise | Managed settings (admin-controlled) | Secrets managed by administrator; config locked to prevent override |

Cost / Complexity / Risk:
- Cost: each connected server adds tool definitions to the context window; load only the servers a task needs.
- Complexity: transport and scope are independent but interact. A stdio server cannot be project-scoped for sharing because it runs on only one machine. Match transport to where the server runs before choosing scope.
- Risk: committing an API key inside `.mcp.json` is the most common mistake in this section; rotating later is not enough to remove the exposure.
- Handles well: a reusable integration used across sessions and shared with a team, stable enough to maintain as a separate process (GitHub server). Different approach: a one-off task where tool logic can live in the codebase; for a single-project integration used by one person, wiring the tool directly in the API call may be simpler.

Source gap: the course gives no CLI command for registering an MCP server and no `.mcp.json` example beyond the HTTP server shape shown below; do not assume `claude mcp add` flags from this module.

### Rules and traps

- Case (Watch Out): data-warehouse MCP server, service-account API key placed directly in `.mcp.json` during setup with a plan to move it later. The file was committed; within 48 hours three teammates had cloned and a CI pipeline had made a fresh clone; the key sat on the local machine, repository history, three teammate machines, and the CI runner's file system. Moving it to an env var in a later commit did not remove it from history; the service account had to be rotated; rotation broke two external services using the same key and took three hours to fix.
- Overwriting the file in a later commit only removes the key from the current version. Any credential written inline in a committed file must be treated as compromised and rotated.

Before (do not use):

```json
{ "type": "http", "url": "https://warehouse.internal/mcp", "headers": { "Authorization": "Bearer sk-abc123..." } }
```

After (correct):

```json
{ "type": "http", "url": "https://warehouse.internal/mcp", "headers": { "Authorization": "Bearer ${WAREHOUSE_MCP_TOKEN}" } }
```

- Two-layer prevention against the agent writing credentials into committed files:
  1. A convention in CLAUDE.md stating credential values must never be written inline to `.mcp.json` (communicates intent).
  2. A PreToolUse hook inspecting write and edit operations against `.mcp.json` for patterns that look like inline credentials and exiting with a code to block when one is found (enforces deterministically).
- This is the hook-versus-instruction distinction from the durable-context section.

Source gap: the source sentence says the hook "exits with code to block the operation"; the number is omitted there (the Durable Context section gives exit code 2 for PreToolUse blocking).

---

## 6. Section: Enterprise Integration (18 min)

### Key ideas

Prototype vs enterprise
- A prototype answers "does the connection work?". A production enterprise integration must also answer: who is the model acting as and is it auditable; what data can it access and where does it leave the organization; can an administrator lock the configuration; can access be logged to satisfy a compliance audit. Treating these as part of design separates a demo from something deployment-ready.

Authentication patterns by service type
- Remote service with user identity (cloud, SaaS): OAuth. The MCP server returns a 401 Unauthorized to signal authentication is required; the client starts a browser-based sign-in flow; after approval a token is issued and stored; no secret copied by hand. Linear uses this; GitHub, by contrast, uses a personal access token passed as a header.
- Remote service with service identity (internal API): an API key passed through an environment variable. The key identifies the service account; never committed to a config file; lives in the environment at the point of execution. For a CI pipeline using the Agent SDK, the key is injected as a secret by the pipeline runner, not baked into code.
- Local service (file system, local DB): stdio with no network authentication. The security boundary is the file-system permission model; a deny rule in the settings files is the governance layer.

Source gap: the three auth patterns appear as unlabeled tabs in the source; the labels above (user identity, service identity, local) are taken from the checklist table later in the same section.

Secret management: three practices
1. Separation: a credential never travels with the configuration that references it. The config holds a variable reference; the value lives elsewhere. Config files get committed, shared, cloned; an inline value rides along with every copy and enters history.
2. Where the value goes: for one machine or one pipeline run, an environment variable injected at the point of execution (CI runner sets it as a secret; config reads it by name; nothing written to disk). For values several services or people need, a secret store: a managed service that holds credentials, returns them to authorized callers at runtime, and records who read what; centralizes the value so one rotation updates every consumer. Env var when the secret is local and short-lived; secret store when shared or must be audited.
3. Rotation: replace a credential on a schedule and immediately after any suspected exposure. A leaked key cannot be made secret again. A value baked into committed code cannot be rotated cleanly (old value stays in history, hardcoded consumers break). A value read from a secret store or env var rotates without touching code because the name stays the same.
- Two habits make rotation cheaper: scope each credential to the narrowest access its task needs; keep a record of which services use each credential so rotation does not surface its consumers by breaking them.
- Store service-account keys in a secret manager rather than files.
- Summary: separation keeps the value out of the file; a secret store or env var gives it a home; rotation helps recovery only when the first two are held.

Regulated industries add
- Where data is processed, how access is logged, and whether an administrator can lock configuration during an audit window.
- Config lock: enterprise managed configuration, an administrator-deployed server configuration that users cannot override, so auth setup is consistent across the org.
- Logging: a PostToolUse hook that logs every tool call and its parameters to an audit store; fires deterministically, the model cannot skip it.
- Data residency: a server configured with an HTTP endpoint in a specific region, combined with a platform deployment that pins processing to that region, gives a checkable answer to where data goes. The infrastructure requirement and platform choice matter at audit time, not just build time.

Code modernization as the test case
- Legacy change carries high blast radius, unpredictable dependencies, limited reversibility. Tools address each risk when applied before work starts:
  - explore, plan, code loop is the core workflow; plan mode holds the agent in the read-only explore phase so you can review proposed edits, spot paths you did not expect, and push back before any file is modified;
  - hooks enforce guardrails preventing edits to specific paths in sensitive phases;
  - CLAUDE.md carries conventions for the new target patterns so the agent does not drift back to legacy patterns in surrounding code.
- Three scoping questions before the session starts:
  1. What is the blast radius: which systems depend on the code being changed, and what breaks downstream if an edit is wrong?
  2. How are changes audited: is a PostToolUse hook logging every tool call, and does that log satisfy the reviewer?
  3. Who approves each phase before the next begins? Plan mode enforces the explore/execute boundary, but the approval decision is yours to define and document before work begins.
- These apply to any high-risk agentic task; modernization just surfaces them clearly.

Authentication and integration checklist

| Service type | Auth method | Where secrets live | What gets logged | Who can lock the config |
|---|---|---|---|---|
| Remote with user identity (SaaS, cloud) | OAuth | Token issued by OAuth provider and stored by client | PostToolUse hook to audit log | Administrator via enterprise managed settings |
| Remote with service identity (internal API) | API key in environment variable | Environment only; never in committed config | PostToolUse hook to audit log | Administrator via enterprise managed settings |
| Local (file system, local DB) | File-system permissions | No credential needed; deny rules enforce path access | PostToolUse hook to audit log | Deny rules in enterprise managed settings |

Cost / Complexity / Risk:
- Cost: OAuth adds a one-time setup step per user per service; API key management needs a rotation process; PostToolUse audit logging adds small overhead to every tool call.
- Complexity: regulated environments add requirements absent from a prototype; identify them during scoping.
- Risk: concentrates when a prototype moves toward production. Hardcoded credentials, no audit log, and no central lock will not pass a regulated customer's security review.
- Handles well: integrations touching regulated data where tooling already supports enterprise managed settings and audit hooks. Adds complexity: teams unfamiliar with OAuth or enterprise secrets management; needs security/IT coordination and timeline allowance. Different approach: a prototype that will never see production data (but env-var habit for secrets costs nothing).

### Rules and traps

- Case (Watch Out): OAuth worked end to end in staging, failed in production. Error: redirect URI mismatch. The app was registered for `staging.mycompany.com`; `production.mycompany.com` was not on the allowed list, so every sign-in hit the URI check, failed, and looped back to the sign-in screen. Not a code defect; a per-host, per-environment configuration step.
- Second issue the reviewer flagged: most enterprise customers require separate OAuth app registrations per environment, so reusing one registration across environments is a problem.
- Fix: before moving an OAuth-authenticated MCP integration to a new environment, add the new host's redirect URI to the registration; verify whether separate registrations are required; put the registration step in the deployment checklist.

---

## 7. Section: Cumulative Integration Task (12 min, two parts)

### Key ideas

- Three planted bugs, one per layer: Claude Code configuration, plugin/packaging, MCP/authentication. For each file, identify the bug and write one sentence on what it does or fails to do at runtime. Part 2: write corrected versions of all three files.

Part 1 (find the bugs). Files as given:

File 1: `.claude/settings.json`

```json
{ "permissions": { "defaultMode": "bypassPermissions", "deny": ["Read(.env.production)"] } }
```

File 2: `.claude/skills/migration-validate/SKILL.md`

```
---
name: migration-validate
description: Validates migration scripts before they run against production.
---
## Steps
1. Run: /Users/priya/scripts/validate-migration.sh
2. Report validation results.
```

File 3: `.mcp.json`

```json
{ "mcpServers": { "data-warehouse": { "type": "http", "url": "https://warehouse.internal/mcp", "headers": { "Authorization": "Bearer sk-prod-warehouse-abc123" } } } }
```

Model answer, as the course states it:
- File 1: `defaultMode` is `bypassPermissions`; removes every confirmation prompt on a production workstation, including for destructive operations. The deny rule for `.env.production` is correct; only the mode is wrong.
- File 2: step 1 uses an absolute path that exists only on the author's machine and will not resolve on any teammate's machine after cloning.
- File 3: the API key is committed inline in the Authorization header; it enters repository history where overwriting the file cannot remove it; treat it as compromised.

Part 2 (corrected files):

```json
{ "permissions": { "defaultMode": "acceptEdits", "deny": ["Read(.env.production)"] } }
```

```
---
name: migration-validate
description: Validates migration scripts before they run against production.
---
## Steps
1. Run: $CLAUDE_PROJECT_DIR/scripts/validate-migration.sh
2. Report validation results.
```

```json
{ "mcpServers": { "data-warehouse": { "type": "http", "url": "https://warehouse.internal/mcp", "headers": { "Authorization": "Bearer ${WAREHOUSE_MCP_TOKEN}" } } } }
```

- Course rationale: acceptEdits auto-approves file edits and common filesystem commands but gates destructive shell commands, the right tradeoff for a production migration workstation. `$CLAUDE_PROJECT_DIR` resolves from the project root on any machine after cloning. The env-var reference keeps the credential out of repository history.
- Caution from the earlier section: acceptEdits auto-approves `rm` on paths inside the working directory. "Gates destructive shell commands" refers to commands other than the filesystem set listed for acceptEdits; the deny rule remains the deterministic protection.

---

## 8. Section: Key Takeaways, Glossary, Module Complete

Seven takeaways (one per section):
1. Permission mode is a risk decision, not a speed decision. Match mode to risk of work and environment; bypass on a workstation against a live codebase removes every checkpoint. A deny rule on the untouchable path at project or enterprise level covers the gap a mode alone does not.
2. An AI code review gives findings to triage, not a verdict. Trust findings the reviewer can prove from the diff (missing null check, unclosed resource) and confirm them on the cited lines. Treat claims about runtime behavior or another system as hypotheses to test. Put the human gate where a finding turns into a hard-to-reverse action; raise accuracy by giving the reviewer the conventions it would otherwise guess.
3. A skill is portable, but "runs everywhere" is designed for. Filesystem discovery in Claude Code, beta headers and a code execution container on the API, settingSources on the SDK. Clear description and no local-environment assumptions port cleanly. In every runtime, subagents start clean and do not preload skills.
4. Durable context requires the right mechanism per concern. CLAUDE.md (dilutes with size), rules files (scoping), hooks (deterministic), subagents (keep exploration out of main context). Forcing all into CLAUDE.md gives a file harder to maintain and easier to ignore.
5. A shareable setup requires portable components. Paths relative to project root; document or validate env var requirements at install time; test from a clean machine.
6. Transport and scope are independent decisions with dependent consequences. stdio for servers on your machine; HTTP for remote or multi-developer. Local keeps personal; project shares via `.mcp.json`. A shared team server needs HTTP plus project or enterprise scope. A stdio server in `.mcp.json` looks shareable but is not.
7. Enterprise integration requires security requirements identified before deployment. OAuth for user-identity services, env vars for service credentials, PostToolUse hooks for audit logging, enterprise managed settings for configuration lock. Easy to implement, hard to retrofit after a failed security review.

- Next: Module 4 covers production engineering, evals, and security (measuring Claude Code integrations at scale, eval harnesses, production-grade safety guardrails). Course path: M1 MSO Foundations; M2 Production-Grade Prompting, Agents & Tool-use; M3 Claude Code, MCP & Integration; M4 Production Engineering, Evals, and Security; M5 Accelerators and IP Contribution.
- Sources cited by the module: Claude 101 (Skilljar), Claude Code 101 In Action (Skilljar), Building with the Claude API (Skilljar), code.claude.com, platform.claude.com, docs.claude.com.

Source gap: the Module Complete page shows "4 of 8 checkpoints passed" (a progress counter for the learner's own run). The module text itself contains six numbered checkpoints plus two cumulative-task parts (eight in total).

---

## 9. Checkpoints and Exercises

Source gap: the source pages render answer choices with check marks and no answer key for Checkpoints 1-6, so the correct answers below are derived from the course's own stated reasoning; only the cumulative task includes a model answer.

### Checkpoint 1 - Assemble the settings file and place the human gate

- What it tests: selecting settings.json pieces for a trusted local refactor of the payments module (edits auto-approved; no destructive shell commands; `.env.production` never readable), then placing a human gate by worst-case cost.
- Part 1 (select two pieces). Pieces: A default mode; B bypassPermissions; C allow `Bash(npm run:*)` with deny `Bash(rm:*)`, `Bash(git push:*)`; D deny `Read(.env.production)`; E allow `Bash(*)` and `Edit(*)`.
  - Reasoning: C supplies the destructive-command denies (rm, git push); D supplies the `.env.production` read deny. B removes all prompts (and protections) so fails the "never run destructive commands" goal; E allows everything; A alone provides neither requirement. Deny rules win over allow rules regardless of mode. Derived answer: C and D.
  - Source gap: none of the pieces sets `acceptEdits`, so the "auto-approve file edits" requirement is not expressed by any piece; the course's stated intent is acceptEdits for this, and "select two pieces" points to C and D.
- Part 2 (single best answer): option b. A human reviews and approves the deployment-config change before the write executes, because a wrong value is hard to undo and reaches systems outside the file.
  - Why not a (edits already auto-approved): the gate overrides the session default for the high-cost action.
  - Why not c (bypass): removes every gate.
  - Why not d (review after the write, in the next PR): the cost of being wrong is incurred at the write; the gate must sit before it executes.

### Checkpoint 2 - Drag the correct value (hook)

- What it tests: choosing the lifecycle event and the command for a hook that blocks reads of `.env.production`.
- Blank 1: PreToolUse (runs before a tool call executes; PostToolUse cannot block because the call has already happened; UserPromptSubmit and SessionStart are the wrong lifecycle points).
- Blank 2: a script that reads the tool call from stdin, checks the file path, and exits with code 2 when the path is `.env.production`, writing the reason to stderr. Not the audit-log script that exits 0, and not the warning script that exits 0 unconditionally, because exit 0 does not block.

### Checkpoint 3 - Place the skill in the right runtime

- What it tests: matching the four runtime situations to what must be configured for the skill to load and run.
- Developer asks for a review in the Claude Code terminal: place `SKILL.md` in `.claude/skills` with a description that matches review requests (filesystem discovery, description match).
- Service calls the Messages API: send the code-execution and skills beta headers, and write the skill so its steps do not depend on local files or local tools (it runs in Anthropic's code execution container).
- Scheduled headless job using the Agent SDK expecting the repo's skill: enable filesystem sources by setting `settingSources` explicitly; do not rely on a default; confirm current default behavior against the Agent SDK reference at build time.
- Long-running Anthropic-hosted agent reachable by agent ID across sessions (Managed Agents): define the agent as an API resource that lists the skill and set the `managed-agents-2026-04-01` beta header on the calls; write the skill so steps do not depend on local files because it runs in Anthropic's sandbox.
- Note from the course: the source presents three teams but four runtime situations; all four are included so the match stays complete.

### Checkpoint 4 - Fix the broken plugin definition

- What it tests: spotting the single portability defect in a SKILL.md and choosing the right fix.
- Part 1 defect: option C, the absolute path `/Users/alexmorgan/projects/deploy-utils/validate.sh` in step 1. (Not the skill name, not description length, not who step 2 reports to.)
- Part 2 fix: option A, reference the script from the project root using `CLAUDE_PROJECT_DIR`, so it resolves wherever the project is cloned. Wrong: another absolute path on a shared network drive (still an environment assumption), `~/projects/...` (a per-user home path), or removing the script step (drops the function).

### Checkpoint 5 - Match transport and scope to each deployment scenario

- What it tests: pairing transport and scope with where the server runs and who must reach it.
- Local SQLite query tool used only on your dev machine: stdio + Local.
- Code search service hosted on company infrastructure for the whole engineering team: HTTP + Project (`.mcp.json`).
- Experimental web-scraping server tested this week against one repository, not ready to share: stdio or HTTP + Local (the option labeled "stdio or HTTP + Local").
- Security-scanning server the IT team deploys to every developer's installation: HTTP + Enterprise (managed settings).
- Reasoning: stdio runs on one machine so it cannot be shared via project scope; HTTP is for remote or multi-developer use; enterprise scope is the admin-pushed, user-proof option.

### Checkpoint 6 - Diagnose the authentication failure from a trace

- What it tests: naming the failure mechanism from a connection trace and choosing the targeted fix.
- Trace facts: client connects to `https://data-api.internal/mcp`; `GET /auth/token` returns 401 Unauthorized; credential read from `/home/jenkins/.config/mcp-credentials.json` (`WAREHOUSE_TOKEN`, redacted); retry returns 401; fails after 3 attempts.
- Failure mechanism: an API-key credential stored in a file on the CI machine is being rejected (401) on every retry. A service-identity API key, not an OAuth user flow.
- Correct answer: Fix B. Rotate the rejected key, then move the credential out of the file and inject it as an environment variable in the CI pipeline runner configuration; update the MCP configuration to reference the variable.
  - Fix A (rotate and update the file) repeats the placement mistake and leaves the credential in a file.
  - Fix C (switch to OAuth) mismatches the auth pattern: an internal service identity uses an API key via env var; OAuth is for user-identity services.

### Cumulative Task - Part 1 (find the bugs) and Part 2 (assemble)

- What it tests: recognizing one bug per layer (permission config, plugin portability, MCP credential placement) and writing the corrected files.
- Answers as the course states: File 1 bypassPermissions (fix to acceptEdits, keep the `.env.production` deny); File 2 absolute path (fix with `$CLAUDE_PROJECT_DIR/scripts/validate-migration.sh`); File 3 inline key (fix with `Bearer ${WAREHOUSE_MCP_TOKEN}`). Full text is in section 7 above.

---

## 10. Common Mistakes

| Mistake | Fix |
|---|---|
| Switching to bypassPermissions to stop prompts on routine work | Match mode to risk; use acceptEdits or the classifier-gated auto mode; add deny rules on sensitive paths first; reserve bypass for isolated, disposable containers or VMs |
| Assuming acceptEdits gates `rm` | acceptEdits auto-approves rm, mv, cp, sed, mkdir, touch, rmdir inside the working directory; it prompts for other shell commands (like running a script). Use a deny rule for what must never run |
| Relying on a mode alone for protection | A deny rule always wins over allow and is mode-independent; enterprise-level deny cannot be removed and applies even under bypass |
| Letting the agent be the only gate on code marked sensitive | A person reviews before merge regardless of how confident the agent or its review sounds |
| Letting CLAUDE.md grow into an append log (847 lines) | Keep only behavior-changing constraints; path-specific rules into `.claude/rules/` with `paths`; history in a separate reference doc; skills for on-demand procedure; audit past a few hundred lines |
| Expecting a CLAUDE.md instruction to enforce a guardrail | Use a PreToolUse hook that exits with code 2 and writes the reason to stderr |
| Trying to block with a PostToolUse hook | PostToolUse runs after the call and cannot block; use PreToolUse; use PostToolUse for formatting, tests, audit logging |
| Expecting a rules file's subdirectory to scope it | Scope comes from the `paths` glob in frontmatter; without it the file loads at launch like CLAUDE.md |
| Delegating a rule-bound task to Explore or Plan subagents | They skip CLAUDE.md and git status; use general-purpose or a custom subagent that loads the rules |
| Assuming subagents inherit skills | List needed skills explicitly in the custom subagent's front matter in `.claude/agents`; built-in agents have none preloaded |
| Skill works in Claude Code but does nothing under the Agent SDK | Set `settingSources` / `setting_sources` explicitly; never rely on the default |
| Skill assumes local files or tools on the Messages API | It runs in Anthropic's code execution container; send code-execution and skills beta headers; keep steps to what the runtime guarantees or document the dependency |
| Vague skill description | Write the description as the matching criterion for when the skill applies |
| Absolute home-directory path in a skill, hook, or plugin component | Use `$CLAUDE_PROJECT_DIR` (project scripts) or `${CLAUDE_PLUGIN_ROOT}` (plugin-bundled scripts); bundle dependencies |
| Undocumented env var (for example `DEPLOY_TOKEN`) | Document every required variable; validate at install time; test on a clean machine |
| Assuming a plugin carries your local deny rules and hooks | Only bundled components travel; list the guardrail components in the bundle |
| Renaming a plugin casually | The plugin name prefixes every command (`/payments:run-tests`); renaming renames them all |
| Putting an API key inline in `.mcp.json` | Use `${VAR}` references; treat any committed inline credential as compromised and rotate it |
| Sharing a stdio server through `.mcp.json` as if it were a shared server | stdio runs a local subprocess per clone and every teammate needs the runtime; use HTTP for shared servers |
| Using SSE for a new server | SSE is legacy and superseded; use HTTP for non-local servers |
| Connecting every MCP server "just in case" | Connect only what is needed; each server adds tool definitions to context |
| Confusing a permission rule with the `enabled` flag in `mcp_toolset` | Rule = may an exposed tool run; `enabled` flag = does the model see the tool at all |
| Moving OAuth from staging to production without registration work | Add the new host's redirect URI to the app registration; check whether separate app registrations per environment are required; add to the deployment checklist |
| Fixing a rejected stored key by editing the file | Rotate the key and move it to an env var (or secret store); the config holds only a reference |
| Starting high-risk (modernization) work without scoping | Decide blast radius, audit approach (PostToolUse hook log), and who approves each phase, before the session |

---

## 11. Key Terms

| Term | Meaning |
|---|---|
| Claude Agent SDK | Programmable interface exposing the same agent loop Claude Code runs in the terminal; invoke from code, set permission mode and tools, run tasks without an interactive session. Same permission model and deny rules as the terminal |
| CLAUDE.md | Markdown file at a Claude Code project root; prepended to the context window at the start of every session; universal constraints, conventions, commands. Beyond roughly 200-300 lines risks diluting critical rules |
| Hook | Command bound to a lifecycle event (PreToolUse, PostToolUse, UserPromptSubmit, Stop in the glossary; the teaching section adds Notification, SessionStart, SessionEnd). Runs deterministically regardless of what the model decides. PreToolUse can exit with code 2 to block a tool call |
| MCP (Model Context Protocol) | Open communication layer letting an MCP client such as Claude Code connect to an MCP server exposing tools, resources, and prompts; moves tool definition and maintenance out of application code into a reusable server |
| MCP transport | Channel between MCP client and server. stdio: local subprocess on the same machine. HTTP: remotely hosted server over a network. Determines where the server can run and who can connect |
| Permission mode | Setting controlling how often the agent stops for confirmation before tool calls; from default (prompts before nearly every action) to bypass modes (no prompts). Deny rules override any mode; an enterprise-level deny cannot be bypassed by individual configuration |
| Plugin | Versioned bundle of Claude Code components (skills, hooks, subagents, MCP server configs) distributed through a marketplace; single-step install; enterprises can deploy organization-wide through managed settings |
| Rules instruction file | File scoping guidance to a path or condition; unlike CLAUDE.md it activates only when Claude Code works in the matching area; keeps path-specific guidance out of main project memory |
| Subagent | Separate execution context for a delegated task; does not inherit the main conversation's context or files; starts clean, returns only a summary; keeps exploratory work out of the main session |
| Resource (MCP) | Read-only data a server exposes by address for the client to place into context; direct (fixed address) or templated (parameter in address) |
| Prompt (MCP) | Pre-written instruction template a server exposes for clients to invoke by name |
| Local / User / Project / Enterprise scope | Where an MCP server config lives and who loads it: `~/.claude.json` per-project; personal settings across projects; `.mcp.json` in the repo; centrally managed by an administrator |
| `mcp__server__tool` | Permission-rule identifier for a single MCP tool |
| `settingSources` / `setting_sources` | Agent SDK setting (TypeScript / Python) controlling whether filesystem settings (CLAUDE.md, skills) load |
| `$CLAUDE_PROJECT_DIR`, `${CLAUDE_PLUGIN_ROOT}` | Path bases for scripts in the project and scripts bundled in a plugin |
| `extraKnownMarketplaces` | Managed-settings key paired with the marketplace allowlist to push a marketplace to all users |
| `cache_control` (`ephemeral`, `ttl` of `1h`) | Messages API cache breakpoint field; five-minute default lifetime, opt-in one hour; up to four breakpoints; 1,024-token minimum for most current models |
| Secret store | Managed service that holds credentials, returns them to authorized callers at runtime, and records who read what |
| Separation / rotation | Keep credential values out of config files that reference them; replace credentials on a schedule and immediately after suspected exposure |

---

## 12. Exam-style Self-Test

1. Q: What are the three phases Claude Code moves through on a task, and which permission mode holds it in the first?
   A: Explore, plan, code. Plan mode holds it in the explore phase, blocking all file edits and shell commands until you release it.

2. Q: In the bypass-mode incident, what exactly would have prompted had the user stayed in default or acceptEdits?
   A: The invocation of the cleanup script, not the `rm` deletions themselves; acceptEdits auto-approves `rm` inside the working directory, so only default mode prompts for direct rm.

3. Q: A project-level allow rule and an enterprise-level deny rule conflict on the same path. Which wins, and does the active mode matter?
   A: The deny wins; deny always beats allow regardless of mode, and an enterprise deny cannot be overridden by users or project files, even under a bypass mode.

4. Q: What single question places both the permission mode and the human gate?
   A: What is the worst outcome if this action runs without a person checking it?

5. Q: Name the three gate placements.
   A: Let low-stakes reversible actions through; gate hard-to-undo or sensitive-path actions; never let the agent be the only gate on changes to code the team marked sensitive.

6. Q: Why did the 847-line CLAUDE.md fail to stop the edit to `/legacy/tokens/`?
   A: Dilution. The rule was present at line 347 but 846 other lines reduced its effective weight. Fix by moving path rules to a rules file, history to a reference document, and the critical rule toward a hook.

7. Q: How do you scope a rules file to the database module's SQL?
   A: Put the file in `.claude/rules/` (for example `database.md`) with a `paths` glob in YAML frontmatter, such as `src/db/**/*.sql`. Subdirectory placement alone does not scope it; without `paths` it loads at launch like CLAUDE.md.

8. Q: Which hook event can block a tool call, and how?
   A: PreToolUse; the hook command exits with code 2 and writes the reason to stderr for the agent to see. PostToolUse cannot block because the call has already happened.

9. Q: Which built-in subagents skip CLAUDE.md and git status, and what is the consequence?
   A: Explore and Plan. Project rules from CLAUDE.md are not in their context. Use general-purpose (loads both) or a custom subagent that loads the rules.

10. Q: A skill works in Claude Code but does nothing under the Agent SDK. What is the likely cause?
    A: `settingSources` (`setting_sources` in Python) was never set explicitly, so filesystem sources such as skills did not load.

11. Q: Where do skills run on the Messages API, and what is required?
    A: Inside Anthropic's code execution container, not your environment; requires code-execution and skills beta headers; steps must not depend on local files or tools.

12. Q: What caveats apply to Managed Agents in this module?
    A: Public beta requiring the `managed-agents-2026-04-01` beta header; sessions stored server-side so not currently eligible for Zero Data Retention or HIPAA BAA coverage; skills are attached when defining the agent resource, not at session time.

13. Q: How is a `run-tests` command in a plugin named `payments` invoked, and why?
    A: `/payments:run-tests`. Plugin commands are auto-namespaced by plugin name so two plugins can both ship `run-tests` without collision.

14. Q: Which variable resolves a script stored in the project and which resolves a script bundled in the plugin?
    A: `$CLAUDE_PROJECT_DIR` for project scripts; `${CLAUDE_PLUGIN_ROOT}` for scripts bundled inside the plugin.

15. Q: Which transport and scope fit a shared team code-search service, and what is wrong with a stdio server committed in `.mcp.json`?
    A: HTTP transport with project scope (`.mcp.json`). A stdio server runs a local subprocess per clone, so each teammate needs the runtime installed; it looks shareable but is not a shared server.

16. Q: What is the difference between a permission rule on `mcp__github__create_issue` and an `enabled` flag in `mcp_toolset`?
    A: The permission rule decides whether an exposed tool may run (governance); the `enabled` flag decides whether the model sees the tool at all (context-cost and scope control).

17. Q: A key was committed inline in `.mcp.json` and later replaced by an env var in a new commit. Is the exposure resolved?
    A: No. The key remains in repository history; treat it as compromised and rotate it. The config should hold only `Bearer ${WAREHOUSE_MCP_TOKEN}`-style references.

18. Q: OAuth worked in staging but production sign-in loops back with a redirect URI mismatch. What is wrong?
    A: Redirect URIs are registered per host; `production.mycompany.com` was not registered. Add it, and check whether separate OAuth app registrations per environment are required.
