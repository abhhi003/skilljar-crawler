# Claude Code in Action - Study Notes

Source: Anthropic Academy course "claude-code-in-action" (9 lessons + course quiz).
Part of Claude Certified Architect Foundations prep. Notes cover only what the lesson
text says. Each lesson also embeds a YouTube video (no transcript captured).

Source gap: every lesson embeds a video exercise (title only captured, no transcript or
hands-on steps); notes rely solely on the written lesson text.

---

## 1. Big Picture

The course is about running Claude Code on long and unattended work without babysitting
it. It moves from hands-on control, to making instructions stick, to deterministic
enforcement, to handing work off entirely, and finally to checking what you did not watch.

- Steer: scope with plan mode, then compact, rewind, goal, loop, worktrees.
- Configure: keep CLAUDE.md lean; put procedures in skills; put hard rules in hooks.
- Automate: permission modes, routines, headless (-p), GitHub Action, Code Review.
- Verify: verify in proportion to how much rope you gave the run.
- Share: plugins package a trusted setup for the whole team.
- Recurring theme: instructions (CLAUDE.md, skills) are requests; hooks are code that
  runs and can block. If skipping a rule is unacceptable, use a hook.
- Recurring theme: auto mode guards intent (classifier); a stop hook guards correctness.

```
  STEER (L1)            CONFIGURE (L2, L3, L5)        AUTOMATE (L4, L6, L7)
  plan mode             CLAUDE.md (guidance)          permission modes
  compact / rewind      skills (procedures)           routines (cloud)
  goal / loop           hooks (enforcement)           headless -p / --bare / SDK
  worktrees                                           GitHub Action / Code Review
       |                        |                              |
       +------------------------+------------------------------+
                                |
                                v
                     VERIFY (L3, L8)                 SHARE (L9)
                     diff first, tests as hook  -->  plugins: skills + agents +
                     cold second opinion              hooks + MCP in one install

  "The less you watched, the more you verify."
```

---

## 2. Lessons

### Lesson 1 - Steering Long Sessions

Two habits: scope the work before Claude starts, and steer it while it runs.

Key ideas
- Plan mode: Claude researches in read-only mode, reads code, works out what must
  change, hands you a plan to review.
- Read the plan, do not skim it. A more thorough plan means fewer surprises. If
  something is missing, ask Claude to add it. Iterating on a plan is faster than
  running and cleaning up after.
- Compact: summarizes the conversation, uses the summary as new context, deletes old
  messages. Frees the context window. Risk: something important is dropped and Claude
  drifts.
- Rewind: returns to a checkpoint. Every user prompt creates a checkpoint. Open the
  menu by double-tapping escape on an empty prompt.
- Goal: a completion condition; Claude keeps working across turns until a fast
  evaluator confirms the condition is met.
- Loop: runs a prompt on an interval between turns (fixed or self-paced). Use it to
  pull something external such as a CI run or a deploy, and act when the state changes.
- Worktrees: each parallel session gets its own independent file tree so two sessions
  cannot clobber each other. A clean worktree is automatically removed when the
  session exits.

Rules and traps
- Do not run `/compact` bare; add instructions after the command to shape what the
  summary keeps ("your steering wheel for context").
- Goal evaluator only reads the transcript, so the condition must be checkable from
  output Claude actually produces (e.g. test run results).
- Stop a loop by pressing escape. Cancel a goal with `/goal clear`.
- "Two steering wheels in one car": two Claude sessions on the same files conflict;
  use worktrees.
- `.worktreeinclude` at the repo root lists git-ignored files to copy into each
  worktree (e.g. an environment variable file or local config you do not commit).
- Set a goal when you can describe "done" better than you can describe the steps.

Rewind menu options
- Restore code and conversation - roll back both together.
- Restore conversation - roll back just the chat.
- Restore code - roll back just the files.
- Summarize from here - summarizes everything after the checkpoint (good after a side
  conversation, to free space).
- Summarize up to here - summarizes everything before the checkpoint (good to compress
  a long setup phase while keeping implementation parts intact).

Commands shown
```
/compact Focus on the --version flag implementation
```
```
/goal all tests in src/billing pass, and the type checker reports zero errors
```
```
/goal clear
```
- Double tap escape on empty prompt: open rewind menu.
- Escape: stop a loop.

Habits (lesson recap)
- Scope first, then steer.
- Direct your compaction.
- Use rewind to course correct.
- Set a goal for "done".
- Run parallel work in worktrees.

---

### Lesson 2 - A CLAUDE.md That Follows

Core claim: CLAUDE.md is not enforced configuration, it is guidance. Every line
competes with every other line for attention. The leaner the file, the more of it
Claude follows.

Key ideas
- First ask if CLAUDE.md is even the right tool. Guidance goes in CLAUDE.md; hard
  lines go elsewhere.
- Example: "never push to main" belongs in a pre-tool-use hook. A hook is code that
  runs before an action and can block it; CLAUDE.md is hoping Claude respects it.
- Four locations; Claude loads all of them together at launch, nothing is dropped,
  they stack:
  - Managed policy - org-level file the platform team controls. Cannot be excluded,
    so org policy is always in play.
  - User - personal preferences across every project on your machine.
  - Project - shared with the team, checked into the repo.
  - Local - ignored by git; personal notes for this one repository only (example:
    architectural decisions to hold in mind while refactoring on your own branch).
- Imports split a big file (path-to-file import syntax). Claude expands imported files
  inline at launch, so everything still loads up front.

Rules and traps
- Imports organize; they do NOT reduce the context Claude has to read.
- Be specific and checkable. Vague: "Follow best practices for API routes." Specific:
  "Put new API routes in `src/api/handlers`, one per file."
- Name the replacement, do not just ban. Leaves it open: "Don't use default exports."
  Closes it: "Use named exports, not default exports."
- Emphasis is a budget. "IMPORTANT" and "YOU MUST" raise priority only relative to
  quieter lines; if every rule shouts, nothing stands out. Spend emphasis on the two
  or three rules that hurt most when broken.
- Keep the file under revision: treat a wrong Claude action as a bug report against
  CLAUDE.md. You can tell Claude "add that to the CLAUDE.md file" and it writes the rule.
- Treat CLAUDE.md like production code: if you cannot justify a line, delete it.

Snippet shown (imports)
```
@.claude/conventions/code-style.md
@.claude/conventions/testing.md
@.claude/conventions/workflow.md
```

Lesson recap
- Move hard rules to hooks.
- Organize long files with imports (they do not reduce context).
- Make every rule specific and checkable, and name the replacement.
- Spend emphasis on the few rules that matter.
- Keep revising when Claude gets something wrong.

---

### Lesson 3 - Verification Skills

Verification is the one skill worth building first.

Key ideas
- Normal checking depends on you remembering to ask (run tests, read the diff). Skip
  it once and bad code slips through. A verification skill removes that dependency.
- Flow: you ask for a refactor; when it finishes, the change matches the skill's
  description so the skill fires on its own. The skill:
  - Runs the test suite.
  - Reads the diff.
  - Checks that no test was weakened just to make things pass.
  - Reports pass or fail, with the evidence attached.
- The skill description is what triggers it; once triggered it walks the same steps
  every time.
- "Done" is not "the code looks right" from reading the diff. Done is the gates being
  run and observed, with results stated explicitly.
- Same shape carries any repeated procedure: release checklist, migration recipe,
  pre-PR check. Rule of thumb: if you have typed the same multi-step instruction
  twice, that is a skill.
- A skill is a folder with a `skill.md` inside: a name, a description that triggers it,
  and the procedure. Only descriptions load into context until a skill is needed, so
  there is no cost to packaging every repeated procedure.
- Check it into your project's `.claude/skills` so the whole team inherits it.

Skill folder contents
- `skill.md` - keep lean; says what to do.
- `reference.md` - detailed material linked from `skill.md`; Claude reads it only when
  it needs that depth.
- Scripts (example: `check.sh` that runs all the gates) - Claude executes them rather
  than loading their contents into context.
- Takeaway: push long explanations and executable scripts into side files.

Which instruction surface owns which rule
- Conventions that apply all the time (naming rules, where files go): `CLAUDE.md`.
- Procedures and reference material tied to a kind of task: a skill.
- A rule Claude must not be able to skip: a hook. CLAUDE.md and skills are
  instructions Claude follows; a hook is code that actually runs.

Rules and traps
- Green tests alone are not enough: a test can be quietly loosened, so the skill reads
  the diff and confirms tests were not weakened.

---

### Lesson 4 - Permission Modes

Permission modes let you decide once what Claude may run without asking.

The six modes
- Manual - reads only, without prompting. Everything else asks first.
- Accept edits - runs reads, file edits, and common file system bash commands without
  asking. For iterating on code you review after the fact.
- Plan - reads only. Researches and proposes changes without editing anything.
- Auto - accepts everything, with a separate classifier model reviewing each action
  before it runs.
- Don't ask - allows only pre-approved tools; everything else is auto-denied with no
  prompt.
- Bypass permissions - skips all checks; equivalent of the dangerously-skip-permissions
  flag. Only run it inside an isolated container or virtual machine.

Key ideas
- Shift-tab cycles the everyday modes: manual, accept edits, plan, and auto. The status
  bar at the bottom always shows the current mode.
- Auto is the hands-off mode. The classifier guards intent: it watches for moves that
  escalate beyond what you asked.
- Classifier is designed to block:
  - Production deploys and migrations.
  - Force pushing, or piping downloaded code straight into a shell.
  - Sending sensitive data to external endpoints.
  - Destroying files that exist for the session.
- Classifier waves through: local edits in your project, installing dependencies from
  your lock file, read-only requests, pushing to your own branch.
- Don't ask is for when no human is around: CI pipelines, scheduled jobs, overnight
  batches. The pipeline keeps moving instead of hanging on an approval nobody gives.

Rules and traps
- The classifier checks intent, not correctness. Broken authentication from a
  "refactor authentication" request is waved through, because broken is not dangerous.
- Pair auto mode with a stop hook that runs your tests: auto watches what Claude is
  trying to do while it runs; the stop hook confirms the code actually runs when it
  finishes. One guards intent before each action, the other guards correctness after.
- Auto mode's guardrails are still evolving; check the docs for current block and
  allow lists.

Match the mode to the job
```
  hands-on, review after   -> accept edits
  research / propose only  -> plan
  hands-off, human present -> auto  (+ stop hook that runs tests)
  unattended, no approver  -> don't ask (pre-approved tools only)
  isolated container / VM  -> bypass permissions (only here)
```

---

### Lesson 5 - Hooks

A hook is deterministic code that runs at a fixed point in the loop. It turns a rule
from "Claude usually listens" into "Claude can't skip it." CLAUDE.md is a request, not
a guarantee.

Hook events
- Claude Code fires around 30 hook events; a small handful are used again and again.
- PreToolUse - fires before a tool call. The enforcement primitive; can stop something
  before it happens.
- PostToolUse - fires after a successful tool call. Usually auto-format or auto-lint.
- Stop - fires when Claude wants to end its turn; you can refuse ("not done yet") if a
  condition is not met. Matching SubagentStop for when a sub-agent finishes.
- PreCompact and PostCompact - fire before and after compaction.
- InstructionsLoaded - fires when a CLAUDE.md or rule file loads; useful to audit what
  actually made it into context.
- SessionStart - fires at the start and primes the environment. Use the `startup`
  source if you only want it on fresh starts.

PreToolUse decision as JSON
- Print JSON and exit zero. Key field `permissionDecision` takes:
  - `allow` - let the call through.
  - `deny` - stop the call.
  - `ask` - hand it back to the user to decide.
- A fourth value, `defer`, applies only to non-interactive `-p` runs where a calling
  process pauses the tool and resumes it later; rarely used.
- `updatedInput` rewrites the call instead of blocking it (e.g. redact a secret from a
  bash command and still let it run).

```
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "...",
    "updatedInput": {
      "command": "..."
    }
  }
}
```

Exit codes (hooks that do not return JSON)
- 0 = success. If stdout is JSON, Claude parses it. Plain text is ignored on most
  events, but on SessionStart, UserPromptSubmit, and UserPromptExpansion plain text is
  added to context (this is what makes a state-preserver hook work).
- 2 = blocking error. Standard error is fed back to Claude as context. The blocking
  exit code almost everywhere.
- Anything else = non-blocking. Standard error is logged and Claude carries on.

Illustrative Java (not from the course) showing the exit-code rule a hook author
must remember:
```java
// Illustrative only: how Claude Code treats a hook's exit code (per the lesson).
enum HookOutcome { SUCCESS, BLOCK_AND_FEED_STDERR_TO_CLAUDE, NON_BLOCKING_LOGGED }

static HookOutcome classify(int exitCode) {
    if (exitCode == 0) return HookOutcome.SUCCESS;
    if (exitCode == 2) return HookOutcome.BLOCK_AND_FEED_STDERR_TO_CLAUDE;
    return HookOutcome.NON_BLOCKING_LOGGED; // note: exit 1 does NOT block
}
```

Rules and traps
- Exit code 1 does not block; Claude runs the command anyway. To stop something, exit 2.
- To re-inject context after compaction, do NOT use PostCompact. Use SessionStart with
  the `compact` matcher; that is the one whose output gets back into the conversation.
- `updatedInput` replaces the whole input object: echo back the fields you are not
  changing or you lose them.
- Exit 2 can block Stop (how you say "not done").
- PostToolUse fires after the tool already ran, so blocking there is too late to stop
  the call, though it can still feed text back to Claude.
- A few events ignore blocking entirely (e.g. Notification, SessionStart): they show
  stderr and carry on.
- Guardrail pattern: PreToolUse on the Bash tool; the matcher picks the tool, an
  optional `if` clause narrows to a specific command. Redact beats block when the work
  should still happen: the hook spots the `sk_live_` pattern and swaps in a
  placeholder before the command executes.
- Preserve state across compact: a SessionStart hook with the `compact` matcher runs
  right after compaction; have it print a short summary of files you have been working
  on so Claude picks up where it left off.

Recap: guard tools with PreToolUse, gate the turn with Stop, preserve state across a
compact; go beyond auto-formatting.

---

### Lesson 6 - Routines and Headless

Spectrum of automation: routines (build nothing, Anthropic-managed cloud) at one end;
headless mode and the Agent SDK (your own code) at the other. Start with routines; drop
down only when the job needs extra control.

Routines
- A routine bundles a prompt, the repository it works on, and any connectors it needs;
  runs that bundle in the cloud when triggered. No script, no server, no machine of
  yours left on overnight, no workflow file to maintain.
- Triggers: a cron schedule (e.g. every morning at 9am); an HTTP POST to its API
  endpoint; a GitHub event (e.g. a new pull request).
- Good fits: same prompt on a recurring trigger, e.g. morning dependency audit, PR
  triager, daily scan of Sentry tickets.
- Create from the web at `claude.ai/code/routines` (name, instructions per session,
  repository, trigger) or inside Claude Code with `/schedule`.
- Limits to know:
  - Routines are a research preview; behavior and limits will keep moving.
  - A recurring schedule runs at most hourly.
  - Each run starts from a fresh clone of your default branch and can only push to
    `claude/` prefixed branches unless you loosen that per repo (guardrail against
    rewriting main).

Headless mode
- Core: `-p` (short for `--print`) runs Claude Code as a one-shot command with no
  interactive UI; reads stdin and writes stdout, so it pipes like any shell tool.
- `-p` skips auto-discovery of hooks, skills, plugins, MCP servers, and CLAUDE.md. You
  get Claude plus the tools you allow explicitly. Upside: much faster startup.
- Structured output: pair a JSON schema with the JSON output format; Claude constrains
  output to the schema. The matching object lands in the `structured_output` field of
  the JSON response; pull it out with `jq`.
- Multi-step: capture the session ID from JSON output and resume it later (first pass
  makes a plan, second pass carries it out).
- `--bare` flag = deterministic mode; right for CI when you want repeatable,
  predictable output run to run.

Agent SDK
- Library that embeds Claude Code in your own TypeScript or Python app.
- Both expose a `query` function and the same primitives as the CLI. Pass a prompt plus
  options: `allowedTools`, a system prompt, and a permission mode. Iterate over the
  streamed messages and handle them as your app needs. Same engine as the CLI.

Commands shown
```
/schedule daily dependency audit at 9am
```
```
claude -p "summarize the changes in this diff"
```
```
claude -p "Extract the exported function names from src/core/style.js" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}},"required":["functions"]}' \
  | jq '.structured_output.functions'
```
```
claude --resume "$(jq -r .session_id /tmp/plan.json)"
```

Decision guide
```
  repeat work, nothing to host          -> routines (default)
  needs your pipeline / pipe data       -> headless claude -p
  CI needs same results every run       -> --bare
  work belongs inside your own product  -> Agent SDK
```

---

### Lesson 7 - GitHub Actions and Code Review

Two ways to put Claude on pull requests: a managed service you turn on (Code Review)
and a GitHub Action you wire up yourself.

Code Review (managed path)
- Anthropic-hosted; reviews PRs through the Claude GitHub app; nothing to build or host.
  Posts findings as inline comments on the relevant lines.
- Enabled by an organization admin in the Claude Code admin settings: a Code review
  section with a Configure button. Admin installs the Claude GitHub app, picks which
  repos it watches, and decides when it runs:
  - Once when a PR opens.
  - On every push to the PR.
  - Only when someone comments `@claude review`.
- Runs on Anthropic infrastructure; a set of review agents analyzes the diff against
  your full codebase, not just changed lines. Findings are inline comments tagged by
  severity, with a summary table in the check run. Findings are deduplicated and ranked.
- Boundaries:
  - It never approves or blocks the PR; the judgment stays with a human.
  - No managed autofix; findings only.
  - Research preview, available on team and enterprise plans.
- Applying a finding is local: `/code-review` reviews a diff, and its `--fix` flag
  applies findings to your working tree.

GitHub Action (do-it-yourself path)
- For custom CI beyond review: implementing changes from a comment, scheduled reports,
  anything you would write a workflow for. Runs the agent on PR comments, scheduled
  jobs, and any GitHub event.
- Setup: run `/install-github-app` inside Claude Code (needs repo admin); walks you
  through installing the GitHub app and setting the Anthropic API key secret on the repo.
- Action: `anthropics/claude-code-action@v1`. Inputs:
  - `anthropic_api_key` - optional.
  - `github_token` - defaults to `secrets.GITHUB_TOKEN`.
  - `trigger_phrase` - what the action listens for in comments; defaults to `@claude`.
  - `use_bedrock` / `use_vertex` - switch providers.
  - `prompt` - the instruction for the run.
  - `claude_args` - string of CLI arguments passed straight to Claude Code.
- Workflow file: `.github/workflows/claude.yaml` listens for `@claude` on PR comments
  and issue comments. Example: `@claude implement the spec in the linked Linear issue`;
  Claude pushes commits and posts comments describing what it did.
- Scheduled workflow: cron trigger (e.g. 9:00 UTC) runs the action and Claude posts
  results; add a `workflow_dispatch` trigger to run manually from the Actions tab. You
  can watch steps in the Actions tab.
- Tuning via `claude_args`:
  - `--max-turns 5` - hard cap on the agent loop so it cannot run forever.
  - Permission mode - for unattended jobs, one that does not stop and ask (no one
    there to answer).
  - Allowed tools - exactly what the job needs and nothing more (read-only for a report).

Snippet shown
```
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    trigger_phrase: "@claude"
    prompt: "Your instructions here"
    claude_args: "--max-turns 5 --model claude-sonnet-5"
```

Which to use
- PR reviews: managed Code Review; apply fixes locally with `/code-review --fix`.
- More than review: the action. `/install-github-app` for setup, one workflow for
  `@claude` mentions, one for cron, tuning in `claude_args`.
- Start managed; move to the action when Claude must DO something in CI, not just comment.

---

### Lesson 8 - Trust It: Verifying Unsupervised Runs

Principle: verify in proportion to how much rope you gave the run. A watched short
session needs a glance; an unattended run or CI job with nobody in the loop needs a real
check, reconstructed after the fact.

Key ideas
- Keep unattended runs in auto mode, not bypass permissions: the classifier still
  reviews each action for danger.
- The classifier never judges whether code is correct, only dangerous actions, so your
  verification bar stays where it was; set it by how unsupervised the run was.
- Start with the diff, not Claude's summary:
  - Run `/code-review` to walk the changes and flag issues.
  - Then read `git diff` yourself.
  - Read plan files first, then look for anything outside the plan.
- Tests as a gate, not a promise: the real gate is whether tests passed and whether
  Claude actually ran them or only claimed to. Wire it as a hook:
  - A stop hook that runs your tests and refuses to end the turn on a failure.
  - A post-tool-use hook that lints and type checks after every edit.
- `exit 2` feeds the failure straight back to Claude, which reads it and fixes it
  without being asked; the check fires every run whether or not you remember.
- Cold second opinion: open a fresh session or sub-agent to review the changed code
  with no memory of how it was built; it catches what the original run talked itself
  past.

Rules and traps
- Trap: a tidy summary reads fine while the diff touched a file you did not expect. A
  clean write-up is not proof of clean code.
- Verify headless runs by their JSON result and exit code.

Checklist (lesson recap)
- Read the diff yourself.
- Turn tests into a hook that gates the turn.
- Verify headless runs by JSON result and exit code.
- Get a cold second opinion on anything that matters.

---

### Lesson 9 - Plugins

A plugin packages a setup (skills, subagents, hooks, MCP) and moves it from person to
person instead of copy-pasting files between machines.

Key ideas
- One installable unit bundling: skills, subagents, hooks, MCP server configs, plus the
  longer tail: language server protocol servers, background monitors, themes, and a
  slice of `settings.json`. One version, one install.
- Install by name inside a session; Claude Code then tells you to run `/reload-plugins`.
- For a team, add a private marketplace once: a shared source plugins resolve through.
  Gives centralized discovery, version tracking and updates. Browse via the Discover tab.
- Components run alongside yours; a plugin does not overwrite your configuration.
  - Hooks stack: a plugin's PreToolUse hook and your own PreToolUse hook both fire on
    every tool call; neither replaces the other.
  - Skills, agents, and commands are namespaced under the plugin name, so no clashes.
  - A plugin may ship a `settings.json`, but Claude Code honors just two keys from it:
    the agent and subagent status line keys. The agent key promotes one of the plugin's
    subagents to the main thread, with its system prompt, tool restrictions, and model,
    so enabling a plugin can change default behavior.
- Manage everything a plugin added, and uninstall it, from the plugin panel.

Rules and traps (security)
- A plugin runs code on your machine with your privileges. Its hooks fire on every
  matching tool call. Installing for skills also gets you its PreToolUse and Stop hooks.
- Example risk: a community plugin could ship a Stop hook that calls a network endpoint
  every time, with nothing in your configuration warning you.
- Before install, check the plugin's details: Claude Code shows what it will install,
  estimates context cost, and warns that Anthropic does not control what is inside
  third-party plugins.
- Reviewed is not trusted: the in-app submission form posts to the community marketplace
  after Anthropic's automated review; the official marketplace is curated on a separate
  track. Automated review catches some things, not everything. Install plugins and add
  marketplaces only from sources you truly trust.

Packaging your own
- Use the same `.claude` shape; no restructuring:
  - One folder per skill.
  - One markdown file per subagent under `agents`.
  - `hooks/hooks.json` and `.mcp.json`, at the plugin root.
- Claude Code discovers components by directory convention.
- Optional manifest at `.claude-plugin/plugin.json` (name, version, description, author).
  Name is the only required field; it namespaces skills as `company-name:skill-name`.
  Version it like any other dependency so updates and tracking work.
- Without a manifest, components are still discovered by convention.

Commands and config shown
```
/plugin install org-name@plugin-name
```
```
/plugin marketplace add your-org/claude-plugins
```
```
{
  "name": "svg-splitter-review",
  "version": "0.1.0",
  "description": "Reviews the SVG Splitter repo",
  "author": {
    "name": "Lewis Menelaws"
  }
}
```
- `/reload-plugins` applies a change after install.

Takeaways: read before you install; package your `.claude` the moment it works.

---

### Lesson 10 - Course Quiz

- Captured content: heading "Claude Code in Action Quiz" and "11 questions" only.
- Source gap: the quiz questions, answer options and correct answers were not captured
  (page is about 178 bytes); nothing can be reported about the actual quiz items.

---

## 3. Exercises, Quizzes and Hands-On Tasks

Every lesson ends with an embedded YouTube "exercise" (video), and the course ends with
an 11-question quiz. Only titles and the written lesson text exist in the source.

| Lesson | Embedded item (title) | What it tests / reasoning per the written lesson |
|---|---|---|
| 1 | Steering Claude Code Through Hours-Long Sessions: Plan Mode, Compact, Rewind, Goals | Scope first then steer; directed compaction; rewind; checkable goals |
| 2 | Writing a CLAUDE.md That Claude Actually Follows | Lean file, specific/checkable rules, hard rules go to hooks |
| 3 | Build a Verification Skill So Claude Checks Its Own Work | Skill triggers by description, runs tests, reads diff, checks tests not weakened |
| 4 | Claude Code Permission Modes: When to Run Hands-Off with Auto Mode | Mode per job; auto = intent guard, stop hook = correctness guard |
| 5 | Claude Code Hooks: Turn "Usually Follows" Into "Cannot Skip" | Deterministic enforcement; PreToolUse JSON; exit 2 vs 1; redact via updatedInput |
| 6 | Automate Claude Code with Routines and Headless Mode | Routines first; -p, --bare, SDK only when more control needed |
| 7 | Claude Code on Every Pull Request: Code Review and the GitHub Action | Managed review vs custom action; tune with claude_args |
| 8 | How to Trust a Claude Code Run You Did Not Watch | Diff over summary; tests as hook gate; cold second opinion |
| 9 | Claude Code Plugins: Package a Setup and Ship It to Your Team | Read before install; hooks stack; manifest and namespacing |
| 10 | Claude Code in Action Quiz (11 questions) | Not captured |

Source gap: no transcripts, steps or answer keys for the nine video exercises or the
11-question quiz.

Worked scenarios the lessons themselves use (reasoning given in the text):
- "Never push to main": CLAUDE.md is hoped-for compliance; a PreToolUse hook blocks
  the action. Use the hook.
- "Refactor authentication" under auto mode: classifier passes broken-but-not-dangerous
  code, so add a stop hook that runs tests.
- Command containing an `sk_live_` secret: hook returns `updatedInput` with a
  placeholder; the work still runs, the secret does not get through.
- Compaction loses detail: SessionStart hook with `compact` matcher prints a summary of
  working files back into context.
- Daily rollup at 9:00 UTC in CI: GitHub Action with cron (plus `workflow_dispatch`),
  `--max-turns` cap, read-only tools.

---

## 4. Common Mistakes

| Mistake | Fix |
|---|---|
| Skimming the plan from plan mode | Read it fully and ask Claude to add what is missing before executing |
| Running `/compact` with no instructions | Add focus text, e.g. `/compact Focus on the --version flag implementation` |
| Writing a goal Claude's output cannot show | Make the condition checkable from the transcript (test results, type-check output) |
| Two sessions editing the same files | Give each its own worktree; use `.worktreeinclude` for git-ignored files |
| Letting CLAUDE.md grow without bound | Keep lean; delete lines you cannot justify; treat it like production code |
| Putting hard rules ("never push to main") in CLAUDE.md | Enforce with a PreToolUse hook that can block |
| Believing imports shrink context | Imports expand inline at launch; they only organize |
| Vague rules like "follow best practices" | State a specific, checkable rule with a path or pattern |
| Banning without a replacement ("Don't use default exports") | "Use named exports, not default exports" |
| Emphasizing every rule | Spend emphasis on the two or three rules that hurt most |
| Relying on remembering to run tests/review | Build a verification skill that fires from its description |
| Accepting green tests as proof | Also read the diff to confirm no test was weakened |
| Putting everything in `skill.md` | Keep it lean; put depth in `reference.md` and executables in scripts like `check.sh` |
| Using `exit 1` to block a hook | Use `exit 2`; exit 1 is non-blocking and Claude runs the command anyway |
| Using PostCompact to restore context | Use SessionStart with the `compact` matcher |
| `updatedInput` with only the changed field | Echo back all unchanged fields; it replaces the whole input object |
| Trying to block with PostToolUse | Too late, the tool already ran; use PreToolUse |
| Treating auto-mode classifier as a correctness check | It checks intent only; pair with a stop hook running tests |
| Using bypass permissions on a normal machine | Only inside an isolated container or VM |
| Using manual-prompting modes in CI | Use don't ask with pre-approved tools |
| Expecting `claude -p` to load hooks, skills, plugins, MCP, CLAUDE.md | `-p` skips auto-discovery; allow tools explicitly |
| Expecting a routine to run more often than hourly | Recurring schedule runs at most hourly; use another tool |
| Expecting a routine to push to main | Runs push only to `claude/` prefixed branches unless loosened per repo |
| Expecting Code Review to approve, block, or autofix | It only posts findings; apply locally with `/code-review --fix` |
| Letting an unattended GitHub Action loop forever or over-permit | `--max-turns` cap, non-asking permission mode, minimal allowed tools |
| Trusting Claude's summary of an unattended run | Start with `/code-review` and `git diff`; check for out-of-plan files |
| Trusting "I ran the tests" | Gate with stop hook (and post-tool-use lint/type check hook) |
| Installing plugins unread | Read hooks, agents, MCP servers first; plugin runs with your privileges |
| Assuming plugin hooks replace yours | They stack; both fire on every matching tool call |
| Assuming "reviewed" means "trusted" | Automated review is partial; install only from sources you truly trust |

---

## 5. Key Terms

| Term | Meaning |
|---|---|
| Plan mode | Read-only research; Claude proposes a plan without editing |
| Compact | Summarize the conversation, use summary as new context, delete old messages |
| Rewind | Revert to a checkpoint (one per user prompt); open with double escape on empty prompt |
| Summarize from here / up to here | Rewind options that compress after / before the checkpoint |
| Goal | `/goal` completion condition; evaluator reads the transcript; `/goal clear` cancels |
| Loop | Runs a prompt on an interval (fixed or self-paced); escape stops it |
| Worktree | Independent file tree per session; clean ones are auto-removed on exit |
| `.worktreeinclude` | Repo-root file listing git-ignored files to copy into each worktree |
| CLAUDE.md | Guidance file, not enforced; four locations that stack at launch |
| Managed policy / User / Project / Local | The four CLAUDE.md locations (org, personal global, team repo, git-ignored per repo) |
| Import | `@path/to/file.md` syntax; expanded inline at launch, no context saving |
| Emphasis budget | Limited use of IMPORTANT / YOU MUST so it still stands out |
| Skill | Folder with `skill.md` (name, triggering description, procedure); only descriptions preloaded |
| `reference.md` | Side file read only when depth is needed |
| `check.sh` | Example skill script Claude executes rather than reads |
| Hook | Deterministic code at a fixed point in the loop; can guarantee behavior |
| PreToolUse | Before a tool call; can block (enforcement primitive) |
| PostToolUse | After a successful tool call; format / lint / type-check |
| Stop / SubagentStop | When Claude / a sub-agent wants to end; can refuse |
| SessionStart (`startup`, `compact`) | Primes environment; `compact` matcher re-injects context after compaction |
| `permissionDecision` | PreToolUse JSON field: allow, deny, ask (defer for `-p` only) |
| `updatedInput` | Rewrites a tool call; replaces the whole input object |
| Exit code 0 / 2 / other | Success / blocking error (stderr to Claude) / non-blocking (logged) |
| Manual, Accept edits, Plan, Auto, Don't ask, Bypass permissions | The six permission modes |
| Classifier | Separate model in auto mode that reviews each action for intent escalation |
| Routine | Saved prompt + repo + connectors run on Anthropic's cloud on cron, HTTP POST, or GitHub event |
| `/schedule` | Create a routine from inside Claude Code in plain language |
| Headless mode (`-p` / `--print`) | One-shot, no UI, pipes via stdin/stdout |
| `--output-format json` + `--json-schema` | Schema-constrained output; result in `structured_output` |
| `claude --resume` | Resume a captured session ID |
| `--bare` | Deterministic mode for CI |
| Agent SDK | TypeScript/Python library with `query`, `allowedTools`, system prompt, permission mode |
| Code Review | Managed, Anthropic-hosted PR review via Claude GitHub app; never approves or blocks |
| `/code-review` (`--fix`) | Local review of a diff; `--fix` applies findings to the working tree |
| `/install-github-app` | Sets up the GitHub app and API key secret (repo admin needed) |
| `anthropics/claude-code-action@v1` | The GitHub Action; inputs incl. `prompt`, `claude_args`, `trigger_phrase` |
| `claude_args` | String of CLI args passed through (e.g. `--max-turns 5`) |
| Cold second opinion | Fresh session/sub-agent reviews code with no build history |
| Plugin | One installable unit: skills, subagents, hooks, MCP, LSP, monitors, themes, settings slice |
| Marketplace | Shared source plugins resolve through (`/plugin marketplace add`) |
| `.claude-plugin/plugin.json` | Optional manifest; name is the only required field |
| `hooks/hooks.json`, `.mcp.json` | Plugin-root files for hooks and MCP server configs |
| `/reload-plugins` | Applies plugin changes after install |

---

## 6. Exam-style Self-Test

1. Q: Why move "never push to main" out of CLAUDE.md?
   A: CLAUDE.md is guidance; a PreToolUse hook is code that runs before the action and can
   block it, giving real enforcement.

2. Q: Do imports (`@.claude/conventions/testing.md`) reduce context load?
   A: No. Imported files are expanded inline at launch; imports only organize.

3. Q: What is the correct way to use `/compact` in a long session?
   A: Add instructions after it, e.g. `/compact Focus on the --version flag implementation`,
   so the summary keeps what matters.

4. Q: What constraint applies to `/goal` conditions?
   A: The evaluator only reads the transcript, so the condition must be checkable from output
   Claude produces (e.g. test results).

5. Q: How do you prevent two parallel agents from conflicting on the same codebase?
   A: Use worktrees, one independent file tree per session; `.worktreeinclude` copies
   git-ignored files like env files into each.

6. Q: A verification skill reads the diff in addition to running tests. Why?
   A: To confirm no test was weakened just to make things pass; done means gates run and
   observed, not code that looks right.

7. Q: What does the auto mode classifier check, and what can't it catch?
   A: It checks intent (blocks deploys, force pushes, piping downloads to a shell, sending
   sensitive data out, destroying session files). It does not check correctness, so pair it
   with a stop hook running tests.

8. Q: Which permission mode suits CI pipelines and overnight batches?
   A: Don't ask: only pre-approved tools are allowed, everything else is auto-denied with no
   prompt.

9. Q: A hook script exits 1 to stop a dangerous command. What happens?
   A: Nothing is blocked; exit 1 is non-blocking and Claude runs the command. Use exit 2.

10. Q: How do you re-inject context after compaction?
    A: A SessionStart hook with the `compact` matcher (not PostCompact).

11. Q: How can a PreToolUse hook let a command run but strip a secret from it?
    A: Return `updatedInput` with the rewritten command (echo back unchanged fields, since it
    replaces the whole input object).

12. Q: Name the three limits of routines.
    A: Research preview; recurring schedule runs at most hourly; each run starts from a fresh
    clone of the default branch and can only push to `claude/` prefixed branches unless
    loosened per repo.

13. Q: What does `claude -p` skip, and how do you get structured output from it?
    A: It skips auto-discovery of hooks, skills, plugins, MCP servers, and CLAUDE.md. Use
    `--output-format json` with `--json-schema`; read `.structured_output` via `jq`.

14. Q: Does managed Code Review fix or approve PRs?
    A: No. It posts inline findings only, never approves or blocks, and has no autofix; apply
    fixes locally with `/code-review --fix`.

15. Q: When reviewing an unattended run, what do you look at first and why?
    A: The diff (`/code-review`, then `git diff`), not Claude's summary, because a tidy summary
    can hide an unexpected file change; then gate tests with hooks and get a cold second
    opinion.
