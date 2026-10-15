# Production-Grade Prompting, Agents & Tool Use - Study Notes

Module 2 of the Developer course. Source: 11 lessons (orientation, 8 teaching topics, a cumulative debug task, wrap-up and glossary). Java snippets are illustrative client-side logic only; JSON shapes are kept as the course shows them.

---

## 1. Big Picture

- Writing code that uses Claude is different from using Claude to write code. The module is about the engineering decisions around the model, each one preventing a specific production failure that dev testing hides.
- Recurring "build": an integration that worked in development (short sessions, small fixtures, forgiving tests) must survive longer sessions, bigger tool outputs, interrupted streams, cost/latency limits, cross-session memory and irreversible actions.
- Eight enabling objectives: prompts, extended thinking, tool schemas and the loop, streaming, context engineering, agent construction (with HITL), agent memory, multimodal and batch ingestion.
- Recurring diagnostic theme: the symptom shows up somewhere other than the cause (wrong-tool symptom caused by a full context window; retry error caused by a dropped stream; wrong output shape caused by a missing constraint).
- Recurring structural rules: the API enforces block pairing (tool_use/tool_result), thinking blocks must round-trip unchanged, a stream is only complete at message_stop.
- Recurring design-time rule: decide context budget, memory scope, workflow-vs-agent, and HITL points at design time, not after the first incident.

```
                      Production-grade Claude integration
                                     |
   +---------------+-----------------+------------------+----------------+
   |               |                 |                  |                |
 PROMPTING     TOOL USE          STREAMING         CONTEXT / MEMORY   INGESTION
 system prompt  schema: name,     events -> blocks   window budget      images (28x28
 XML, few-shot  description,      commit only at     prune/compact/     patches), PDFs
 output         input_schema      message_stop       clear/subagents    Files API
 constraint     loop + pairing    discard partial    prompt caching     Batches API
 structured     MCP (who owns     turn on drop       memory scope       (async, cheap)
 outputs        the schemas)            |            Skills
   |               |                  |                  |
   +---- extended thinking: carry thinking blocks back unchanged -----+
                                     |
                          AGENT = loop + tools + context
                 workflow-or-agent -> wiring path -> HITL -> exit conditions
                 (Messages API loop | Agent SDK | Managed Agents)
                 regulated-data constraint picks endpoint/credentials first
```

---

## 2. Course Sections

### 2.1 Orientation

Key ideas
- Audience: developer taking a prototype to production; practical, code-forward; no programming fundamentals taught.
- Engineer's responsibilities: programmatic integration, reliable output handling, robust production deployment.
- Each topic addresses a failure mode that is cheap to avoid up front and expensive to find after development.
- Prerequisite: Module 1 (MSO Foundations) covers tokens, context windows, sampling, model tiers, prompting modes, API transport mechanics.

Rules and traps
- Examples in the course are illustrative and often fictitious; verify against Anthropic docs because products change quickly.

### 2.2 Prompting Craft (20 min + 5 min Watch Out)

Key ideas
- A prompt that works interactively often breaks in production on untested inputs. The fix is to find the one missing structural piece, not to add words.
- Four techniques: system prompt, XML tags, few-shot examples, output constraints.
- Diagnosis table (observed failure -> missing piece):

| Observed | Missing | Why it fixes |
|---|---|---|
| Wrong shape (sentence instead of label, prose instead of JSON) | Output constraint | Controls form independent of content |
| Content off: scope drift, tone shift, worse deeper in conversation | System prompt (or a more specific one) | Behavioral contract that holds across turns |
| Task right but structure invented | Few-shot examples | Shows the pattern; description alone cannot pin the exact structure |
| Clean on tested inputs, breaks on a variant | A constraint covering the variant | Prompt only validated on a narrow input set |

- System prompts: persistent instruction layer; define role, output format, rules that must not change between conversations.
- XML tags: use when the prompt mixes inputs with instructions (e.g. code plus docs). Use descriptive names such as `<my_code>`, `<docs>`; no need for official tag names.
- Few-shot: one correct input-output pair lets Claude infer the pattern. Wrap in consistent XML such as `<sample_input>` and `<ideal_output>`. Reuse examples from your highest-scoring evaluation outputs.
- Output constraints: last line of defense before the parser. Specify field names, types, length limits, whether to include preamble, what to do when data is absent. Use structured output features when the format must be machine-readable.
- When to stack / simplify / diagnose:
  - Stack all four: clearly defined output contract, well-specified formats, edge cases coverable by examples.
  - Simplify: a simple task needing one technique (a "summarize this paragraph" prompt does not need few-shot plus a schema).
  - Diagnose first: the prompt grows longer each iteration rather than more precise; after five re-prompts and still wrong, diagnose the failure type.
- Iteration loop: name the failure, add the one matching technique, re-run; if it still fails, diagnose again.

Worked example (classifier)
- Bare prompt: system "You are a support classifier. Classify the ticket." Output varies: "Billing", "billing", a full sentence. Router breaks. Matches row 1 (output constraint).
- Fixed prompt: system sets "exactly one of: BILLING, TECHNICAL, ESCALATION. Return only the label. No other text." plus two `<sample_input>`/`<ideal_output>` pairs; ticket in `<ticket>` tags. System prompt = contract, XML = boundaries, few-shot = exact casing/format.

Structured outputs (move control from prompt into the API)
- A prompt is a request; a model can still return a stray sentence, wrong field name or malformed JSON.
- Structured outputs = constrained decoding: only tokens that keep output valid against your JSON schema are allowed.
- JSON outputs: set `output_config.format` with type `json_schema` plus your schema; constrains the final response text. Removes parse-and-retry code.
- Strict tool use: set `strict` to `true` on a tool definition; arguments Claude sends are validated against `input_schema` before your code runs. Use in agentic loops where bad arguments would crash a function or trigger a wrong action.
- Can be used on their own or together in the same request.

Rules and traps
- Costs of constrained generation:
  - First request on a new schema is slower (schema compiled to a grammar); compiled grammars cached 24 hours from last use. Constantly changing schemas pay repeatedly.
  - Input token count rises: the API adds a system prompt describing the format, billed as input.
  - A guaranteed schema is not guaranteed success: `stop_reason` `refusal` (safety decline) and `max_tokens` (truncated mid-structure) still return non-matching output. Always check `stop_reason`.
  - JSON outputs do not combine with message prefilling.
- Rewording does not fix a missing structural piece ("please format this correctly" will not fix drift).

Watch Out: six revision passes, each longer
| Pass | Added | Result |
|---|---|---|
| 1 | "Classify as billing, technical, or escalation." | Full sentences; parser breaks |
| 2 | "Be concise." "Use only the category name." | Case varies; router breaks on case mismatch |
| 3 | Three paragraphs describing categories | Good on simple tickets; "billing/technical" on ambiguous; parser breaks on slash |
| 4 | "Never return two categories." "If ambiguous, choose most likely." | Works on 80%; full explanation on dual-fit tickets |
| 5 | Two more paragraphs on edge cases plus precision reminder | Over 2,000 characters output per call; latency up, accuracy not |
| 6 | Replaced instructions with a JSON schema and two few-shot examples | `{"category": "billing"}` every ticket; latency drops; accuracy on ambiguous matches Pass 4 |

- Pass 4 = diagnostic failure (added description instead of a constraint). Pass 5 = engineering failure (verbose prompt yields verbose output; model calibrates response length and style to the input). Two different failures; the second can appear even after the first is resolved.
- Claude does not need a description of a billing ticket; it needs to know the only acceptable response is one word in capitals.
- Rule: if three re-prompts in a row have not worked, stop adding text and diagnose.

Java: gate parsing on stop_reason even with structured outputs (illustrative)
```java
// Illustrative: the JSON body shape is the course's; the client logic is plain Java.
// "output_config.format" with type json_schema constrains the final response text.
String body = """
  {
    "model": "<model-id>",
    "max_tokens": 1024,
    "output_config": { "format": { "type": "json_schema", "schema": { /* your schema */ } } },
    "messages": [ { "role": "user", "content": "<ticket>I was charged twice.</ticket>" } ]
  }""";

HttpResponse<String> resp = http.send(
    HttpRequest.newBuilder(URI.create(MESSAGES_URL))
        .header("content-type", "application/json")
        // plus your auth and version headers per the API docs
        .POST(HttpRequest.BodyPublishers.ofString(body)).build(),
    HttpResponse.BodyHandlers.ofString());

// A schema guarantee is not a success guarantee:
// stop_reason "refusal" or "max_tokens" can still produce non-matching output.
String stopReason = readStopReason(resp.body());   // helper you write; parses top-level stop_reason
if ("refusal".equals(stopReason) || "max_tokens".equals(stopReason)) {
    handleNonConformingResponse(stopReason);       // do not blindly parse
} else {
    Ticket t = parse(resp.body());
}
```

### 2.3 Extended Thinking (12 min)

Key ideas
- Prompting techniques shape what Claude produces; extended thinking shapes how much work it does before answering.
- Reasoning comes back as its own thinking block just ahead of the answer block. On the newest models the thinking content is omitted by default; request a readable summary via the display setting.
- On current models reasoning is adaptive: enable with the `thinking` parameter where not already on by default; the model decides how much reasoning each request needs. Tune depth with the effort setting, not a fixed token budget.
- `budget_tokens` is deprecated and returns a 400 error on the newest model generations.
- Thinking tokens cost the same as output tokens. Simple task at high effort = paying for accuracy you do not need.

When to use
| Task shape | Call | Reason |
|---|---|---|
| Multi-step reasoning, several constraints at once (math derivation, multi-hop logic, planning dependent actions) | Enable, effort matched to depth | Reasoning pass works through dependencies otherwise skipped |
| Mechanical or lookup (classification, format conversion, field extraction, short facts) | Leave off | No accuracy gain; a bare prompt with output constraint is right |
| Agentic loops planning across several tool calls | Enable; budget for the planning step, not per call | Reasoning before a plan reduces wrong-tool selection downstream |

Rules and traps
- Carry-back rule: with extended thinking on and tools in use, every thinking block must go back to the API exactly as received on the next turn. Each block has a signature confirming it was not tampered with; edit, summarize or drop it and the API rejects the request.
- Redacted thinking blocks: contents encrypted, not human-readable, still returned untouched.
- Structural requirement, not a prompting choice. Most common slip: stripping thinking blocks to save context. If accumulated reasoning is the worry, use context engineering instead.
- Model selection (as distinct from enabling reasoning) is taught in Module 1.
- Handles well: hard reasoning/planning where a wrong answer is expensive. Adds cost: carry-back and an effort setting to calibrate. Use a different approach: classification/extraction/format tasks.

Java: round-trip the assistant content verbatim (illustrative)
```java
// Whatever came back in response.content (text, tool_use, thinking, redacted_thinking)
// is appended to history as-is. Do NOT filter by block type.
List<JsonNode> assistantContent = responseContentBlocks;   // exactly as received
history.add(Map.of("role", "assistant", "content", assistantContent));
```

### 2.4 Tool Use and Schema Design (20 min + 5 min Watch Out)

Key ideas
- Claude does not run tools. It reads definitions, decides which fits, and tells your application what to call with what inputs. Your app executes, returns the result, Claude continues. The boundary between Claude's job and your code is where most tool-use bugs live.
- Loop steps: define schema -> send message -> tool_use block -> execute tool -> return result -> Claude continues. The loop is not automatic; step 4 (execute) is yours. A systematic miss points to the schema definition step.
- Four block types:

| Block | Role | Contains | Critical rule |
|---|---|---|---|
| text | Assistant | Prose | May accompany tool_use in the same turn; preserve the full content array when appending to history or the context Claude relies on is corrupted |
| tool_use | Assistant | Tool name, unique ID, input arguments | Must be answered by a tool_result with the same ID in the immediately following user turn |
| tool_result | User | Matching tool_use_id, result content, optional `is_error` (true on failure) | `tool_use_id` must match exactly; matters when one turn issues several calls and results arrive out of order |
| thinking | Assistant (extended thinking only) | Reasoning | Pass back unchanged; signature; redacted blocks too |

- Invariant: every tool_use from an assistant turn needs a tool_result in the immediately following user turn. Missing, mismatched ID, later turn, or out of order = API validation error. Not fixable by prompting.
- tool_result blocks are sent in the user role even though your application generates the content; role marks who sends the message to Claude.
- Schema anatomy: name (specific, `get_account_balance` beats `get_data`), description (the part Claude reads to decide), input_schema (JSON Schema parameters).
- Description in two parts: when to use and when not to. "Use this to find information" causes wrong selections. "Retrieve the current balance for a specific account ID and do not use this for transaction history" gives an exclusion condition.
- Overlapping parameter types between tools is the most common source of wrong-tool calls.

Schema design decisions
| Decision | Handling | Why |
|---|---|---|
| Subtask dependency | Dependent calls run in sequence (separate turns); independent subtasks let Claude issue multiple tool_use blocks in one turn that your code runs concurrently | The one decision that changes schema design. Current models default to parallel calls when independent. `disable_parallel_tool_use` forces one call per turn |
| Required fields | Only when the call makes no sense without it; put in `required` array | Marking everything required forces fabricated values |
| Optional fields | Sensible defaults or absence carries meaning; leave out of `required`, give defaults in function signature | Lets Claude omit rather than guess |
| Description length | Three to four sentences: what it does, when to reach for it, what it returns; examples of valid inputs where format matters | Too short -> guessing; too long -> trigger conditions buried |
| Overlapping parameter types | Add disambiguating language naming domain/trigger to each description | Routing is on name plus description, parameter types secondary; identical signatures collapse routing to description alone |

Worked example
- `search_knowledge_base` vs `get_cached_result`, both "use this to find information"; wrong selections on ambiguous inputs.
- Fix: one added sentence per description. search_knowledge_base: do not use if a prior search in this session already covers the question. get_cached_result: only use if search_knowledge_base was called earlier in the conversation for the same query.
- Trap: exclusion logic relies on complete conversation history in each request; truncated history makes it silently fail.
- Every extra tool increases surface Claude reasons over. Poor fit: two similar tools needing ever-longer descriptions to stay apart -> merge into one tool with a type parameter.

MCP (Model Context Protocol)
- Standardized layer that moves tool definitions and execution out of your application code into dedicated servers. If a server exists (GitHub example), connect instead of writing every schema and function.
- The loop does not change: tool_use, execute, tool_result, pairing rules all apply. Setup differs: the MCP client sends a `ListToolsRequest`, receives the tool list, passes it to Claude. Same description-based routing.
- MCP servers add tool definitions to context even when unused; register only servers in active use; check cost against the window limit.
- API MCP Connector: `mcp_toolset` object in the tools array with a `default_config` block (all tools on the server) and per-tool configs keyed by tool name.
  - `defer_loading` (boolean; in `default_config` or per-tool): delays loading a definition until needed.
  - `enabled` (boolean): turn individual tools on/off (allowlist/denylist).
  - Requires beta header `mcp-client-2025-11-20`; without it `mcp_toolset` config will not apply as described.
- Transports: stdio (local; app spawns subprocess, talks over stdin/stdout) and Streamable HTTP (remote; POST client-to-server, optional GET-based SSE stream for server-initiated messages). Older SSE-only transport is deprecated; new integrations use Streamable HTTP. After connection, application code treats both identically.
- Connector constraint: only HTTP-exposed servers are supported through the connector.
- Use MCP when a well-maintained server exists that covers the operations you need and tracks the service's current API. Write schemas manually when no server covers it or you need precise control over scope and description quality (but allowlisting/denylisting via `MCPToolset` already controls scope). Use both: MCP for breadth, description tuning for precision; narrowing the tool set and sharpening descriptions are two separate levers.
- Source gap: stdio is described two ways: "stdio servers require managing the MCP client connection yourself via the SDK" and "local stdio servers require Claude Desktop or Claude Code as the client; they cannot be connected directly through the API". The common point: the API MCP Connector does not handle stdio.

Watch Out: the description that sent Claude to the wrong tool
- Dialogue: `search_docs` ("Use this to find information about the product.") vs `get_context_summary` ("Use this to retrieve relevant information from the current session."). Identical from Claude's perspective.
- Fix: one sentence to say when to use, one to say when not to, on BOTH tools. search_docs: not already present in this conversation; do not call if answer is in current session context. get_context_summary: only if answer already in current session; do not use for new information.
- Claude reasons over all registered descriptions in the context of the full conversation; with similar descriptions it picks on small surface differences. If exclusions cannot separate them, merge with a type parameter.

Java: the tool-use loop skeleton (illustrative; stop_reason and block names per course)
```java
// Illustrative. Shapes: assistant content = array of blocks; tool_result blocks go in a USER turn.
while (true) {
    JsonNode resp = callMessagesApi(history, toolsJson);          // HttpClient POST, your helper
    List<JsonNode> content = blocks(resp);

    // Keep the FULL content array (text + tool_use + thinking), not only the tool_use blocks.
    history.add(message("assistant", content));

    String stop = resp.path("stop_reason").asText();
    if ("end_turn".equals(stop)) return resp;                     // Claude is done
    if (!"tool_use".equals(stop)) return handleOther(stop, resp); // refusal, max_tokens, etc.

    // ALL tool_use blocks from this turn are answered together in ONE immediately-following user turn.
    List<JsonNode> results = new ArrayList<>();
    for (JsonNode b : content) {
        if ("tool_use".equals(b.path("type").asText())) {
            String id = b.path("id").asText();                    // must be echoed exactly
            try {
                String out = executeTool(b.path("name").asText(), b.path("input"));
                results.add(toolResult(id, out, false));
            } catch (Exception e) {
                results.add(toolResult(id, e.getMessage(), true)); // is_error: true
            }
        }
    }
    history.add(message("user", results));
}
```

### 2.5 Streaming Responses (16 min + 5 min Watch Out)

Key ideas
- Streaming sends a series of events describing the message as it is built; you reassemble blocks. The final message is identical to a non-streamed one, but assembly and early-stop handling are your job.
- Each event is a small message describing one change; your handler applies it to the partial state. No live object is held open.

Event sequence
| Event | Signals | Handler does |
|---|---|---|
| message_start | New message; shell with empty content and initial usage | Create empty content array |
| content_block_start | Block opening, with type (text, tool_use, thinking) and index | Create slot at that index; tool_use opens with name and id, no input yet |
| content_block_delta | Incremental piece: text fragment, JSON input fragment, thinking fragment | Append to block at that index; tool inputs are partial JSON strings across deltas, not parseable until the block closes |
| content_block_stop | Block at this index complete | Finalize; for tool_use, first moment input is parseable |
| message_delta | Top-level changes: stop_reason and final usage | Record stop_reason |
| message_stop | Stream complete | Assembled content is the finished message; treat as non-streamed |

Rules and traps
- Do not act on a partial block: parsing or running a tool before content_block_stop means malformed JSON or missing arguments. Collect deltas, act only after content_block_stop for that block.
- Add the streamed assistant turn to history only after message_stop with every block assembled. A half-built tool_use in history makes the next request fail the pairing rules.
- Early stop (dropped connection, timeout, client disconnect): partial text is cosmetic; a partial tool_use is structural corruption.
  - Track completion on purpose: usable only once message_stop arrives; before that, provisional.
  - On interruption, throw away the partial assistant turn and retry the request.
  - Check `stop_reason` from message_delta before continuing a loop: `tool_use` means assembled tool calls are ready; anything else is a different path.
- Handles well: long responses, user-facing UIs. Adds complexity: manual assembly, no partial acts, explicit interruption handling. Use a different approach: short responses or backend jobs, use a non-streamed call.

Watch Out postmortem
- Handler accumulated deltas and appended the turn when its read loop ended. Fast local tests always reached message_stop. In production a network blip ended a stream after tool_use opened and got part of its JSON, before content_block_stop. Loop ended as usual, turn appended with truncated JSON input; the retry sent it in history and the API rejected it with a validation error pointing at the malformed tool_use.
- Team spent an afternoon on schema and retry logic because the error surfaced on the retry; the cause was upstream: "the read loop ended" is not "the message is complete".
- Gate the history append on message_stop, discard partial turn, retry from the last complete turn. When a tool-use error appears on a retry, check whether the prior turn came from a stream before touching the schema.

Java: stream assembly with commit gate (illustrative; event names per course)
```java
// Illustrative only. Event type names and ordering are as listed in the course.
class StreamAssembler {
    private final Map<Integer, StringBuilder> inputJson = new HashMap<>();
    private final Map<Integer, BlockDraft> blocks = new TreeMap<>();
    private String stopReason;
    private boolean messageStopSeen = false;

    void onEvent(String type, JsonNode ev) {
        switch (type) {
            case "message_start"       -> blocks.clear();
            case "content_block_start" -> blocks.put(ev.path("index").asInt(), BlockDraft.from(ev));
            case "content_block_delta" -> appendDelta(ev.path("index").asInt(), ev.path("delta"));
            case "content_block_stop"  -> finalizeBlock(ev.path("index").asInt()); // only now parse tool input JSON
            case "message_delta"       -> stopReason = ev.path("delta").path("stop_reason").asText(null);
            case "message_stop"        -> messageStopSeen = true;
            default -> { /* ignore unknown event types */ }
        }
    }
    boolean isComplete() { return messageStopSeen; }
}

Message runTurn(List<Message> history) {
    StreamAssembler asm = new StreamAssembler();
    try {
        readSseStream(request(history), asm::onEvent);   // your HttpClient SSE reader
    } catch (IOException dropped) {
        // Interrupted: DISCARD the partial turn. Nothing is appended to history.
        return retryFromLastCompleteTurn(history);
    }
    if (!asm.isComplete()) {                              // loop ended without message_stop
        return retryFromLastCompleteTurn(history);
    }
    Message assistant = asm.build();
    history.add(assistant);                               // commit only after message_stop
    return assistant;
}
```

### 2.6 Context Engineering (16 min + 5 min Watch Out)

Key ideas
- Context window = full span the model takes in: prompt, conversation, every tool result. Every tool result is appended and stays for the rest of the session. In a 10-20 tool-call agent session the window fills fast; the agent then compacts (losing detail) or stalls.
- Context engineering = deciding in advance what goes into the window, what comes back as a summary, and what never enters.
- Model selection: four tiers (Fable, Opus, Sonnet, Haiku). Sonnet is the balanced default; Haiku for speed/cost on tasks within its envelope; Opus for demanding work above Sonnet; Fable is Anthropic's most capable model (complex reasoning, advanced coding, research synthesis, sophisticated agentic workflows). Confirm lineup and identifiers at platform.claude.com/docs at build time.
- Start with Sonnet. Move up to Opus only when an eval set shows Sonnet misses the quality bar; move down to Haiku only when an eval set shows the quality regression is acceptable for the task, not just to save cost. Model moves are measured decisions.
- Window behavior: a request already larger than the window is rejected with a validation error before generation; if it fits but generation reaches the ceiling, current models return output so far with stop reason `model_context_window_exceeded`. Neither path silently truncates oldest content; your application must trim or summarize before the next request.
- In production, tool outputs are often three to five times longer than test fixtures, so the window fills at turn eight rather than turn fifty.

Four strategies
| Strategy | What it does | When | What you lose |
|---|---|---|---|
| Pruning | Jump back to an earlier message and continue, removing what came after | After an unproductive path or debugging back-and-forth | Work after the rewind point; Claude must relearn anything useful |
| Compaction (`/compact` in Claude Code; server-side compaction in the API is a beta strategy; manual summarization is the client-side alternative) | Summarize history into condensed form | Approaching ceiling, same feature, keep knowledge | Details not captured in the summary |
| Clearing (`/clear` in Claude Code; new session in API) | New conversation, empty context | Next task completely different | All session context; persist what matters (e.g. CLAUDE.md) |
| Subagent handoffs | Subagent in isolated context with only task description and system prompt it needs; returns a summary | Self-contained subtask, especially exploration where the journey clutters context but the answer is short | Visibility into how the subagent reached its conclusion |

Two more levers
- Prompt caching: stores processing of a stable prefix; follow-ups with identical content up to that point pay a fraction of cost. Best candidates: long system prompt, large tool definition set, reference document queried repeatedly. Mark a cache breakpoint with a `cache_control` field of type `ephemeral` on the last block to cache; up to four breakpoints. Highest-leverage cost cut for multi-turn sessions with stable system prompt and tool schemas.
- Token counting: the `count_tokens` endpoint takes the same body as a messages call and returns the token count without running inference. Use in development to check budget against real tool outputs and in production to gate requests that would exceed the window.

Compaction summarizer prompts
- "Summarize the conversation so far" -> general summary that may drop task-critical state (files modified, decision at a branch point, errors and resolutions).
- "Summarize the conversation, preserving all file paths modified, all decisions made, and any errors encountered and their resolutions" -> usable summary.
- Task-critical state loss from an under-specified summarizer is one of the most common sources of multi-session agent failures. In the API, server-side compaction (beta) is the documented primary strategy; with manual compaction you write the summarizer prompt.

Subagent handoffs for long-horizon tasks
- When a task is too big for one window, a bigger window is not the solution; decompose and pass only relevant context.
- A subagent gets: a scoped task, minimum context, results of prior steps directly relevant, the tools it needs, clear exit conditions. Parent collects results.
- Adds implementation overhead; apply only where context cost is a real constraint. Best designed at architecture stage. Measure actual token usage against the model's limit before adding management overhead.

RAG path (the three break points)
- Chunking: too small lacks surrounding context; too large dilutes the match. Sentence- or section-based with a little overlap is a reasonable default; overlap keeps facts crossing a boundary retrievable.
- Embedding match: similarity search returns semantically close content, not necessarily the exact term; a query for a specific identifier can miss the chunk. Hence lexical match is sometimes run alongside semantic.
- Assembly: retrieved chunks must reach the model in the structure the prompt expects, else the model answers from memory.
- Fetch-once index: inspectable and testable, but you own building, syncing, securing the index. Search-across-rounds: no index infrastructure and no staleness (reads current files at query time), but more tokens/time per query and less inspectable. Stable corpus plus simple lookups: own the index. Changing corpus or multi-step questions: iterative search is usually simpler despite higher per-query cost.
- The reported performance gain for single-agent agentic search over a retrieval index is version-pinned; confirm at build time.
- Source gap: the "fetch-once" and "search-across-rounds" paths are referenced here without being introduced earlier in the module; only the contrast above is given.

Watch Out postmortem: receipts agent
| | Development | Production |
|---|---|---|
| Window available | 200k standard, 1M on current Opus and Sonnet | same |
| Team budget cap | 40k tokens | 40k tokens |
| Avg tool output | ~800 tokens/call | ~3,200 tokens/call |
| Result | 20 turns, about 18,000 tokens, clean | cap reached at turn 8 |
| Symptom | none | wrong tool selections and incomplete outputs from turn 8 |
| Root cause found by | n/a | token usage audit, two days after deployment |
| Fix | n/a | prune tool outputs after use; apply compaction proactively before the cap |

- The 40k figure is a team-imposed cost control, not the model's ceiling (current API models carry at least 200k; newest flagship models, Fable included, serve 1M by default).
- Eight turns of tool output alone is about 25,600 tokens; with system prompt and messages the total reached the cap. The system prompt and early instructions were crowded out by unpruned tool outputs, so the agent decided on a context that no longer held its guidance.
- Context overflow is misread as tool-selection failure. If selection degrades after a fixed number of turns, check whether the window is filling before debugging the schema. Measure the token cost of a tool result against the largest input in your target data before shipping.
- Source gap: the text says "1M by default" for Fable and Opus/Sonnet in the table says "1M on current Opus and Sonnet"; the lessons do not reconcile which models serve 1M. Confirm against docs.

Java: budget guard and pruning (illustrative)
```java
// Illustrative. count_tokens takes the same body as a messages call and returns a count, no inference.
int used = countTokens(history, toolsJson);          // helper calling the count_tokens endpoint
int teamBudget = 40_000;                              // the module's example cap (a team choice)

if (used > teamBudget * 0.8) {                        // act BEFORE the cap, not at it
    pruneConsumedToolResults(history);                // drop tool outputs already used
    if (countTokens(history, toolsJson) > teamBudget * 0.8) {
        history = compactWithSummarizer(history,
            "Summarize the conversation, preserving all file paths modified, "
          + "all decisions made, and any errors encountered and their resolutions");
    }
}
// Caveat: pruning must not break tool_use/tool_result pairing and must not drop thinking blocks.
```
(The 0.8 threshold is illustrative; the course only says compact proactively before the cap.)

### 2.7 Agent Construction (22 min + 5 min Watch Out)

Key ideas
- An agent is a multi-step tool-use loop with managed context and a defined goal. Agents carry coordination overhead, expanded context cost and more surface area for failure than simpler patterns. First question: does this problem need an agent?
- Progression: single API call, then workflow, then agent; move up only when the simpler pattern cannot handle the variability.

| Choose a workflow when | Choose an agent when |
|---|---|
| You can enumerate exact steps in code | You can specify goal and tools but not the path |
| Error cost is real and step-level guardrails matter | Path cannot be enumerated in advance |
| Standard-tooling observability required | Non-determinism acceptable; actions constrained by registered toolset |
| Inputs well-constrained to a known set | Inputs vary unpredictably in content and structure |
| Every execution follows the same sequence | Task needs creative sequencing of tools |

- Wrong pattern costs: agent where workflow suffices adds behavioral complexity with no added capability; workflow where an agent is needed breaks when input deviates from the path.
- Agents take on: path emerges from the model's reasoning over accumulated context; observability needs transcript-level tooling rather than standard operational logging.
- The pattern (loop that calls tools, manages context, runs until a goal is met) is constant across wiring paths. Multi-agent (planner, executor, evaluator handing off via structured artifacts) adds decisions covered later in the track.

Three wiring paths (ordered by how much infrastructure you hand off)
| Path | Who runs the loop | You own | Choose when | Check before committing |
|---|---|---|---|---|
| Messages API loop | Your code, every iteration | Full loop, tool execution, context management, retries, exit conditions | Need full control, constraints a library does not fit, or learning the loop | Maintenance cost is yours (context management, parallel tool handling) |
| Agent SDK | SDK runs loop in your process; your code executes the tools | Tool execution and the surrounding app; SDK provides loop structure, context management, tool registration | Want the Claude Code loop/context/tool scaffolding without rebuilding it, in your own environment (Python or TypeScript) | Filesystem features (CLAUDE.md, skills) load per `settingSources`; never rely on a default; set explicitly, e.g. `["user", "project", "local"]` to match the CLI or `[]` for fully isolated |
| Claude Managed Agents (public beta) | Anthropic runs loop and sandbox; your app sends user events and streams results over server-sent events | Application layer and the agent definition (model, system prompt, tools, MCP servers, skills defined once, referenced by ID) | Long-running (minutes or hours), want a managed sandbox, do not want to build loop/sandbox/tool-execution layer. Also on Claude Platform on AWS with feature differences | Sessions are stateful and stored server-side: not currently eligible for Zero Data Retention or a HIPAA BAA. All endpoints need beta header `managed-agents-2026-04-01`; behavior may change; plan a migration |

- Managed Agents: you stop owning the iteration loop, sandbox, in-loop retries, tool-execution runtime, sandbox lifecycle, and long-running execution management. You take on an agent defined as a versioned API resource, an application layer sending events and consuming streams, server-side session state under Anthropic's data handling, and a dependency on the managed sandbox's tools and execution model.
- PHI or ZDR workloads rule Managed Agents out regardless of fit; use the Agent SDK or a raw loop on a covered configuration. The governing constraint picks the path before convenience.
- Common progression: prototype on the Agent SDK locally, move to Managed Agents for production. Agent SDK config is code and filesystem; Managed Agents is a versioned API resource. Expect a re-expression step, not a direct export.
- Handles well: long-running agents, no self-built sandbox. Adds cost: server-side sessions, agent-as-resource format, beta surface. Use a different approach: PHI/ZDR or full in-process control.

Four wiring steps (hold across every path)
- Register tools (same schema structure; SDK registers against the agent).
- Set the system prompt, scoped to the task. A broad prompt gives broader, less reliable routing; one naming the task and tools gives consistent behavior.
- Handle the tool-use loop: every tool call Claude issues must be executed by your code and returned in a tool-result block.
- Define exit conditions: without them the agent keeps requesting tool calls beyond the task. Define when done means done.

Loop wiring checklist
| # | Item | Verify |
|---|---|---|
| 1 | Tools registered | Every needed tool is registered; no unregistered tools referenced in the system prompt |
| 2 | System prompt scoped | Names task and available tools; does not describe tools the agent lacks; does not omit tools that need scoping guidance |
| 3 | Tool-use loop | Every tool-use block answered with a tool-result before the next assistant turn; all blocks from a single turn resolved together |
| 4 | HITL insertion point | At least one HITL check defined |
| 5 | Exit conditions | Clear stop criterion that does not depend on Claude volunteering to stop |

HITL insertion points (key question: worst outcome if this step runs without a human check?)
| Insertion point | Trigger | Risk |
|---|---|---|
| Before a destructive tool call | About to write, delete or send | High: irreversible |
| After a planning step | Plan generated, about to execute | Medium: wrong plan yields wrong outcome even if all steps run |
| On unexpected output | Error flag, empty result, value outside bounds | Variable: failures retry logic will not resolve |

Tool orchestration
- Routing is shaped by how tools are described and how many are registered. Too many with overlapping descriptions: erratic routing. Too few: hallucinated path or incomplete result.
- Over-tooling is the more common production problem ("just in case" tools degrade selection). Start with the minimum set; add only when a specific capability gap is confirmed.

Regulated data constraints (set endpoint and credentials before wiring)
| Constraint | Rules out in code | Usually survives |
|---|---|---|
| Attorney-client privilege | Consumer-grade Claude.ai surface not auditable end to end; sending privileged content to any endpoint not firm-approved, however the prompt is structured | Direct API/SDK calls inside the firm's application, SSO, firm-approved LLM gateway with full request/response logging. Anthropic does not capture Compliance Conversation content on direct API traffic by default, so implement conversation logging in the app layer to an approved destination. Confirm design with Anthropic account team |
| HIPAA (PHI) | Sending PHI to any endpoint or route not covered by a BAA for that configuration, including logging/retention paths not scoped under the BAA | Direct API/SDK on a BAA-covered configuration (arranged with Anthropic, which provisions a dedicated HIPAA-enabled organization), or Bedrock/Vertex on the partner's HIPAA-eligible cloud account. BAA does not cover Console, Workbench, beta features or consumer plans; not all API features covered, verify the eligibility list |
| GDPR and data residency | Routes where execution region cannot be pinned in code; defaulting to a global endpoint without region | Bedrock or Vertex with region pinned in client config. Direct Anthropic API does not currently provide EU data residency, so EU partners route via Bedrock or Vertex |
| FedRAMP and government | Any path calling an endpoint not on an authorized environment at the required impact level, including dev/test hitting the commercial endpoint while prod hits the authorized one | Three authorized routes as of publish: Claude for Government (C4G) with direct FedRAMP High via Palantir Federal Cloud Service - Supporting Services (PFCS-SS); Claude via Amazon Bedrock GovCloud (FedRAMP High and DoD IL4/5); Claude via Vertex AI Assured Workloads (FedRAMP authorized). Claude Enterprise on AWS Marketplace is not FedRAMP authorized. Verify at trust.anthropic.com |
| Internal data-residency policy | SDK clients configured against a cloud vendor outside the approved list | The route on the partner's approved cloud vendor; build against it rather than switching mid-project |

- SOC 2 is out of scope here (governs how systems are built and operated, not which endpoint is called); covered in Module 4. Module 4 also covers IAM/privacy patterns, prompt injection defenses, runtime guardrails, agent hardening.
- The wrong client configuration is far more expensive to undo after wiring than to set correctly first.

Watch Out: the agent that edited a production file
- Agent with read_file, write_file, validate_config; loop: write, re-run validate_config, adjust and rewrite up to a cap of ten iterations. Tested in a scratch directory; converged in two or three iterations.
- In a customer environment it fixed an out-of-range rate-limit parameter, validation passed, loop exited cleanly after one iteration. Downstream application relied on the old value and started failing under throttling.
- Loop did what it was told; the failure was the exit condition (validate_config pass) scoped to the file, with no checkpoint between "validation passed" and "write committed to customer environment". Needed an explicit branch between "proposed change ready" and "write committed".
- The unasked design question: "What is the worst outcome if write_file runs without a human check?" If a tool can take an irreversible action in production, it needs a checkpoint before it runs; register that during design when scoping the tool surface.

Java: HITL gate before a destructive tool (illustrative)
```java
Set<String> needsApproval = Set.of("update_record", "write_file", "delete_record");

for (JsonNode b : content) {
    if (!"tool_use".equals(b.path("type").asText())) continue;
    String name = b.path("name").asText();
    String id = b.path("id").asText();

    if (needsApproval.contains(name)) {
        // Pause: surface the PROPOSED change (tool name, customer_id, field, new_value) to a human.
        boolean approved = approvalQueue.requestAndWait(name, b.path("input"));
        if (!approved) {
            // Still must answer the tool_use with a tool_result carrying the same ID.
            results.add(toolResult(id, "Rejected by human reviewer; change not applied", true));
            continue;
        }
    }
    results.add(toolResult(id, executeTool(name, b.path("input")), false));
}
```

### 2.8 Agent Memory (8 min + 2 min Watch Out)

Key ideas
- Memory scope decides what the agent knows at the start of the next session and what it costs to carry forward. Wrong choice has two opposite failures: too much state in-context inflates every API call (model re-reads the full conversation each turn); too little in persistent storage strips cross-session memory.
- The blueprint groups patterns under this objective, all built earlier: tool-use loop, multi-step task decomposition (ordered subtasks), planning-and-execution (decide plan separately from carrying it out; the HITL check after planning guards that split). Memory scope decides what survives once the loop ends.

| Scope | What persists | Cost | Use when | What you lose |
|---|---|---|---|---|
| In-context | State in the active conversation, across turns in one session | No retrieval overhead; token cost grows with conversation | Short sessions where all state fits the window and nothing carries across restarts | Everything at session end; a clear command or new session wipes it |
| External storage | State in a database; read at session start or on demand | Retrieval latency per call; read/write logic to build | State must survive sessions, move between users, or be shared across agent instances | Nothing on persistence; cost is latency and complexity |
| Summarized memory | Condensed prior conversation injected at next session start | Lower tokens than replaying history; summarization drops detail | Long-running conversational agents whose full history would outgrow the budget | Any detail the summarizer did not preserve |
| Stateless | Nothing | None | Task agents that finish and close out; independent pipelines | All prior context |

- Decide at design time. Multi-day same-user agent: store summaries or history outside the context window. Single-job agent: stateless.
- Default path (store everything in messages array, resend each call) works for the prototype; then token cost scales per turn, latency climbs, a long session hits the hard limit. The refactor is mechanical (a few hundred lines and a database the team already has) but happens under production pressure; deciding at design time is cheap.
- Wrap-up quantifies: refactor under pressure about an hour, deliberate design-time choice about twenty minutes.
- Summarized memory depends on a well-specified summarizer prompt; without one, task-critical state is dropped on every compression.
- Do not hold all state in-context assuming the window will be big enough; without caching or compaction, long sessions accumulate cost faster than early-turn measurements suggest. Measure session token usage against the window limit before committing.

Skills (repeatable instructions without inflating every session)
- A Skill is a reusable markdown file teaching Claude a specific kind of task once; loaded automatically when a request matches its description; sits on disk until needed.
- Lives in `SKILL.md` in an identified directory: frontmatter (name, description) plus instructions. Claude reads name and description of every available Skill, compares to your message, loads full instructions only on a match.

| Pattern | Loads | Context cost | Best for |
|---|---|---|---|
| Skill (SKILL.md) | On demand when the request matches the description | Low: only name and description at startup | Task-specific expertise (domain output formats, review checklists, workflows for a subset of tasks) |
| CLAUDE.md | Every session, unconditionally (CLI); in the Agent SDK governed by `settingSources` | Fixed overhead per session | Always-on project standards (conventions, output format rules, codebase-wide constraints) |
| In-context instructions | Every turn within that session | Grows with session; does not survive session end | One-off exploratory or single-conversation work |

- Skills on the Messages API: beta, different configuration from the Claude Code/Agent SDK paths. Two beta headers: `code-execution-2025-08-25` and `skills-2025-10-02`. Skills run inside the code execution container, not in your application's environment, affecting tool and filesystem access. Check docs for current header values, GA status, and container runtime before building.
- Subagents do not automatically inherit Skills or conversation history (clean context), but DO inherit the parent's permission context. If the subagent needs a Skill, list it explicitly in the subagent's configuration.

Watch Out postmortem: session four
- Support-engineer escalation agent; dev ran continuous sessions of 10-15 turns; shipped without measuring tokens per session.
- Production: shorter sessions but state accumulated across sessions. By session four, injected in-context history exceeded 40,000 tokens before the first tool call; with system prompt and tool schemas over 45,000 tokens used before the first productive turn. Remaining budget ran out; incomplete results looked like a tool-selection failure.
- Fix: refactor to external storage (persist history to a database, inject only the relevant subset at session start); took a one-hour refactor under pressure, much more than at design time.
- Dev used one long session; production used many short ones with accumulated state. Measure expected state size (history plus system prompt plus tool schemas) against the context limit before choosing in-context as default.

Java: memory scope as a design-time choice (illustrative)
```java
interface SessionMemory {
    List<Message> loadAtSessionStart(String userId);     // inject only the relevant subset
    void saveAtSessionEnd(String userId, SessionSummary s);
}
// Stateless agent: no SessionMemory at all.
// External storage: implement over the database the team already has.
// Summarized: saveAtSessionEnd stores output of a summarizer prompt that names
// what must be preserved (decisions, files modified, errors and resolutions).
```

### 2.9 Cumulative Debug Task (8 + 10 min)

Key ideas
- One buggy implementation, four planted bugs, one per layer: schema, streaming (assembled and committed), context (message structure), memory.
- Stage 1: for each bug name the layer and write one sentence on what it causes at runtime. Stage 2: write the fixed code and name what changed.
- Source gap: the course shows no answer key for either stage. The mapping below applies the earlier lessons to the code shown (a tool `get_customer_data` with description "Gets data."; a streaming loop that sets `stop_seen` on message_stop but never checks it; thinking blocks filtered out of `assistant_content`; tool_results appended as separate user messages; `build_session_history` concatenating all prior session transcripts in-context).

Schema layer: description "Gets data." is vague with no when/when-not (course rule: two-part description, three to four sentences, exclusion condition).
Streaming layer: `stop_seen` is set but the assistant turn is appended unconditionally after the read loop (course rule: commit only after message_stop; discard and retry on interruption).
Context layer: thinking blocks are removed from assistant content before it is appended (carry-back rule: unchanged, signatures; API rejects). Also visible in the code: each tool_use gets its own separate user message with one tool_result, whereas the course says all tool_use blocks from one assistant turn are resolved together in the immediately following user turn. Which of these the task intends is not stated.
Memory layer: all prior session transcripts concatenated in-context (course: in-context state inflates until the window closes; use external storage or summarized memory with a specified summarizer).

### 2.10 Multimodal and Batch Ingestion (13 min + 4 min Watch Out)

Key ideas
- Every image and PDF consumes context budget before Claude reads a character of your prompt.
- Image cost: each 28x28-pixel patch is one visual token; tokens = ceil(width/28) x ceil(height/28). A 1,000 x 1,000 image = 36 x 36 patches, about 1,296 visual tokens. Ten high-resolution screenshots about equal a detailed system prompt.
- Each model has a maximum native resolution (long-edge limit plus visual-token limit), differing by tier; newest models accept larger images. Larger images are downscaled first, so the formula runs on scaled dimensions. Confirm per-tier limits on the Vision page (Resolution and token cost) at build time.
- Measure a typical production image's token cost against the context limit before writing ingestion code; the fix is often a ten-minute resize step.

Three ways to send an image
| Method | How | Overhead | Use when |
|---|---|---|---|
| Inline base64 | Encode bytes as base64 in the message block | Full payload on every request; inflates size and latency | One-off images; avoid if reuse is likely |
| URL | Publicly reachable URL in the source block; Claude fetches at request time | No payload, but URL must be stable, public and reachable at request time | Image already at a stable public URL you control; skip for auth, short-expiry signed URLs, or anything not guaranteed reachable |
| Files API | Upload once, get a `file_id`, reference in any later message | One-time upload; later requests carry the ID. Beta; not available on Bedrock or Vertex AI | Same image or PDF across requests, large assets, asset management separate from inference, images across many turns (file_id carries no payload weight as history grows) |

PDFs: the block type is `document` rather than `image`; source can be base64, URL or Files API `file_id`. No required `name` field; optional `title` (readable name) and `context` (extra metadata). Token cost and Files API reuse apply the same.
```
{ "type": "document",
  "source": { "type": "base64", "media_type": "application/pdf", "data": "<base64-encoded-pdf-bytes>" },
  "title": "contract_review.pdf" }
```

Prompting for multimodal
- Same techniques apply; a bare "describe this image" gives shallow output. Images carry ambiguity (overlapping objects, depth/spatial relationships, partial occlusion); name how to handle each, e.g. "If objects overlap, describe each separately and note the overlap".

Message Batches API
- For the same prompt pattern across hundreds or thousands of inputs. Accepts up to 100,000 requests or 256 MB per batch (whichever comes first) in a single call. Submit, receive a `batch_id`, poll for completion, download results.
- Per-token cost is lower than synchronous. Tradeoff: latency non-deterministic, up to 24 hours, often much faster. Suits offline pipelines, evaluation runs, data processing; not real-time user interactions.

| Use case | Pattern | Why |
|---|---|---|
| User uploads a photo and expects immediate classification | Synchronous | Real-time |
| Nightly pipeline classifies 5,000 customer records | Batches | Latency not a constraint; cost reduction |
| Evaluation run: new prompt vs 2,000 examples | Batches | Offline |
| Chatbot reply to a user's message | Synchronous | User waiting |

- Multimodal plus batch fits offline workloads reusing the same assets with structured output (e.g. nightly image classification against a fixed taxonomy: Files API removes redundant uploads, Batches absorbs latency, structured outputs keep results machine-readable).
- Two failure modes: using batch in a user-facing flow with an image (user is waiting, batch is not); underestimating context cost of multiple large images per request at scale.

Watch Out: the batch job that was not a batch
- Looping over items and calling the synchronous API (even in chunks) is serial synchronous calls with the same number of requests; same rate limits. Batches API is a different submission model, not a smaller batch size.
- Results return in arbitrary order, not submission order; use the `custom_id` field on each request to match results to inputs.

Java: image token estimate and batch polling (illustrative)
```java
// Course formula: ceil(w/28) * ceil(h/28), computed on the SCALED dimensions
// if the image exceeds the model's long-edge or visual-token limit.
static long visualTokens(int w, int h) {
    return (long) Math.ceil(w / 28.0) * (long) Math.ceil(h / 28.0);
}
// visualTokens(1000, 1000) == 36 * 36 == 1296

// Batch: submit once (<= 100,000 requests or 256 MB), keep batch_id, poll, then match by custom_id.
String batchId = submitBatch(requestsWithCustomIds);        // POST via HttpClient; helper
while (!isFinished(batchId)) {                              // helper polls status on a schedule
    Thread.sleep(Duration.ofMinutes(5).toMillis());         // may take up to 24 hours
}
Map<String, Result> byCustomId = downloadResults(batchId);  // order is arbitrary
```

### 2.11 Module Wrap-up

Key ideas
- Eight takeaways, one per objective: failure type names the missing technique (structured outputs when prompts are not enough); match reasoning depth to task and return thinking blocks unchanged; a stream ending is not a message completing; wrong-tool selection traces to the schema description (exclusion condition); context is a fixed budget spent fastest by tool outputs; the workflow-or-agent decision sets downstream cost and HITL belongs in the design; memory scope is set by session shape, with Skills for repeatable instructions; compute multimodal cost first and match API to workload.
- Next: Module 3 (Claude Code, MCP and Integration), then Module 4 (Production Engineering, Evals and Security), Module 5 (Accelerators and IP Contribution).
- Source gap: the wrap-up says the module established "five interaction types" without listing them.

---

## 3. Checkpoints and Exercises

Checkpoint 1: Fix the broken prompt
- Tests: diagnosing which of the four techniques is missing and writing the corrected system prompt.
- Given: system "You are a support ticket processor. Extract the key information from the ticket below." plus a ticket about a rotated API key and a failing production deployment; target is a JSON object with category, urgency, one-sentence summary; "one defect".
- Source gap: the defect and answer are not stated in the source. Reasoning from the course's diagnosis table: the prompt names no output form, fields, or format, so the missing piece is an output constraint (fixed field names category, urgency, summary; JSON only, no preamble; allowed values; what to do when data is absent), optionally with a few-shot pair and the ticket in XML tags. Only the single defect should be fixed; do not just lengthen the prompt.

Checkpoint 2: Decide when extended thinking earns its cost
- Tests: matching three tasks to decisions (never do this / leave it off / enable it, budget for the planning step).
- Classify 50,000 tickets overnight -> leave it off (mechanical task; extra tokens, no gain; constrained prompt is the right tool).
- Plan a multi-step refactor where each step depends on the previous -> enable it, budget for the planning step (reasoning pass works through dependencies; reduces wrong-tool selection downstream).
- Strip the thinking block from history to save context before the next tool call -> never do this (carry-back rule; signature mismatch rejects the request).
- Source gap: the answer key is not shown; the matches follow the lesson's decision table and carry-back rule.

Checkpoint 3: Spot and fix the schema bug
- Tests: pairing rule between tool_use and tool_result.
- Trace: Turn 2 assistant tool_use id="toolu_01"; Turn 3 user tool_result has tool_use_id="toolu_02"; API error "tool_result block references unknown tool_use_id". Schema and description are fine.
- Correct fix: option B, correct the `tool_use_id` on the tool_result so it matches the id issued in the assistant turn. Option A (add exclusion condition) addresses wrong-tool selection; option C (required array) addresses omitted arguments; neither touches the broken pairing. The problem is structural, not a prompt or description issue. (Option B being correct is derived from the stated pairing rule; the source shows no explicit key.)

Checkpoint 4: Repair the broken stream handler
- Tests: understanding that a stream ending is not a message completing.
- Defect: the code sets `stop_seen = True` on message_stop but appends `assemble(blocks)` to messages unconditionally after the loop, so an interrupted stream commits a half-built block (possibly truncated tool_use JSON).
- Fix as the course states it: gate the history append on message_stop (`stop_seen`), discard the partial assistant turn on interruption, retry from the last complete turn.
- Source gap: no model answer is shown; the above follows the lesson and the postmortem.

```java
boolean stopSeen = false;
try {
    for (StreamEvent ev : stream(request)) {
        // ... apply start/delta events ...
        if ("message_stop".equals(ev.type())) stopSeen = true;
    }
} catch (IOException dropped) { /* leave stopSeen false */ }

if (stopSeen) {
    messages.add(assistantTurn(assemble(blocks)));   // commit only when complete
} else {
    // discard partial turn, retry from last complete turn
}
```

Checkpoint 5: Diagnose the context failure
- Tests: recognizing context overflow masquerading as tool-selection failure.
- Trace: turns 1-4 fetch_policy_document (2,400 tokens each, correct); turn 5 search_knowledge_base instead of apply_coverage_rule (wrong, 1,800); turn 6 repeats the wrong call; turn 7 session ends without result.
- Turn 4 is the last correct turn: four large results (9,600 tokens) crowd the instructions that tell Claude which tool to use next.
- Correct fix: option B, prune fetch_policy_document results after each turn so accumulated outputs do not crowd out current instructions, and apply compaction before turn 5. Option A (clearer description) misdiagnoses it as a schema problem; option C (raise max_tokens) addresses response room, not input crowding.

Checkpoint 6: Complete the agent wiring
- Tests: writing a good tool description and inserting a HITL checkpoint before a destructive tool in the loop.
- Gap 1: description for `update_record` (required: customer_id, field, new_value). Per the course: when to use, when not to, what it returns, 3-4 sentences, disambiguate from `read_record`, and name that it writes.
- Gap 2: before `execute_tool` for update_record, pause and route to human review of the proposed change; only run on approval (course: HITL before a destructive write/delete/send tool call; worst outcome if it runs without a check). Even on rejection a tool_result for that tool_use id must still be returned.
- Source gap: no model answer shown; the above applies the lesson and the loop wiring checklist. Note that the partial loop only handles `end_turn` and `tool_use` stop reasons and has no iteration cap, which relates to the course's "define exit conditions" point.

Checkpoint 7: Choose the right memory pattern
- Tests: matching memory scope to session shape.
- Customer support agent, same user, daily check-ins over two weeks, each session picks up where the last left off -> external storage (write at session end, read at start).
- Document formatter: receive file, transform, return, terminate; each job independent -> stateless.
- Coding assistant, multi-hour session that will not continue afterward -> in-context memory.
- Source gap: the answer key is not shown; matches follow the scope table.

Checkpoint 8: Select the right input encoding
- Tests: choosing inline base64, Files API, or Message Batches API.
- Reference product diagram used in every request -> Files API: upload once, reference `file_id` in each request (reuse; no payload per request).
- One-off screenshot in a single request -> inline base64 (an upload step adds complexity without payoff).
- Job classifying 5,000 customer feedback responses -> Message Batches API: one batch call, poll for completion.
- Source gap: the answer key is not shown (the screen says each item's feedback names the cost of the wrong choice); matches follow the lesson.

Cumulative debug task: see 2.9 (four bugs, one per layer; Stage 1 identify, Stage 2 corrected code; no answer key in source).

---

## 4. Common Mistakes

| Mistake | Fix |
|---|---|
| Re-prompting with more words when output is wrong | Diagnose failure type (shape, scope drift, invented structure, edge-case break), add the one matching technique; after three failed re-prompts stop adding text |
| Describing categories at length instead of constraining output | Output constraint plus two few-shot examples (JSON schema in the course's Pass 6) |
| Verbose prompts producing verbose, slow outputs | Simplify; the model calibrates response length and style to the input |
| Trusting "return only JSON" in the prompt | Structured outputs: `output_config.format` `json_schema`; `strict: true` on tools; still check `stop_reason` (`refusal`, `max_tokens`) |
| Combining JSON outputs with message prefilling | Pick one; they are incompatible |
| Using extended thinking on classification or extraction | Leave it off; use a constrained prompt |
| Using `budget_tokens` on newest models | Use adaptive `thinking` and the effort setting; `budget_tokens` returns 400 on newest generations |
| Stripping, editing or summarizing thinking blocks | Return them unchanged (including redacted); use context engineering for size |
| Tool descriptions that say only "use this to find information" | Two parts: when to use and when not to; 3-4 sentences |
| Marking every input field required | Required only when the call is meaningless without it; defaults for optional ones |
| Dropping the text block when appending a tool-use turn | Preserve the full content array |
| tool_result missing, wrong ID, or in a later turn | Answer every tool_use with a tool_result of the same ID in the immediately following user turn |
| Truncating history while relying on exclusion conditions | Pass complete conversation history or the exclusion logic silently fails |
| Parsing tool input before content_block_stop | Accumulate delta fragments; parse only after the block closes |
| Committing a turn when the read loop ends | Commit only after message_stop; discard partial turns and retry |
| Debugging the schema when a retry fails after a stream | Check whether the prior turn was assembled from a stream first |
| Connecting many MCP servers at once | Register only what you use; `defer_loading`, `enabled`; mind context cost |
| Testing context with small fixtures | Measure against the largest production tool output; budget for 3-5x fixture sizes |
| Debugging the schema when tool selection degrades after N turns | Check whether the window is filling; prune and compact before the cap |
| Under-specified compaction summarizer | Name what to preserve: files modified, decisions, errors and resolutions |
| Choosing an agent when a workflow fits (or the reverse) | Single call, then workflow, then agent; agent only when the path cannot be enumerated |
| Choosing a wiring path for prototype speed | Choose on deployment and compliance constraints (Managed Agents is ruled out for PHI/ZDR) |
| Relying on a default for Agent SDK filesystem loading | Always set `settingSources` explicitly |
| Registering every tool "just in case" | Minimum set; add on confirmed gaps |
| Exit condition scoped only to validation pass with no human gate | HITL before any irreversible/destructive call; plan the worst-case question at design time |
| No exit conditions in the loop | Define a stop criterion not dependent on Claude volunteering to stop |
| Holding all state in-context | Choose memory scope at design time from session shape; measure history plus system prompt plus tool schemas |
| Assuming subagents inherit Skills or history | Configure explicitly; note they do inherit permission context |
| Ignoring image token cost | ceil(w/28) x ceil(h/28); resize; measure largest production image |
| Looping the synchronous API and calling it batching | Message Batches API with `custom_id` for result matching |
| Using batch for a user-facing flow | Synchronous when a user is waiting |

---

## 5. Key Terms

| Term | Meaning |
|---|---|
| Claude Agent SDK | Managed agent runtime (`@anthropic-ai/claude-agent-sdk` for TypeScript, `claude-agent-sdk` for Python) giving programmatic access to the agent loop behind Claude Code (iteration, tool execution, observation, termination); distinct from the Anthropic SDK, a thin API wrapper with no agent loop |
| Context Window | Total tokens a model can process in one request: system prompt, history, tool definitions, tool results, and the model's own output; at the limit earlier content must be removed or summarized |
| Function signature | Declaration of a function: name plus parameters, types and defaults |
| HITL | Human-in-the-loop: a human review or approval step inserted before consequential action |
| Refactor | Changing internal code structure without changing outside behavior |
| SOC 2 | AICPA audit framework for how a service organization handles customer data; covered in Module 4 |
| State | Information an agent carries between turns: conversation so far, user ask, earlier tool results |
| Stop_reason | API response field saying why generation stopped; `end_turn` (Claude finished) and `tool_use` (tool_use blocks issued, awaiting results) matter most in loops |
| Subagent | Separate agent instance spun up by an orchestrator for a discrete subtask; does not inherit history, skills or context (glossary wording), must be configured explicitly; returns results to the orchestrator |
| Token | Unit used to measure and process text; chars-per-token is model-dependent; basis for pricing and context budget; consumed by prompts, responses, tool schemas, tool results |
| Tool_use_block | Assistant content block requesting a function call: tool name, unique ID, input arguments; must be answered by a matching tool_result in the immediately following user turn with the ID preserved exactly |
| Structured outputs | API feature using constrained decoding against a JSON schema: `output_config.format` json_schema (final response) and `strict: true` (tool arguments) |
| Thinking block | Block carrying Claude's reasoning; returned unchanged with its signature; redacted variants too |
| Compaction | Summarizing history into a condensed version (`/compact`; server-side compaction in API is beta; manual summarization) |
| Skill | Reusable `SKILL.md` instruction set loaded on demand by description match |
| MCP | Model Context Protocol: standard layer moving tool definitions and execution into servers; stdio and Streamable HTTP transports |
| Files API | Upload once, reuse via `file_id`; beta; not on Bedrock or Vertex AI |
| Message Batches API | Asynchronous high-volume processing; up to 100,000 requests or 256 MB; `batch_id`, polling, `custom_id`; lower per-token cost; up to 24 hours |
| Managed Agents | Anthropic-hosted loop and sandbox (public beta, header `managed-agents-2026-04-01`); stateful server-side sessions |

Note: the glossary says subagents do not inherit "conversation history, skills, or context", while the Agent Memory lesson says subagents DO inherit the parent's permission context. Both are in the source.

---

## 6. Exam-Style Self-Test

1. A classifier sometimes returns "Billing", sometimes "billing", sometimes a sentence. Which technique is missing?
   A: An output constraint (wrong shape). Fix it with a fixed label set, "return only the label", and few-shot pairs showing exact casing; XML tags separate examples from instructions.

2. Output is right on tested tickets but breaks on an unusual variant. What is missing?
   A: A constraint covering the variant (or an example covering it); the prompt only handled the happy path.

3. How do JSON outputs differ from strict tool use?
   A: JSON outputs (`output_config.format`, type `json_schema`) constrain the final response text; `strict: true` on a tool definition validates the arguments Claude passes to your tool against its `input_schema`.

4. Name three costs or limits of structured outputs.
   A: First request on a new schema is slower (grammar compiled, cached 24 hours from last use); extra input tokens from the injected format prompt; still check `stop_reason` for `refusal` and `max_tokens`; not combinable with message prefilling.

5. Which task shapes warrant extended thinking, and which do not?
   A: Enable for multi-step reasoning and for planning across tool calls (budget for the planning step). Leave off for classification, format conversion, field extraction and short factual answers.

6. What happens if you strip thinking blocks from history before the next tool-use turn?
   A: The signature no longer matches and the API rejects the request. Thinking blocks (and redacted ones) go back unchanged.

7. What rule pairs tool_use and tool_result?
   A: Every tool_use block in an assistant turn must be answered by a tool_result with the same ID in the immediately following user turn; missing, mismatched or later-turn results fail validation.

8. Two tools both say "use this to find information" and Claude picks wrongly. Fix?
   A: Add exclusion conditions (when not to call) to both descriptions; if they cannot be separated, merge into one tool with a type parameter.

9. In a stream, when can you parse a tool_use block's input, and when can you append the turn to history?
   A: Input is parseable only after content_block_stop for that block; the turn goes into history only after message_stop.

10. A stream drops mid-tool_use block. What do you do?
    A: Discard the partial assistant turn, do not write it to history, and retry from the last complete turn.

11. A multi-turn agent starts choosing wrong tools at turn 8, with a 40k budget and ~3,200-token tool results. First suspect and fix?
    A: Context overflow crowding out instructions, not the schema. Prune consumed tool outputs and compact proactively before the cap.

12. List the four context strategies and what each loses.
    A: Pruning (work after the rewind point), compaction (details not in the summary), clearing (all session context), subagent handoffs (visibility into the subagent's path).

13. How do you enable prompt caching and how many breakpoints are allowed?
    A: Put `cache_control` of type `ephemeral` on the last block to cache; up to four breakpoints. Best for stable system prompts, tool definitions, reference docs.

14. Workflow or agent?
    A: Workflow when you can enumerate the exact steps in code; agent when you can specify the goal and tools but not the path. Progress single call, workflow, agent.

15. Which wiring path is ruled out for PHI or Zero Data Retention workloads, and why?
    A: Claude Managed Agents: sessions are stateful and stored server-side, so not currently eligible for ZDR or a HIPAA BAA. Use the Agent SDK or a raw loop on a covered configuration.

16. Where do HITL checkpoints go?
    A: Before destructive tool calls (high risk), after a planning step (medium), and on unexpected output (variable). Decide by asking the worst outcome if the step runs without a human check.

17. Pick a memory scope: same user over two weeks; one-shot file transformer; single multi-hour session.
    A: External storage; stateless; in-context.

18. How many visual tokens is a 1,000 x 1,000 image, and which API for a nightly 5,000-record job?
    A: 36 x 36, about 1,296 visual tokens (ceil(w/28) x ceil(h/28)). Message Batches API (up to 100,000 requests or 256 MB, `batch_id`, poll, match via `custom_id`; results in arbitrary order).
