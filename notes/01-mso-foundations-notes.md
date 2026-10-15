# MSO Foundations - Study Notes

Source: Module 1 of the Anthropic Claude Developer course (Skilljar). Sections: Orientation,
How LLMs Behave, Models & Reasoning, Prompting Modes, Technical Substrate, Module Wrap-up.
Everything below comes from the module text; where the module is silent or ambiguous, a
"Source gap:" line says so.

---

## 1. Big Picture

- Module 1 gives the shared vocabulary the rest of the Developer course assumes.
- Tokens are the unit of input, output, pricing and budget. The context window is a fixed
  token budget that holds the whole request at once (system prompt, history, documents,
  tool results, and the output).
- Generation is sampled from a probability distribution, so output is non-deterministic.
  That is why tests assert on properties and why evals exist.
- Model choice (Fable, Opus, Sonnet, Haiku) and reasoning mode are two independent,
  composable levers. Prompting mode (zero/one/multi-shot) is a third lever that trades
  token cost against quality.
- Claude is reached over an HTTP REST API (API key + JSON body in, JSON out). An official
  SDK is a thin convenience layer over the same API. Pick sync, streaming, async/await, or
  Message Batches depending on whether a user is waiting and whether work is real-time or
  bulk offline.
- Governing discipline: use the smallest model, simplest reasoning and fewest examples that
  meet your eval; add capability only where the eval says you need it.

```
                    +-----------------------------+
                    |  Tokens (unit of cost/size) |
                    +--------------+--------------+
                                   |
                 counted against   v
                    +-----------------------------+
                    |  Context window (fixed)     |
                    |  system + history + docs +  |
                    |  tool results + output      |
                    +--------------+--------------+
                                   |
                                   v
   +-----------------+     +---------------+     +-----------------------+
   | Model choice    |---->|  One request  |<----| Prompting mode        |
   | Fable/Opus/     |     |               |     | zero / one / multi    |
   | Sonnet/Haiku    |     +-------+-------+     | (examples cost tokens)|
   +-----------------+             ^             +-----------------------+
   +-----------------+             |
   | Reasoning mode  |-------------+  (per-call, separate from model)
   | adaptive+effort |
   +-----------------+
                                   |
                                   v
                    +-----------------------------+
                    |  Sampling (temperature...)  |
                    |  -> non-deterministic output|
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    |  Test on properties; evals  |
                    |  decide model/mode/examples |
                    +-----------------------------+

   Transport: SDK or raw REST -> sync | streaming (SSE) | async/await | Batches API
```

---

## 2. Orientation

### Key ideas
- Module goal: know what the words mean before writing code against Claude.
- Four learning outcomes:
  1. Explain a token, the context window as a fixed budget, why sampling makes outputs
     vary, and what non-determinism means for testing and evals.
  2. Describe the Claude family and capability tiers; distinguish choosing a model from
     enabling a reasoning mode such as extended thinking.
  3. Choose between zero-shot, one-shot and multi-shot; weigh cost vs quality of examples.
  4. Describe how a developer accesses Claude: SDK vs raw REST, sync vs streaming,
     async patterns for high-volume work.
- Course disclaimer: educational content; examples are illustrative and often fictitious;
  products evolve, so verify on Anthropic's website or docs; Anthropic's terms, policies
  and documentation control if they conflict with the course.

### Rules and traps
- Treat course specifics (model lineup, parameters) as time-sensitive; the module repeatedly
  says to confirm against current docs at build time.

---

## 3. How LLMs Behave: tokens, context, sampling, non-determinism

### Key ideas

Tokens
- Claude reads tokens, not characters or words.
- Chars-per-token average depends on the model's tokenizer and differs between model
  generations. Any chars-per-token rule of thumb is model-dependent.
- Everything is counted in tokens: prompt, conversation history, tool definitions, tool
  results, and the generated response.
- Tokens are the unit of pricing and of budget. Estimate cost and fit in tokens, not words.

Context window
- Total tokens the model can take in for a single request.
- Holds at once: system prompt, full conversation so far, injected documents, every tool
  result, and the model output.
- Two edge behaviors:
  - Input already larger than the window: rejected with a validation error before
    generation begins.
  - Input fits but generation reaches the ceiling: current models stop and return the
    output generated so far with a `model_context_window_exceeded` stop reason (no error).
- Keeping a long session alive means the application must trim or summarize history
  before each call.

Sampling
- At each step the model produces a probability distribution over next tokens, then
  samples from it.
- Lower temperature: probability concentrates on the most likely tokens; output more
  repeatable. Higher temperature: distribution spreads; output more varied.
- Same prompt twice can give different wording even if both answers are correct.
- Sampling controls are model-dependent: the newest Claude models do not accept
  non-default sampling parameters. Setting `temperature`, `top_p` or `top_k` returns a
  400 error; behavior is steered through prompting instead.
- Even where temperature is accepted, temperature 0 makes output more repeatable but does
  NOT guarantee identical outputs across calls.

Non-determinism
- Primary consequence of sampling: identical inputs do not guarantee identical outputs.
- Do not assert exact response text. Assert on a property that must hold: required field
  present, value in range, structure parses.
- To judge meaning rather than structure, use an eval with a model-graded judge.
- The course treats evals as the standard for knowing a feature is correct; Module 3
  builds that capability (per this section's text).

### Rules and traps
- Trap: "dev worked, prod fails." In development the window rarely fills because test
  inputs are short; in production longer inputs and more turns fill it. (Explored in
  Module 2.)
- Trap: believing temperature 0 means deterministic. It does not.
- Trap: sending `temperature`/`top_p`/`top_k` to the newest models. Returns 400.
- Trap: exact-text assertions in tests. They will be inconsistent.

### Java: structural assertion instead of exact text (illustrative)

```java
// Illustrative only. The model may phrase a correct answer many ways, so
// assert on properties (parses, field present, value in range), not on text.
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

class ClassificationContractTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    // 'modelOutput' is whatever text the model returned for this run.
    static void assertContract(String modelOutput) throws Exception {
        JsonNode node = MAPPER.readTree(modelOutput);          // structure parses
        if (!node.hasNonNull("label")) {                       // required field present
            throw new AssertionError("missing label");
        }
        double confidence = node.path("confidence").asDouble(-1);
        if (confidence < 0.0 || confidence > 1.0) {            // value in range
            throw new AssertionError("confidence out of range");
        }
        // For "is the meaning right?" use an eval with a model-graded judge,
        // not string equality.
    }
}
```

### Java: trim history before each call (illustrative pseudocode)

```java
// The window is a fixed token budget; the application must trim or summarize
// history before each call. countTokens(...) is a placeholder; the module does
// not name a token-counting API.
List<Message> fitToBudget(List<Message> history, int inputBudgetTokens) {
    Deque<Message> kept = new ArrayDeque<>();
    int used = 0;
    // Walk newest to oldest so recent turns survive.
    for (int i = history.size() - 1; i >= 0; i--) {
        int t = countTokens(history.get(i));       // placeholder
        if (used + t > inputBudgetTokens) break;   // else the request would be
        kept.addFirst(history.get(i));             // rejected before generation
        used += t;
    }
    // Alternative named by the course: summarize the dropped turns.
    return new ArrayList<>(kept);
}
```

Source gap: the module gives no chars-per-token figure and no concrete window sizes; it
tells you to confirm tokenizer behavior and limits at build time.

---

## 4. Models and Reasoning

### Key ideas
- Claude currently spans four tiers: Fable, Opus, Sonnet, Haiku. Each is a different
  tradeoff across cost, latency and capability.
  - Sonnet: balanced default for most production workloads.
  - Haiku: speed and cost efficiency on tasks within its capability envelope.
  - Opus: demanding work above the Sonnet envelope.
  - Fable: most capable tier; the most demanding reasoning, coding and agentic work where
    maximum intelligence is the priority.
- Practical default: start with Sonnet; move UP a tier only when an eval shows the current
  tier misses your quality bar; move DOWN to Haiku only when an eval shows the quality
  drop is acceptable.
- Confirm current lineup and identifiers at platform.claude.com/docs at build time.
- Reasoning is a separate per-call decision from model choice.
- On current models the reasoning mode is adaptive thinking: the model decides when and
  how much to think; you tune depth with an effort setting, not a fixed token budget.
- The older `budget_tokens` control is deprecated and, on the newest model generations,
  returns a 400 error.
- Thinking content is omitted from responses by default on the newest models; request
  summarized display when you need to show it.
- Reasoning earns its cost on hard, multi-step problems; wasted on lookups and
  classification.
- Per-model defaults differ (some of the newest models think adaptively by default or
  always); confirm thinking defaults for your model at build time.

### How the two levers combine

```
                      Reasoning OFF            Reasoning ON
                +-----------------------+------------------------+
 Capable model  | fast and direct       | most demanding tasks:  |
                |                       | capable model + higher |
                |                       | effort setting         |
                +-----------------------+------------------------+
 Smaller model  | cheapest / simplest   | spends more tokens to  |
                |                       | think                  |
                +-----------------------+------------------------+
```

### Rules and traps
- Trap: treating extended thinking as a different model. It is a per-call setting any
  supporting model can run with on or off.
- Trap: sending `budget_tokens` to the newest models. 400 error; use effort.
- Trap: enabling reasoning for lookups or classification (cost with no benefit).
- Mechanics of enabling reasoning and handling thinking blocks: Module 2. Which model to
  run (cost/latency/quality): Module 4.

### Java: model choice and reasoning are separate fields (illustrative JSON body)

```java
// ILLUSTRATIVE request body only. The module does not give exact field names for
// the effort setting or exact model identifiers; verify both in the API reference.
String body = """
    {
      "model": "<model id from platform.claude.com/docs>",
      "messages": [ { "role": "user", "content": "..." } ]
      /* reasoning/effort configuration is a SEPARATE per-request setting:
         adaptive thinking + an effort level. Field names: Source gap. */
    }
    """;
```

Source gap: the module does not name the request parameter for effort, nor give model
identifier strings.

---

## 5. Prompting Modes: zero-shot, one-shot, multi-shot

### Key ideas
- Prompting mode = how many worked examples you put in the prompt (separate from wording).
  - Zero-shot: instruction, no examples.
  - One-shot: one example (input paired with desired output).
  - Multi-shot (also called few-shot): several examples.
- Examples are NOT training data. They sit in the prompt and show the exact shape of the
  answer that a description alone often fails to pin down.
- Cost/quality trade-off: each example costs tokens on every call and consumes context
  budget.
  - Use zero-shot when the task is simple and the output shape is obvious.
  - Use one-/multi-shot when output has a specific structure, casing or edge case that a
    description keeps missing.
  - One or two correct examples usually fix the issue faster than another paragraph of
    instructions.
- Discipline (reinforced in Module 2): add the smallest amount of prompt that produces a
  reliable result.
- Interaction with model choice: a more capable model often succeeds zero-shot where a
  smaller model needs a few examples to match the structure. Examples can let a cheaper
  model do the job. Decide the two together: simplest model + fewest examples that meet
  your eval.

### Rules and traps
- Trap: assuming examples permanently change the model. Nothing is retrained; the cost
  recurs on every call.
- Trap: adding examples to a task already solved zero-shot (extra cost, little or no gain).
- Trap: piling on more instruction text when the real problem is output shape.

### Java: examples live inside the prompt (illustrative)

```java
// Multi-shot = examples inside the prompt string; they are re-sent (and re-billed
// in tokens) on every call.
String prompt = """
    Classify the support ticket. Answer with one label only.

    Input: "I was charged twice this month."
    Output: BILLING

    Input: "The app crashes when I upload a photo."
    Output: BUG

    Input: "%s"
    Output:
    """.formatted(ticketText);
```

---

## 6. Technical Substrate: SDKs, REST, streaming, async

### Key ideas

SDK vs raw REST
- Claude is reached over an HTTP REST API: request to an endpoint with your API key and a
  JSON body; JSON response back. Any HTTP client works.
- Official SDKs (Python and TypeScript among others) are a thin convenience layer over the
  same REST API: authentication, request construction, retries, response parsing.
- SDK and raw REST reach the same API and the same model; the SDK just saves hand-assembly.
- Module 2 builds against the SDK and the Messages API.

Synchronous, streaming
- Synchronous: send request, wait for the complete response in one piece. Fine for short
  responses and backend jobs with no one waiting.
- Streaming: response sent in pieces as generated. Output appears immediately (no blank
  screen wait); your code reassembles the pieces. Delivered over the same HTTP connection
  using server-sent events. Use when output is long or a user is watching.
- Module 2 covers consuming a stream safely and recovering when interrupted.

Asynchronous patterns (two different problems)
- Async client: Python SDK exposes `AsyncAnthropic` (non-blocking async/await). In the
  TypeScript SDK the standard Anthropic client is already Promise-based (await directly);
  there is NO separate async client class. Request still returns in real time, but your app
  can do other work while waiting. Right pattern for concurrency without blocking.
- Message Batches API: separate pattern for bulk offline work. Submit many requests in
  one call, receive an identifier, poll for completion. Batch jobs can take up to 24 hours
  and run at a lower per-token cost in exchange for latency. Suits offline pipelines,
  evaluation runs and bulk jobs where no user waits and cost matters more than turnaround.

### Decision table

```
 Situation                                   Shape
 ------------------------------------------  ------------------------------------
 Short reply / backend job, nobody waiting   Synchronous
 Long reply or a user watching               Streaming (server-sent events)
 Need concurrency, keep app thread free      Async client (async/await / Promises)
 Thousands of inputs offline, lowest cost    Message Batches: submit, get id, poll
```

### Rules and traps
- Trap: thinking async and Batches are the same. Async = still real-time, non-blocking.
  Batches = up to 24 hours, cheaper per token.
- Trap: streaming for a pipeline with no user watching (buys nothing).
- Trap: a synchronous loop for huge offline volume (course says it would hit rate limits
  and tie up the application).
- Trap: assuming the TypeScript SDK has an async client class. It does not.
- Trap: assuming SDK and REST hit different models. Same API, same model.

### Java: raw REST with java.net.http (illustrative)

```java
// Plain HttpClient against the REST API. Endpoint URL, header names and the exact
// JSON schema are NOT specified in this module; placeholders below.
HttpClient http = HttpClient.newHttpClient();
HttpRequest req = HttpRequest.newBuilder()
        .uri(URI.create("<messages endpoint from the API reference>"))
        .header("Content-Type", "application/json")
        // API key goes in an auth header per the API reference (name: Source gap)
        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
        .build();

// Synchronous: block until the complete response arrives.
HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());

// Async (non-blocking, still real time): app thread is free while waiting.
CompletableFuture<HttpResponse<String>> future =
        http.sendAsync(req, HttpResponse.BodyHandlers.ofString());
future.thenAccept(r -> handle(r.body()));

// Streaming: the course says pieces arrive via server-sent events on the same
// HTTP connection; read the body line by line and reassemble.
HttpResponse<Stream<String>> streamed =
        http.send(req, HttpResponse.BodyHandlers.ofLines());
streamed.body().forEach(line -> { /* parse SSE event, append piece */ });
```

### Java: batch shape (pseudocode)

```java
// Pseudocode of the shape the course describes: one submit call, an identifier,
// then poll. Names are placeholders, not SDK APIs.
String batchId = submitBatch(requests);        // one call, large set of requests
while (!isComplete(batchId)) {                 // may take up to 24 hours
    sleep(pollInterval);
}
List<Result> results = fetchResults(batchId);  // lower per-token cost
```

Source gap: the module does not give batch size limits, endpoint paths, the discount
percentage, or SSE event names.

---

## 7. Checkpoints and Exercises

The wrap-up page shows "0 of 2 checkpoints passed": the Module Quiz and the "Predict the
behavior" exercise.

Source gap: the quiz page lists options A-D without marking the correct one. The answers
below are inferred from the course text and the exercise (the exercise options carry their
own explanation). Exercise partial credit rule is stated: three of four correct earns
partial credit.

### Module Quiz (4 questions, 5 min)

Q1. Identical prompts must return identical text?
- Tests: sampling and non-determinism.
- Correct (B): not necessarily; the model samples each next token from a probability
  distribution, so wording can vary even when both answers are correct.
- Why others fail: not deterministic (A); streaming is irrelevant (C); model size is
  irrelevant (D).

Q2. Model choice vs reasoning mode?
- Tests: the two-lever distinction.
- Correct (C): model choice picks which family member runs; extended thinking is a
  per-call setting any supporting model can run with on or off.
- Why others fail: not the same setting (A); thinking is not a different model (B); not
  fixed per account (D).

Q3. Short, well-specified classification already right zero-shot; add three examples?
- Tests: cost/quality trade-off of examples.
- Correct (B): adds token cost on every call for little or no gain.
- Why others fail: accuracy gain is unlikely since it already works (A); examples do not
  change the model (C) or disable sampling (D).

Q4. Thousands of inputs offline at the lowest cost?
- Tests: choosing a request shape.
- Correct (C): batch submission with polling.
- Why others fail: sync loop (A) and streaming (B) do not minimize cost or suit offline
  volume; a larger window (D) does not address the problem.

### Exercise: Predict the Behavior (4 scenarios, 6 min)

Each scenario maps to one foundation: sampling, prompting mode, request shape, context
budget.

Scenario 1 - classification at temperature 0 vs high temperature.
- Tests: sampling / temperature.
- Correct (A): at low temperature probability concentrates on likely tokens, so repeated
  runs return the same label far more consistently, but never with guaranteed
  determinism, even at temperature 0. At high temperature the distribution spreads, so
  wording and even the chosen label can vary. For a classifier you want the
  low-temperature, repeatable behavior.
- Wrong options claim temperature only affects length, that high temperature is more
  accurate, or that classification ignores sampling.

Scenario 2 - wrong structure under zero-shot; switch to multi-shot.
- Tests: prompting mode.
- Correct (B): two or three correct input-output examples show the exact structure to
  match, usually fixing what more instruction text did not. Cost: extra tokens on every
  call, so add the fewest examples that make output reliable.
- Wrong options claim retraining/permanence, that only temperature changes shape, or that
  examples lower per-call token cost.

Scenario 3 - 50,000 documents overnight, no user waiting.
- Tests: request shape.
- Correct (C): batch pattern: submit requests and poll, accepting longer latency for lower
  per-token cost. A synchronous loop would hit rate limits and tie up the application;
  streaming buys nothing because no user is watching.
- Wrong option D: a larger window does not remove the need for per-document requests
  (fitting all 50,000 into one request is not the answer).

Scenario 4 - long multi-turn agent session whose window keeps filling.
- Tests: context budget.
- Correct (B): the window is a fixed token budget; as history and tool results accumulate
  it fills. Oversized input is rejected with an error before generation; a request that
  fits on input but hits the ceiling mid-generation returns truncated output with a
  `model_context_window_exceeded` stop reason. Symptom: a session that ran fine in
  testing fails once inputs grow, so the application must trim or summarize history.
- Wrong options: silent dropping of oldest turns with no error; temperature as the budget
  at fault; an auto-expanding window.

### Recap: five takeaways (as stated)
1. Tokens are the unit of input, output and cost; think and budget in tokens, not words.
2. The context window is a fixed token budget holding the whole request; managing history
   is the application's job.
3. Sampling makes generation non-deterministic; testing on exact text is unreliable; this
   is what evals are built for.
4. Model choice and reasoning mode are separate, composable levers; pick the smallest model
   and simplest reasoning/prompting that meet your eval.
5. A developer reaches Claude over a REST API, usually through an SDK; choose sync,
   streaming, async/await or batch by whether a user is waiting and real-time vs bulk
   offline.

### Course map (from the wrap-up)
- M1 MSO Foundations: tokens, context, sampling, model tiers, prompting modes, technical
  substrate (this module).
- M2 Production-Grade Prompting, Agents & Tool-use: prompting craft, extended thinking,
  tool schemas, streaming, context engineering, agent construction.
- M3 Claude Code, MCP & Integration: permission modes, durable project context, plugin
  packaging, MCP integration without leaking credentials.
- M4 Production Engineering, Evals, and Security: evals, tracing, failure handling, cost
  and orchestration budgets, security boundaries.
- M5 Accelerators and IP Contribution: package accelerators, verifiable contributions,
  deployment platforms, trust boundaries.

Source gap: the "How LLMs Behave" section says evals are built in Module 3, but the
wrap-up course map lists evals under Module 4 and Module 3 as Claude Code/MCP. The
module-number reference for evals is ambiguous.

---

## 8. Common Mistakes

| Mistake | Fix |
|---|---|
| Asserting exact response text in tests | Assert properties (field present, value in range, structure parses); use a model-graded eval for meaning |
| Assuming temperature 0 gives identical outputs | It is more repeatable, not guaranteed identical |
| Setting `temperature`, `top_p` or `top_k` on the newest models | They return 400; steer behavior through prompting |
| Using `budget_tokens` for thinking on the newest models | Deprecated, returns 400; use adaptive thinking with an effort setting |
| Treating extended thinking as a different model | It is a per-call setting independent of model choice |
| Enabling reasoning on lookups or classification | Reserve it for hard, multi-step problems |
| Counting words instead of tokens when estimating cost or fit | Count tokens (prompt, history, tool definitions, tool results, response) |
| Applying a fixed chars-per-token rule of thumb | It is tokenizer/model dependent; confirm at build time |
| Not trimming or summarizing history in long sessions | Do it before each call; oversized input is rejected, mid-generation overflow truncates output |
| Trusting dev behavior for window use | Production inputs are longer and have more turns; plan for it |
| Believing examples retrain the model | They live in the prompt and cost tokens every call |
| Adding examples when zero-shot already works | Stay zero-shot; add the smallest prompt that is reliable |
| Writing more instruction paragraphs for a structure problem | Add one or two correct examples |
| Jumping to the biggest model by default | Start at Sonnet; move up or down only when an eval says so |
| Sync loop or streaming for 50,000 offline documents | Use Message Batches: submit, get identifier, poll |
| Confusing async client with Batches API | Async = real-time and non-blocking; Batches = up to 24 hours, lower per-token cost |
| Looking for an async client class in the TypeScript SDK | The standard client is Promise-based; there is none |
| Treating SDK and REST as different capabilities | Same API and model; SDK adds auth, request building, retries, parsing |

---

## 9. Key Terms

Source gap: the module has no formal glossary page. Terms below are drawn from the bolded
terms, recap and teaching text.

| Term | Meaning |
|---|---|
| Token | The unit Claude reads and the API bills in; counts prompt, history, tool definitions, tool results and response |
| Context window | Fixed token budget for one request: system prompt, conversation, documents, tool results and output |
| `model_context_window_exceeded` | Stop reason returned when generation hits the window ceiling; output so far is returned, no error |
| Sampling | Choosing each next token from a probability distribution rather than a fixed pick |
| Temperature | Setting shaping the distribution: lower is more repeatable, higher is more varied; 0 is not a determinism guarantee |
| `top_p` / `top_k` | Other sampling controls; rejected with 400 on the newest models when non-default |
| Non-determinism | Identical inputs do not guarantee identical outputs |
| Eval | Check (including model-graded judge) used to decide a feature is correct and to justify model/prompt choices |
| Fable / Opus / Sonnet / Haiku | The four tiers; Sonnet is the balanced default, Haiku speed/cost, Opus above Sonnet, Fable most capable |
| Adaptive thinking | Reasoning mode where the model decides when and how much to think |
| Effort setting | Tunes reasoning depth in place of a fixed token budget |
| `budget_tokens` | Older fixed thinking-budget control; deprecated, 400 on newest generations |
| Extended thinking | Per-call reasoning setting; independent of which model runs |
| Zero-shot | Instruction only, no examples |
| One-shot | One input/output example in the prompt |
| Multi-shot (few-shot) | Several input/output examples in the prompt |
| REST API | HTTP endpoint taking an API key and JSON body, returning JSON |
| SDK | Official thin convenience layer over the REST API (auth, requests, retries, parsing) |
| Synchronous | Send and wait for the complete response in one piece |
| Streaming | Response delivered in pieces as generated, via server-sent events on the same HTTP connection |
| `AsyncAnthropic` | Python SDK async client using async/await |
| Message Batches API | Bulk offline pattern: submit many requests, receive an id, poll; up to 24 hours; lower per-token cost |
| Messages API | The API Module 2 builds against via the SDK |

---

## 10. Exam-style Self-test

Q1. Why can two identical prompts return different text?
A. The model samples each next token from a probability distribution, so wording can vary
even when both answers are correct.

Q2. You set temperature to 0. Are outputs guaranteed identical across calls?
A. No. It makes output more repeatable but does not guarantee identical outputs.

Q3. What happens when the input is larger than the context window versus when the input
fits but the output hits the ceiling?
A. Oversized input is rejected with a validation error before generation. If it fits on
input but reaches the ceiling during generation, current models return the output so far
with a `model_context_window_exceeded` stop reason.

Q4. What goes into the context window?
A. System prompt, full conversation, injected documents, every tool result, and the model
output.

Q5. How should you test a Claude feature given non-determinism?
A. Assert on properties that must hold (field present, value in range, structure parses);
use a model-graded eval to judge meaning; do not assert exact text.

Q6. What is the practical default for choosing a tier, and when do you move?
A. Start with Sonnet; move up only when an eval shows the current tier misses the quality
bar; move down to Haiku only when an eval shows the quality drop is acceptable.

Q7. How do model choice and reasoning mode relate, and how is depth tuned on current
models?
A. They are independent, composable levers: model is picked per family member, reasoning
is a per-call setting. Adaptive thinking is tuned with an effort setting, not
`budget_tokens` (deprecated; 400 on the newest generations).

Q8. A short, well-specified classification task works zero-shot. Should you add three
examples?
A. No. It adds token cost on every call for little or no gain.

Q9. Your task keeps returning the wrong structure zero-shot. What is the usual fix and its
cost?
A. Add one to a few correct input-output examples (one-/multi-shot); cost is extra tokens
on every call, so use the fewest that make output reliable. Examples are not training.

Q10. Contrast the async client with the Message Batches API.
A. Async client (`AsyncAnthropic` in Python; Promise-based client in TypeScript) is
non-blocking but still real time. Batches is for bulk offline work: submit a large set,
get an identifier, poll; up to 24 hours; lower per-token cost.

Q11. 50,000 documents overnight, no user waiting. Which shape and why?
A. Batch submission with polling: longer latency accepted for lower per-token cost. A sync
loop would hit rate limits and tie up the app; streaming buys nothing with no user
watching.

Q12. How does streaming reach the client, and when do you use it?
A. Pieces are sent as the model generates, over the same HTTP connection using
server-sent events; use it when a response is long or a user is watching.
