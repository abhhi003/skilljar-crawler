# Module Wrap-up

## Eight takeaways, one per enabling objective

RecapEight takeaways·3 min

 

### Eight takeaways, one per enabling objective

 

1 

###### When a prompt fails, the failure type tells you which technique is missing.

 

Output in the wrong shape points to a missing output constraint, drift across turns points to an underspecified system prompt, and a hallucinated structure points to the absence of few-shot examples. The instinct to reword the instruction and try again rarely works, because none of those failures are phrasing problems. Diagnose the failure type first, then add the technique that addresses it. When prompt-level instructions are not enough because untested inputs still break the parser, move output control into the API with structured outputs: JSON outputs constrain the final response against a schema, and strict tool use validates the arguments Claude passes to your tools, at the cost of first-call compilation latency and added input tokens.

 

2 

###### Match the reasoning depth to the task before you tune the prompt.

 

Enable reasoning only where a reasoning pass changes the answer and calibrate the effort setting to the problem rather than raising it on every call. Remember that thinking blocks return to the API unchanged or the next request fails. Choosing which model to run, as distinct from whether to enable reasoning, is taught in the MSO Foundations module that precedes this one.

 

3 

###### A stream ending is not a message completing.

 

Streaming buys perceived latency at the cost of assembling the response yourself from partial events. Act on a block only after it closes, commit a turn to history only after message_stop, and on an interrupted stream discard the partial turn and retry. The failure mode to recognize is a tool-use error on a retry that traces back to a half-built block from a dropped stream, not to the schema.

 

4 

###### Every wrong-tool selection traces back to the schema, and most of the time to the description.

 

Claude picks a tool by reading the description field and matching it against the user's request, which means two tools that both say "use this to find information" are indistinguishable from Claude's side even when the input schemas look nothing alike. The one sentence that resolves most wrong-tool bugs is the exclusion condition: a line in every description naming when not to call the tool, written into the schema at design time rather than after the first wrong call shows up in a log. When someone else has already written the tools, MCP lets you connect a maintained server instead of authoring every schema by hand, but each connected server adds its tool definitions to the context window whether the tools are used, so connect deliberately and control loading cost.

 

5 

###### Context is a fixed budget, and tool outputs spend it faster than anything else in the loop.

 

Production tool outputs run three to five times longer than the fixtures used in development, so a session that holds together cleanly across fifty turns in testing can hit the ceiling at turn eight once it ships. Pruning, compaction, and subagent handoffs each buy back headroom in different ways, and the one to apply depends on whether you still need the earlier state. When tool selection starts degrading after a fixed number of turns, the window is the first place to look, not the schema.

 

6 

###### The workflow-or-agent decision sets the cost of everything that follows, and human checkpoints belong in the design.

 

A workflow is the right call when you can write the exact steps in code, and an agent is the right call when you can specify the goal and the tools but not the path between them. Choosing wrong in either direction only surfaces in production: agents where workflows would do add context cost and behavior that lives in transcripts, and workflows where agents are needed break the first time an input falls outside the path. If a tool can take an irreversible action, the human-in-the-loop checkpoint goes in before the loop is wired, not after the first write reaches a customer environment.

 

7 

###### Memory scope is decided by the shape of the session, not by what is easiest to implement.

 

In-context memory is the simplest pattern to write, which is why it is also the one that fails earliest when production sessions turn out to be shorter and more numerous than the long continuous sessions used in development. External storage adds latency but the state survives across sessions, summarized memory cuts cost but loses anything the summarizer prompt did not preserve, and stateless is correct for jobs that complete and close. The refactor from in-context to external under production pressure takes about an hour, and making the same choice deliberately at design time takes about twenty minutes. Carrying repeatable instructions across tasks is a separate problem from carrying state, and the pattern for it is a Skill: a markdown file Claude loads on demand by matching its description, rather than instructions injected into every session.

 

8 

###### Calculate the cost of a multimodal input before you write the ingestion code and match the API to the workload.

 

An image costs ⌈width / 28⌉ × ⌈height / 28⌉ visual tokens, and the per-image ceiling differs by model tier. A high-resolution original on the newest models can cost many times what a thumbnail costs in your test set, so the formula needs to run against the largest input you expect in production rather than the inputs you have on hand. Inline base64 fits one-off images, the Files API fits assets reused across requests, and the Message Batches API handles offline work at lower per-token cost in exchange for non-deterministic latency. The mistake worth avoiding is calling the synchronous API in a loop and treating that as batching.

 

What comes next

 

This module established the Developer primitive library, including five interaction types that all subsequent Developer modules draw from. The patterns introduced here, which include prompting craft, tool schemas, context engineering, agent construction, memory scoping, and multimodal ingestion, form the foundation for every module that follows.

 

#### Sources

 

- Claude 101 (Skilljar): Prompting foundations, tool-use basics, agents and workflows overview, context window concepts. 
- Claude Code 101 In Action (Skilljar): Context management (/compact, /clear), Claude Code agent loop, production agent patterns. 
- AI Fluency Framework Foundations (Skilljar): Prompting techniques, few-shot examples, constraint specification. 
- Building with the Claude API (Skilljar): Tool schemas, message block structure, streaming, structured outputs, Files API, batch API, agent construction. 
- platform.claude.com: Canonical reference for tool-use, agents, context, MCP, API mechanics. Pull at publish and re-verify. 
- Anthropic Blog: "Building Effective Agents": Workflow sub-patterns (chaining, routing, parallelization, evaluator-optimizer), agent design guidance.

 

#### You can now take a Claude prototype into production.

 

Production-ready prompts, tool-use loops, streaming, context and memory management, and checkpointed agent loops now hold up under real usage.

## Key terms from this module

GlossaryKey Terms·3 min

 

### Key terms from this module

 

Alphabetical. Click a term to expand its definition.

 Claude Agent SDK

A managed agent runtime distributed as @anthropic-ai/claude-agent-sdk (Typescript) / claude-agent-sdk (Python). It gives a partner programmatic access to the same agent loop that powers Claude Code: iteration, tool execution, observation, termination, so the partner can embed an agent inside their own product instead of running Claude Code in a terminal. Distinct from the Anthropic SDK, which is a thin convenience wrapper over the API and does not run an agent loop.

 Context Window

The total number of tokens a model can process in a single request, including the system prompt, conversation history, tool definitions, tool results, and the model's own output. When the running total reaches the limit, earlier content must be removed or summarized before new content can be added.

 Function signature

Function signature is a programming term that means the declaration of a function: its name plus the list of parameters it accepts, including their names, types, and any default values.

 HITL

Human-in-the-loop refers to inserting a human review or approval step into an automated process before consequential action is taken.

 Refactor

Refactor refers to changing the internal structure of code without changing what it does from the outside. You reorganize, rename, or rewrite the implementation to make it cleaner, faster, easier to test, or easier to extend, but the behavior the rest of the system sees stays the same.

 SOC 2

Service Organization Control 2 is an audit framework developed by the American Institute of Certified Public Accountants (AICPA) for evaluating how a service organization handles customer data. It is the standard most commonly cited when a SaaS vendor or cloud service provider is asked to demonstrate that their security practices meet a recognized bar.

 State

State is the information an agent carries between turns: the conversation so far, what the user asked for, results from earlier tool calls.

 Stop_reason

A field in the API response that tells your code why the model stopped generating. The two values most relevant to agentic loops are end_turn, which means Claude has finished and is not requesting any further action, and tool_use, which means Claude has issued one or more tool_use blocks and is waiting for results before continuing.

 Subagent

A separate agent instance spun up by an orchestrating agent to handle a discrete subtask. Subagents do not inherit conversation history, skills, or context from the parent session, each starts clean and must be configured explicitly with the instructions and tools it needs. Results are returned to the orchestrator, which incorporates them into the broader task.

 Token

The unit Claude uses to measure and process text. The characters-per-token average depends on the tokenizer of the model at hand and differs between model generations. Treat any chars-per-token rule of thumb as model-dependent and confirm current tokenizer behavior at build time. Tokens are consumed by everything in the context window: prompts, responses, tool schemas, and tool results. They are the basis for both pricing and context budget calculations.

 Tool_use_block

A content block returned by the assistant when Claude wants to call a function. Contains the tool name, a unique ID, and the input arguments Claude wants passed to your code. Every tool_use block must be answered by a matching tool_result block in the immediately following user turn, with the same ID preserved exactly.

## Congrats! You’ve successfully completed this module.

Module CompleteDeveloper Path·2 min

 

### Congrats! You’ve successfully completed this module.

 

You can now write production-ready prompts, wire a tool-use loop that survives real conditions, handle streaming safely, manage context and memory at scale, and build an agent loop with the right checkpoints in the right places. **The engineering decisions in this module are the ones that separate a prototype from a system that holds up in production.**

 

0 of ? checkpoints passed

 

M1

 

MSO Foundations

 

Tokens, context windows, sampling, model tiers, prompting modes, and the API transport mechanics.

 

M2

 

Production-Grade Prompting, Agents & Tool-use

 

Production-ready prompts, tool-use loops, streaming, context and memory management, and checkpointed agent loops.

 You Are Here

 

M3

 

Claude Code, MCP & Integration

 

Permission modes, durable project context, plugin packaging, and MCP integration without leaking credentials.

 Up Next

 

M4

 

Production Engineering, Evals, and Security

 

Evals, tracing, failure handling, cost and orchestration budgets, and security boundaries that hold in production.

 

M5

 

Accelerators and IP Contribution

 

Package accelerators, prepare verifiable contributions, choose deployment platforms, and mark trust boundaries.

 

Start Module 3 → Return to course home

  

#### Module 2 complete.
