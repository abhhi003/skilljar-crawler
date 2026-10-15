# Permission Modes & Human Gates

## Claude Code agent loop, permission modes, settings, and where a human gate goes

*Teaching | Permission Modes & Human Gates | 17 min*

Module 2 established how the agent loop works at the API level: the model calls tools, gets results back, and continues until the task is done.

Claude Code runs that same loop in your terminal but adds an additional layer: a permission system that gates every action the agent wants to take. Before you can configure anything, you need to understand how the loop runs and what the permission modes control.

#### How Claude Code works through a task: explore, plan, and code

When you hand Claude Code a task, it does not start writing immediately. It reads files, traces the relevant logic, and builds a picture of the codebase first; this is the exploration phase. Then, once it understands enough to propose a change, it creates a plan. A plan is a structured description of the edits it intends to make. Only after you review and approve the plan does it move into the code phase, where it writes and executes the changes.

This sequence matters for two reasons. First, it produces better output: Claude Code understands the codebase before touching anything, so it makes fewer assumptions and catches more downstream effects. Second, it is where the permission modes plug in: plan mode holds Claude Code in the explore phase, blocking all file edits and shell commands until you release it, making it a useful default for unfamiliar codebases or high-stakes work.

#### Permission modes: approvals, gates, and constraints

Permission modes control how often Claude Code stops to ask for confirmation. Each mode makes a different tradeoff between speed and oversight. The right choice depends on how well you know the codebase and how reversible the changes are.

Select each tab for what that mode auto-approves, what it still gates, and its limitations.

**What it auto-approves:** Reads only. Prompts before nearly every edit or command.

**What it still gates:** All file edits and shell commands require confirmation.

**Limitations:** Safe but slow on trusted work. The baseline for any new project or unfamiliar codebase.

**What it auto-approves:** Reads, file edits, and common filesystem commands (`mkdir`, `touch`, `rm`, `rmdir`, `mv`, `cp`, and `sed`) inside the working directory. Auto-approval is scoped to paths inside the working directory, and protected paths still prompt.

**What it still gates:** All other shell commands; writes outside the working directory; writes to protected paths.

**Limitations:** Trusted local work where shell execution still needs a human eye. Not appropriate if the agent must run scripts.

**What it auto-approves:** Reads only. Research and proposes; makes no edits.

**What it still gates:** All file edits and shell commands until you approve a plan.

**Limitations:** Exploration and planning on sensitive or unfamiliar codebases. Not appropriate for tasks that must write output.

**What it auto-approves:** Everything, but a separate classifier reviews each action first and blocks anything that escalates beyond your request, targets unrecognized infrastructure, or appears driven by hostile or inappropriate content.

**What it still gates:** Production deploys and migrations, mass deletes, credential exfiltration, and force-push to main are blocked by default.

**Limitations:** Reduces prompts but does not guarantee safety; this is a research preview, not a substitute for reviewing sensitive operations. Availability depends on plan, model version, and admin settings. Always verify current requirements before build.

**What it auto-approves:** Only tools you pre-approved in an allow rule, plus read-only commands. Auto-DENIES everything else.

**What it still gates:** Every tool call not on the allow list is denied. There is no queue for confirmation.

**Limitations:** Built for locked-down CI and scripts. It restricts well, but it is not a way to reduce friction on local interactive work.

**What it auto-approves:** All tool calls. No confirmation prompts and no safety checks.

**What it still gates:** Nothing in normal operation. The standard permission checks are bypassed; only catastrophic delete commands such as `rm -rf /` and `rm -rf ~` still trigger a last-resort prompt.

**Limitations:** Only inside an isolated container or VM where the environment is disposable. Never on a developer workstation against a live codebase.

#### Where does the configuration live and who it applies to

Settings can be placed at several levels, and each level determines the scope of the rules it contains.

- **User level (`~/.claude/settings.json`):** Applies to every project on the machine. This is the right place for preferences that should follow you everywhere, such as a preferred default mode for exploration work.
- **Project level (`.claude/settings.json`, committed to the repo):** Applies to everyone who clones the repository. This is the right place for team-wide conventions, allow rules for the tools your project uses, and deny rules for paths that should not be touched.
- **Local project level (`.claude/settings.local.json`):** Personal overrides for one project, automatically git-ignored. This is the right place for your own preferences that should not be committed to the whole team.
- **Enterprise level (`managed-settings.json`, set by administrators):** Cannot be overridden by users or project files. The right place for organization-wide security controls such as denying edits to environment files or blocking specific shell commands across all projects.

Allow and deny rules layer on top of the selected mode. A deny rule always wins over an allow rule, regardless of the mode in effect. The most durable governance control is an enterprise-level deny rule: it cannot be removed by any individual developer and applies even when a bypass mode is set.

#### Where a human still has to look: placing the review gate by worst-case cost

Permission modes and deny rules decide what the agent can do without asking. They do not decide where you, the human, still need to look before an action lands. That decision rests on one question, the same one that separates a safe mode from a risky one: what is the worst outcome if this action runs without a person checking it? The lower the cost of being wrong, the more you can let through. The higher the cost, and the harder it is to undo, the more a step needs a human gate before it executes.

That same worst-case question places the gate whether the agent is writing code or running unattended in an automated step such as a bot that comments on or blocks a pull request. Three placements follow from it:

- Let low-stakes, reversible actions through without a gate. A formatting fix or an edit confined to the working directory carries little cost if it is wrong, so requiring a human to approve each one buys oversight you do not need and slows the work. This is the case `acceptEdits` is built for.
- Gate any action that is hard to undo or reaches a sensitive path: a write outside the working directory, a destructive shell command, or an edit to a security-relevant or protected file. The cost of a wrong call there is high, so the agent should pause and surface the action for a person before it runs. A deny rule enforces this deterministically, and default or plan mode keeps the prompt in place while you decide.
- Never let the agent be the only gate on a change to code your team has marked sensitive. There the agent’s work is an input to a human decision, not a replacement for one, so a person must review the change before it merges no matter how confident the agent or its own review sounds.

The placement of the gate and the choice of permission mode are the same decision viewed from two sides. The mode sets the default for a whole session, and the gate is where you override that default for the one action whose cost is too high to leave to the default; both come from asking what breaks if this runs unchecked.

Cost · Complexity · Risk

**Cost:** Running in default mode on trusted work adds prompt latency to every tool call, and this accumulates on a long refactor.

**Complexity:** Multiple levels of settings and files with an override hierarchy require consistent care. A deny rule at the enterprise level that contradicts an allow rule at the project level needs to be understood by everyone maintaining the project config.

**Risk:** The risk lies in using the wrong mode for the context. For example, a bypass mode set out of impatience on a non-isolated machine removes every safety prompt between the agent and your live files, and, unlike the other modes, also removes the protected-path guard.

## The bypass mode that removed the one prompt that mattered

*Watch Out | Permission Modes & Human Gates | 3 min*

#### The bypass mode that removed the one prompt that mattered

Setup

You switched to bypass Permissions to stop the constant prompts because the work felt routine. The agent had been well-behaved for days, the cleanup task was simple, and the prompt-before-every-tool-call behavior felt like unnecessary friction.

#### The transcript

The following pairing session happened on a codebase cleanup that had been running without incident for three days.

Dev: "All right, I’m switching to bypassPermissions for this one. It’s just renaming old API endpoint references. Nothing risky." Claude Code: [Scanning files matching pattern /v1/legacy/ ... 47 files found] Claude Code: [Updating endpoint references ...] Claude Code: [Running post-rename cleanup.sh script ...] Claude Code: [Deleted 3 files matching /v1/legacy/ in /deploy/config/prod/ ...] Dev: "Wait. What was in /deploy/config/prod/?" Claude Code: [Files contained environment-specific endpoint overrides for the production deployment. They have been removed.] Dev: "That directory wasn’t supposed to be in scope. I was working on /src/." Claude Code: [The pattern /v1/legacy/ matched files in both /src/ and /deploy/config/prod/. In bypassPermissions mode, no confirmation was requested before the deletions.]

The prompt that would have caught this mistake was turned off when bypassPermissions was turned on. In default or acceptEdits mode, the cleanup script would not have run without a confirmation, and the user could have stopped the deletion before it reached the production configuration files. In bypassPermissions, the pattern match was broader than intended, and no prompt stood between the script and the files it deleted.

Note the precise location of the gate: it was the script invocation that would have prompted, not `rm` deletion commands by themselves. acceptEdits auto-approves common filesystem commands, including `rm` on paths inside the working directory. Had Claude issued the deletions directly as `rm` commands, acceptEdits would have let them through silently; only default mode prompts for those.

What to Watch Out for

A bypass mode silences all confirmation prompts, including the ones you might not have anticipated. The failure pattern here is an agent matching a broader set of files than you intended, running in a mode without checkpoints. BypassPermissions also skips the protected path guard that the other modes keep, so even repo state and Claude’s own configuration lose their automatic prompt. To cover this gap, you must set a deny rule on sensitive directories before switching modes. If you want fewer prompts without losing the safety net, use a classifier-gated mode (e.g., auto) instead of a full bypass.

## Checkpoint 1: assemble the settings file and place the human gate

*Checkpoint | Permission Modes & Human Gates | 4 min*

Try it now. You are configuring Claude Code for a trusted local refactor of the payments module.

The refactor should auto-approve file edits but must never run destructive shell commands, and the file `.env.production` must never be readable by the agent. Below are settings.json pieces.

#### Part 1: Select the setting.json pieces that assemble the correct configuration

Select two pieces.

✓

**Piece A.** `{ "permissions": { "defaultMode": "default"} }`

✓

**Piece B.** `{ "permissions": { "defaultMode": "bypassPermissions" } }`

✓

**Piece C.** `{ "permissions": { "allow": ["Bash(npm run:*)"], "deny": ["Bash(rm:*)", "Bash(git push:*)"] } }`

✓

**Piece D.** `{ "permissions": { "deny": ["Read(.env.production)"] } }`

✓

**Piece E.** `{ "permissions": { "allow": ["Bash(*)", "Edit(*)"] } }`

#### Part 2

Your settings allow the agent to edit files automatically. During the refactor the agent proposes a change to a deployment configuration file that several production services read. Where should a human gate sit for that one action? Choose the single best answer.

aNowhere: the settings already auto-approve edits, so let it run.

bA human reviews and approves the change to the deployment configuration file before the write executes, because a wrong value there is hard to undo and reaches systems outside the file.

cAdd bypassPermissions so the agent never pauses.

dReview the change only after the write, during the next pull request.
