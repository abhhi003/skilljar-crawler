# Core: Building with the Claude API and MCP - Study Notes

Sources: Anthropic Academy courses "Building with the Claude API" (85 lesson pages) and "Introduction to Model Context Protocol" (14 lesson pages). Eleven of the MCP course's 14 lessons (02-06, 08-12, 14) are the MCP section of the API course (lessons 60-70), so both are merged into ONE MCP section here (section 15). The sites' own full-course notes are the primary source for both courses. Notes follow API-course order. The course examples are Python/JSON; request and response JSON shapes and parameter names below are kept as the course states them, and client-side logic is shown as plain illustrative Java (labelled "illustrative, not from the course").

## Platform differences live elsewhere

- Google Cloud (Vertex AI) and Amazon Bedrock differences are in `02-delta-google-vertex.md` and `03-delta-amazon-bedrock.md` in this same folder.
- This file is platform-neutral except where it states that the course used the Anthropic API directly: the API key from the Anthropic Console and the `anthropic` Python package and client (section 3, tagged "Anthropic API directly"), plus the parameter names, block types and built-in tool type strings, which are quoted exactly as the Anthropic API names them.

Conventions used in these notes
- "The course says" facts come from the official course notes. Anything I could not find there is flagged "Source gap:". Where the two official note sets disagree and I could not settle it, the line starts "Source conflict:".
- Java snippets use only java.net.http.HttpClient ideas, records and my own small interfaces (for example `Llm`). No Anthropic SDK or MCP SDK class or method names are used or implied.
- Endpoint URL, auth headers and the exact JSON key for stop sequences are not stated in the course notes, so they appear only as placeholders.
- MCP: the course builds its server and client in Python (MCP Python SDK). Python names, decorators, method names and CLI steps are quoted exactly in blocks labelled "as the course shows it". The course never shows the raw JSON-RPC wire format, only message TYPES (list tools, call tool, read resource, each with request/result), so wire method names and field names are placeholders in the Java sketches.

---

## 1. Big Picture

- The course takes a developer from "what is each Claude model for" to building agents. It first covers the raw Messages request (model, max_tokens, messages), then wraps it in progressively richer machinery.
- Core fact: the API is stateless. Your code owns conversation history and sends all of it on every request.
- Output control comes from prompt-side levers (system prompt, temperature, prefill, stop sequences) plus the prompt-engineering techniques (clear, specific, XML tags, examples).
- You do not ship a prompt without measuring it. The course builds a small eval pipeline (dataset + prompt + LLM + grader) and then re-uses it to score each prompt-engineering technique.
- Tool use lets Claude reach outside its training data: Claude asks, your server runs the function, you send a tool_result back, and a loop repeats until Claude stops asking.
- Beyond custom tools: RAG for big documents, and built-in features (extended thinking, images, PDFs, citations, prompt caching, code execution + Files API).
- MCP moves the job of writing tool schemas and functions from your app to an MCP server. The server exposes three primitives with three different controllers: tools (model-controlled), resources (app-controlled), prompts (user-controlled).
- Claude Code and Computer Use are applied examples; the course ends with workflows (parallelization, chaining, routing, evaluator-optimizer) versus agents, recommending workflows for reliability.

```
 MODELS          ACCESS            CONTROL              MEASURE
 Opus/Sonnet/ -> API key, server, -> system prompt,   -> eval pipeline:
 Haiku           messages.create     temperature,        dataset + prompt
                 multi-turn,         streaming,          + LLM + grader
                 max_tokens          prefill, stop seq.  (code / model)
                                           |
                                           v
 PROMPT ENGINEERING  ->  TOOL USE  ->  RAG + FEATURES  ->  MCP
 clear, specific,        schemas,      chunk, embed,        server: tools,
 XML tags, examples      tool_use /    BM25, RRF, rerank;   resources,
 (score each step)       tool_result   thinking, vision,    prompts
                         loop          PDF, citations,      client: list/call
                                       caching, code exec
                                           |
                                           v
 CLAUDE CODE / COMPUTER USE  ->  WORKFLOWS (chain, parallel, route,
 (agents in practice)            evaluator-optimizer)  vs  AGENTS
                                 "prefer workflows for reliability"
```

---

## 2. Overview of Claude Models

Key ideas
- Three families, each optimized for a different priority:
  - Opus = highest intelligence; complex, multi-step tasks needing deep reasoning and planning. Trade-off: higher cost and latency.
  - Sonnet = balanced intelligence, speed and cost. Strong coding and precise code editing. Best for most practical use cases.
  - Haiku = fastest, optimized for speed and cost. No reasoning capabilities like Opus/Sonnet. Best for real-time user interactions and high-volume processing.
- Selection framework: intelligence priority -> Opus; speed priority -> Haiku; balanced -> Sonnet.
- Common approach: use several models in the same application, chosen per task, instead of one model for everything.
- All models share core capabilities: text generation, coding, image analysis. The difference is optimization focus.
- Later in the course: Haiku is suggested for generating test datasets and is used to run the eval (about 31 seconds for the full dataset).

Rules and traps
- Do not pick a model by name recall; pick by priority (intelligence / speed / balance).
- Source gap: the course notes give no model version numbers, context windows or prices. Do not memorize any here.

---

## 3. Accessing the API

### 3.1 The five-step access flow

```
 Client app          Your server              Anthropic API
 (browser/mobile)    (holds API key)
     |  user text        |                          |
     |------------------>|  request via SDK/HTTP    |
     |                   |------------------------->|
     |                   |   (api key + model +     |
     |                   |    messages + max_tokens)|
     |                   |                          | tokenize -> embed ->
     |                   |                          | contextualize -> generate
     |                   |<-------------------------|
     |                   |  text + usage + stop_reason
     |<------------------|                          |
     |  display          |                          |
```

Key ideas
- Step 1: the client sends user text to YOUR server. Never call the Anthropic API directly from client apps, to keep the API key secret.
- Step 2: the server calls the API using an SDK (Python, TypeScript, JavaScript, Go, Ruby) or plain HTTP. Required parameters: API key, model name, messages list, max_tokens limit.
- Step 3: text generation has four stages:
  - Tokenization = break input into tokens (words, word parts, symbols, spaces).
  - Embedding = convert tokens to number lists representing all possible word meanings.
  - Contextualization = adjust embeddings using neighboring tokens to determine precise meaning.
  - Generation = output layer produces probabilities for the next word; the model picks using probability plus randomness, appends the pick, and repeats.
- Step 4: the model stops when max_tokens is reached or a special end_of_sequence token is generated.
- Step 5: the API returns generated text plus usage counts plus stop_reason; the server forwards to the client.

### 3.2 Getting an API key (written guide; Anthropic API directly)

- Go to the Anthropic API Console (console.anthropic.com) and log in.
- Click 'Get API Keys' (top right of the dashboard), then 'Create Key' (top right of the next page).
- Create the key in workspace 'Default' and give it a name (the guide uses 'Anthropic Course'); the name is only to help you identify keys.
- Copy the key from the pop-up. It is displayed only once. If you close the window by accident, delete the old key and generate a new one.

### 3.3 Making a request (Anthropic API directly)

Setup steps (course uses a Jupyter notebook)
1. Install packages: `pip install anthropic python-dotenv`.
2. Store the key in a `.env` file as `ANTHROPIC_API_KEY="your_key"`; keep that file out of version control.
3. Load the env variable with python-dotenv.
4. Create the client and define a model variable (the course writes `claude-3-sonnet`).

Request structure
- Function: `client.messages.create()`.
- Required arguments: `model`, `max_tokens`, `messages`.
- `max_tokens` is a safety limit on generation length, NOT a target length.
- `messages` is a list of conversation exchanges. A user message is `{"role": "user", "content": "your text"}`; an assistant message holds model-generated content.
- Full response has metadata and a nested structure; the text only is `message.content[0].text`.
- Course example: `client.messages.create(model=model, max_tokens=1000, messages=[{"role": "user", "content": "What is quantum computing?"}])`.

Request body shape (JSON, as the course describes the arguments):

```
{
  "model": "<model name>",
  "max_tokens": 1000,
  "messages": [
    {"role": "user", "content": "What is quantum computing?"}
  ]
}
```

Java sketch of sending that body (illustrative, not from the course)

```java
// illustrative, not from the course
// Endpoint and auth headers are NOT stated in the course notes; fill in from Anthropic docs.
import java.net.URI;
import java.net.http.*;

public class RawRequest {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("ANTHROPIC_API_KEY"); // key lives on the server only
        String body = """
            {"model": "<model name>",
             "max_tokens": 1000,
             "messages": [{"role": "user", "content": "What is quantum computing?"}]}
            """;
        HttpRequest req = HttpRequest.newBuilder(URI.create("<messages endpoint>"))
                // .header(<auth and version headers per Anthropic docs>, apiKey)
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> resp =
                HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
        // The generated text lives at content[0].text in the response JSON.
        System.out.println(resp.body());
    }
}
```

Rules and traps
- max_tokens too low truncates output (stop reason would be the limit, not a natural end).
- Response text is nested: read `content[0].text`, not the whole object.

---

## 4. Multi-Turn Conversations

Key ideas
- The Anthropic API stores NO messages. Each request is independent, with no memory of earlier exchanges.
- To continue a conversation: (1) maintain a message list in your code; (2) send the ENTIRE history with every follow-up request.
- Message structure: list of dictionaries with `"role"` (user/assistant) and `"content"`.
- Flow: send the initial user message -> receive assistant response -> append the assistant response to history -> add the new user message -> send the complete history.
- Helper functions the course builds: `add_user_message(messages, text)`, `add_assistant_message(messages, text)`, `chat(messages)` (sends history, returns response).
- Without history, replies lack context. With complete history, Claude keeps context and gives relevant follow-ups.

```
 Turn 1 request : [user1]
 Turn 1 reply   : assistant1       -> append
 Turn 2 request : [user1, assistant1, user2]
 Turn 2 reply   : assistant2       -> append
 Turn 3 request : [user1, assistant1, user2, assistant2, user3]
```

Java sketch of the history handling (illustrative, not from the course)

```java
// illustrative, not from the course
import java.util.*;

record Message(String role, String content) {}

// My own abstraction: "send this history, give me the assistant text".
interface Llm { String chat(List<Message> history); }

class Conversation {
    private final List<Message> history = new ArrayList<>();
    private final Llm llm;
    Conversation(Llm llm) { this.llm = llm; }

    String ask(String userText) {
        history.add(new Message("user", userText));      // add_user_message
        String reply = llm.chat(List.copyOf(history));   // full history every time
        history.add(new Message("assistant", reply));    // add_assistant_message
        return reply;
    }
}
```

Rules and traps
- Because history grows with every turn, the whole thing is re-sent each time (this is also why prompt caching, section 14, matters).

---

## 5. System Prompts

Key ideas
- A system prompt customizes Claude's response style and tone by assigning a role or behavior pattern.
- Implementation: pass a plain string using the `system` keyword argument to the create function.
- Purpose: control HOW Claude responds, not WHAT it responds. Example: a math tutor gives hints rather than direct answers.
- Structure: first line usually assigns the role ("You are a patient math tutor"), then specific behavioral instructions.
- Same question gets different treatment depending on the assigned role.
- Implementation detail from the course: build a params dictionary, add the `system` key only if a prompt was provided, and pass params to create with `**` unpacking. If the prompt is None, exclude the `system` parameter entirely.

Java sketch (illustrative, not from the course)

```java
// illustrative, not from the course
// Include "system" in the request only when a prompt exists (course: omit the key for None).
static String buildBody(String model, int maxTokens, String messagesJson, String systemOrNull) {
    StringBuilder sb = new StringBuilder();
    sb.append("{\"model\":\"").append(model).append("\",");
    sb.append("\"max_tokens\":").append(maxTokens).append(",");
    if (systemOrNull != null && !systemOrNull.isBlank()) {
        sb.append("\"system\":\"").append(systemOrNull.replace("\"", "\\\"")).append("\",");
    }
    sb.append("\"messages\":").append(messagesJson).append("}");
    return sb.toString();
}
```

---

## 6. Temperature

Key ideas
- Temperature is a parameter in the range 0-1 that controls randomness in token selection.
- Generation process: tokenize -> assign probabilities to possible next tokens -> select by probability -> repeat. Temperature manipulates that distribution.
- Temperature 0 = deterministic; always selects the highest-probability token.
- Higher temperature = more chance of lower-probability tokens; more creative or unexpected output.
- Low (near 0): data extraction and factual tasks needing consistency.
- High (near 1): brainstorming, writing, jokes, marketing.
- Higher values do not guarantee different outputs; they only increase the probability of variation.

```
 temp 0  : token probs  [0.7 0.2 0.1]  -> always picks the 0.7 token
 temp ~1 : flatter odds                -> 0.2 and 0.1 tokens picked more often
```

---

## 7. Response Streaming

Key ideas
- Problem: responses can take 10-30 seconds; users expect immediate feedback, not just spinners.
- Flow: server sends the user message -> Claude immediately sends an initial acknowledgment (no text) -> a stream of events each carrying text chunks -> server forwards chunks to the frontend for real-time display.
- Event types:
  - `message_start` = initial acknowledgment.
  - `content_block_start` = text generation begins.
  - `content_block_delta` = contains the actual text chunks (most important).
  - `content_block_stop` / `message_stop` = generation complete.
- Implementation: basic `client.messages.create(stream=True)` returns an event iterator. Simplified: `client.messages.stream()` with a `text_stream` property that yields just the text. `stream.get_final_message()` assembles all chunks for storage.
- Benefits: better UX through immediate visibility; complete message captured for database storage.

```
 message_start -> content_block_start -> content_block_delta x N -> content_block_stop -> message_stop
                                              |
                                              +--> forward chunk to frontend (UI)
                                              +--> also accumulate for DB storage
```

Java sketch of accumulate-and-forward (illustrative, not from the course)

```java
// illustrative, not from the course
// "Event" is my own record; the course names the event types but the wire format of
// a delta is not given in the notes.
import java.util.function.Consumer;

record Event(String type, String textChunk) {}

static String consume(Iterable<Event> events, Consumer<String> sendToFrontend) {
    StringBuilder full = new StringBuilder();
    for (Event e : events) {
        if (e.type().equals("content_block_delta")) {   // the one that carries text
            sendToFrontend.accept(e.textChunk());       // real-time display
            full.append(e.textChunk());                 // keep for storage
        }
        // message_start / content_block_start / *_stop: no text to show
    }
    return full.toString(); // equivalent role to get_final_message(): store this
}
```

---

## 8. Controlling Model Output (Prefill and Stop Sequences)

Key ideas
- Two techniques beyond editing the prompt.
- Pre-filling assistant messages: manually add an assistant message at the END of the conversation to steer direction.
  - Claude sees it as already-authored content and continues from the exact end of the prefill.
  - Claude continues from the exact endpoint, not complete sentences; you must stitch prefill + generated text together.
  - Example: prefill "Coffee is better because" -> Claude continues with a justification for coffee.
- Stop sequences: force Claude to halt when a specific string appears.
  - Provide the stop sequence string in the chat function.
  - When Claude generates that exact string, the response stops immediately; the stop text is NOT included in the output.
  - Example: "count 1 to 10" with stop sequence "five" -> output stops at "four, " (five not included). Refined with ", five" -> clean "one, two, three, four".

```
 messages = [ user: "Coffee or tea? Pick one."
              assistant (prefill): "Coffee is better because" ]
 Claude continues:  " it gives ..."      <- starts exactly after the prefill
 Final text = prefill + continuation   (you stitch)
```

Java sketch of stitching (illustrative, not from the course)

```java
// illustrative, not from the course
// Last message is an assistant message: this IS the prefill.
List<Message> msgs = List.of(
    new Message("user", "Coffee or tea? Pick one and argue for it."),
    new Message("assistant", "Coffee is better because"));
String continuation = llm.chat(msgs);               // continues from "because"
String finalText = "Coffee is better because" + continuation; // stitch yourself
```

Rules and traps
- Prefill is not a complete sentence; Claude continues from the exact end, so mind spaces and punctuation.
- Source gap: the notes do not state the JSON key for stop sequences or any constraint on prefill content.

---

## 9. Structured Data

Key ideas
- Problem: Claude naturally adds markdown formatting, headers and commentary when generating JSON/code/structured content. Users often want raw data for copy/paste.
- Solution pattern:
  1. User message = request for structured data.
  2. Assistant message prefill = opening delimiter (for example "```json").
  3. Stop sequence = closing delimiter (for example "```").
- Claude thinks it has already started the response, generates only the requested content, and stops at the delimiter.
- Works for any structured type (JSON, Python code, lists), not just JSON.
- This same pattern is reused later for dataset generation, model grading and reranking.

```
 user      : "Give me an AWS Lambda config as JSON"
 assistant : "```json"        <- prefill (opening delimiter)
 Claude    : { ... raw JSON ... }
 stop seq  : "```"            <- generation halts here, delimiter not returned
```

Java sketch (illustrative, not from the course)

```java
// illustrative, not from the course
String raw = llm.chatWithPrefillAndStop(
        "Give me an AWS Lambda config as JSON",
        "```json",   // prefill: opening delimiter
        "```");      // stop sequence: closing delimiter
// 'raw' is only the JSON body, ready to parse (your own parser, e.g. Jackson, is your choice).
```

---

## 10. Prompt Evaluation

### 10.1 Why evaluate

Key ideas
- Prompt engineering = techniques for writing and editing prompts so Claude understands the request and the desired response.
- Prompt evaluation = automated testing of prompts using objective metrics.
- Three paths after writing a prompt:
  1. Test once or twice, deploy to production (trap).
  2. Test with custom inputs, minor tweaks for corner cases (trap).
  3. Run through an evaluation pipeline for objective scoring (recommended).
- Engineers commonly under-test prompts.

### 10.2 A typical eval workflow (6 steps)

```
 1 write initial prompt draft (baseline)
 2 create evaluation dataset (3 examples or thousands; hand-written or LLM-generated)
 3 generate prompt variations (interpolate each dataset input into the template)
 4 get LLM responses for every variation
 5 grade responses (e.g. 1-10), average the scores = overall prompt performance
 6 iterate: modify prompt, repeat all steps, compare versions (A/B)
```

- No standard methodology exists. Many open-source and paid tools exist; you can start with a simple custom implementation. Grading complexity varies.

### 10.3 Generating test datasets

- Course goal: an AWS code-assistance prompt that outputs ONLY Python, JSON config, or regex, with no explanations.
- Dataset = array of JSON objects, each with a `task` property describing a user request.
- Approaches: manual assembly, or generate with Claude (use a faster model like Haiku for generation).
- Generation recipe: prompt Claude for test cases -> prefill assistant with "```json" -> stop sequence "```" -> parse as JSON -> save to a file. The course's `generate_dataset()` writes `dataset.json`.

### 10.4 Running the eval

- Test case = one record (JSON object) from the dataset.
- Three core functions:
  - `run_prompt` = merge test case with prompt, send to Claude, return output.
  - `run_test_case` = call run_prompt, grade the result, return a summary dictionary.
  - `run_eval` = loop through the dataset, call run_test_case each time, assemble results.
- v1 prompt: "Please solve the following task: [test_case_task]".
- v1 limitations: no output-format instructions, hardcoded scoring (score=10), verbose Claude responses.
- Runtime about 31 seconds with Haiku for the full dataset. Output = array of objects with Claude output, original test case, and score.
- Eval pipeline core = dataset + prompt + LLM + grader, with minimal code.

Java sketch of the harness shape (illustrative, not from the course)

```java
// illustrative, not from the course
import java.util.*;

record TestCase(String task, String format) {}
record Result(String output, TestCase testCase, double score) {}

interface Grader { double grade(TestCase tc, String output); }

class EvalHarness {
    private final Llm llm; private final Grader grader; private final String template;
    EvalHarness(Llm llm, Grader grader, String template) {
        this.llm = llm; this.grader = grader; this.template = template;
    }
    String runPrompt(TestCase tc) {                       // run_prompt
        String prompt = template.replace("{task}", tc.task());
        return llm.chat(List.of(new Message("user", prompt)));
    }
    Result runTestCase(TestCase tc) {                     // run_test_case
        String out = runPrompt(tc);
        return new Result(out, tc, grader.grade(tc, out));
    }
    List<Result> runEval(List<TestCase> dataset) {        // run_eval
        List<Result> results = new ArrayList<>();
        for (TestCase tc : dataset) results.add(runTestCase(tc));
        return results;
    }
    static double average(List<Result> rs) {
        return rs.stream().mapToDouble(Result::score).average().orElse(0);
    }
}
```

### 10.5 Model-based grading

- Graders return an objective signal, usually a number (1-10 scale, 10 = highest). Define evaluation criteria up front.
- Three grader types:
  - Code graders = programmatic checks (length, word presence, syntax validation, readability scores).
  - Model graders = an additional API call that evaluates the original output; very flexible (quality, instruction following).
  - Human graders = most flexible but time-consuming and tedious.
- Model-grader pattern:
  - Detailed grading prompt asking for strengths, weaknesses, reasoning AND score (not the score alone, which tends to produce default middling scores).
  - JSON response format using prefill + stop sequence.
  - Parse the JSON for score and reasoning; average scores across test cases.
- Model graders are flexible but may be inconsistent; they still give an objective baseline.

### 10.6 Code-based grading

- Automated validation for outputs containing code, JSON or regex:
  - `validate_json()` = try to parse JSON; 10 if valid, 0 if error.
  - `validate_python()` = try AST parsing; 10 if valid, 0 if error.
  - `validate_regex()` = try to compile the regex; 10 if valid, 0 if error.
- Dataset must include a `"format"` key (JSON / Python / RegEx) so the right validator is chosen; update the dataset-generation prompt template accordingly.
- Prompt side: instruct the model to respond ONLY with raw code/JSON/regex (no comments or explanation), use prefill with a code-fence and a stop sequence to extract clean output.
- Final score = (model_score + syntax_score) / 2: combines semantic evaluation with syntax validity.
- Key limitation: you must know the expected format to pick the validator.

Java sketch of the regex/JSON validators and combined score (illustrative, not from the course)

```java
// illustrative, not from the course
static int validateRegex(String s) {
    try { java.util.regex.Pattern.compile(s); return 10; }
    catch (java.util.regex.PatternSyntaxException e) { return 0; }
}
static int validateJson(String s) {
    try { MyJson.parse(s); return 10; }   // MyJson = whatever JSON parser you use
    catch (Exception e) { return 0; }
}
// validate_python in the course uses Python's AST parser; no direct Java equivalent here.

static double combined(double modelScore, double syntaxScore) {
    return (modelScore + syntaxScore) / 2.0;  // course formula
}
```

- Source gap: the grading prompt text was not captured.

---

## 11. Prompt Engineering

Setup shared across the module
- Start with a deliberately poor prompt, apply one technique at a time, re-run the eval after each, and watch the score climb.
- Example goal: generate a one-day meal plan for athletes from height, weight, physical goal and dietary restrictions.
- Updated pipeline: a flexible prompt evaluator class with concurrency (tune `max_concurrent_tasks` to rate limits), a `generate_dataset()` method, a `run_prompt()` per test case.
- Key inputs: `prompt_input_spec` (dictionary defining the prompt's required inputs) and `extra_criteria` (additional requirements for model grading). Output report: `output.html`.
- Expect a poor starting score (example 2.32), especially with less capable models.

Score progression the course reports

```
 initial basic prompt         2.32
 + clear and direct           3.92
 + being specific (guidelines) 7.86
```
(The notes give no scores after XML tags or examples.)

### 11.1 Being clear and direct
- Use simple, direct language with an ACTION VERB in the first line; the first line is the most critical part of the prompt.
- Structure: action verb + clear task description + output specifications.
- Examples: "Write three paragraphs about how solar panels work"; "Identify three countries that use geothermal energy and for each include generation stats"; "Generate a one day meal plan for an athlete that meets their dietary restrictions".
- Result in the course: 2.32 -> 3.92.

### 11.2 Being specific
- Add guidelines or steps to push output in a direction. Two types:
  - Type A (Attributes) = list qualities wanted in the output (length, structure, format). Recommended for almost all prompts.
  - Type B (Steps) = give specific steps for the model to follow in its reasoning. Use for complex problems where you want a broader perspective or viewpoints the model might not consider on its own.
- A controls output characteristics; B controls how the model arrives at the answer. Often combined.
- Result: 3.92 -> 7.86.

### 11.3 Structure with XML tags
- Wrap interpolated content in descriptive tags so the model can distinguish content types and groupings, especially with large amounts of content.
- Use specific tag names: `<sales_records>` is better than `<data>`.
- Example: a debugging prompt separates `<my_code>` and `<docs>`.
- Helps even for small content blocks, for example `<athlete_information>`, to signal it is external input to consider.

### 11.4 Providing examples (one-shot / multi-shot)
- One-shot = one example; multi-shot = several.
- Wrap examples in XML tags containing sample input and ideal output to separate them from the real prompt.
- Applications: corner cases (e.g. sarcasm detection), complex output formats (JSON structures), clarifying expected quality/style.
- Best practices: add context for corner cases ("be especially careful with sarcasm"); explain WHY the output is ideal; use the highest-scoring outputs from your evals as examples; place examples after the main instructions and guidelines.

Java sketch of a templated, tag-structured prompt (illustrative, not from the course)

```java
// illustrative, not from the course
String prompt = """
    Generate a one day meal plan for an athlete that meets their dietary restrictions.

    Guidelines:
    - Include total calories, protein, carbs and fat
    - Format as a list of meals with times

    <athlete_information>
    %s
    </athlete_information>

    <example>
      <input>...sample athlete...</input>
      <ideal_output>...highest-scoring plan...</ideal_output>
      <why>...what makes it ideal...</why>
    </example>
    """.formatted(athleteInfo);
```


---

## 12. Tool Use

### 12.1 Why tools and the five-step flow
- By default Claude only knows its training data and lacks current or real-time information.
- Flow:
  1. Send the initial request plus instructions for external data access.
  2. Claude decides if external data is needed and requests specific information.
  3. Your server runs code to fetch the data.
  4. Send a follow-up request containing the retrieved data.
  5. Claude produces the final response from the original prompt plus the data.
- Weather example: user asks about weather -> Claude requests weather data -> server calls a weather API -> data returned -> Claude answers.

### 12.2 Project overview (the reminder assistant)
- Goal: teach Claude to set time-based reminders (for example "Set reminder for doctor's appointment, week from Thursday" -> "I will remind you at that point in time").
- Three problems and three tools:
  1. Claude knows the current date but not the exact time -> current datetime tool.
  2. Claude sometimes miscalculates date arithmetic (example: 379 days from January 13th, 1973) -> duration addition tool.
  3. No reminder mechanism -> reminder setting tool.
- Build one tool at a time, then coordinate several.

### 12.3 Tool functions
- A tool function is a plain function your code runs when Claude asks for more information.
- Best practices: well-named functions and arguments; validate inputs and raise errors immediately; meaningful error messages that guide correction.
- Error messages are visible to Claude, so it can retry with corrected parameters.
- Course example: `get_current_datetime(date_format="%Y%m%d %H:%M:%S")` raising `ValueError("date format cannot be empty")` if the format is empty.

Java equivalent (illustrative, not from the course)

```java
// illustrative, not from the course
static String getCurrentDatetime(String dateFormat) {
    if (dateFormat == null || dateFormat.isEmpty())
        throw new IllegalArgumentException("date format cannot be empty"); // visible to Claude
    return java.time.LocalDateTime.now()
            .format(java.time.format.DateTimeFormatter.ofPattern(dateFormat));
}
```

### 12.4 Tool schemas
- A tool schema is a JSON Schema spec describing a tool function and its parameters. JSON Schema is a general data-validation spec (not ML specific) adopted for tool calling.
- Structure:
  - `name` = tool identifier.
  - `description` = 3-4 sentences: what the tool does, when to use it, what it returns.
  - `input_schema` = the JSON schema for the function arguments, with types and descriptions.
- Trick the course shows: give the function to Claude.ai with the prompt "write valid JSON schema spec for tool calling for this function, follow best practices in attached documentation", attach the Anthropic tool-use docs page, copy the result.
- Python-side pattern: name schemas `[function_name]_schema`; import `ToolParam` from `anthropic.types` and wrap the dict in `ToolParam()` to avoid type errors (Python typing detail only).

Illustrative schema shape built from the fields the course names:

```
{
  "name": "get_current_datetime",
  "description": "Returns the current date and time. Use when the user's request depends on the current moment. Returns a string formatted with date_format.",
  "input_schema": {
    "type": "object",
    "properties": {
      "date_format": {"type": "string", "description": "strftime-style format for the result"}
    },
    "required": []
  }
}
```

### 12.5 Handling message blocks
- Send the tool schemas with the user message using the `tools` keyword argument (a list of JSON schema specs).
- Messages now contain multiple BLOCKS rather than only text. An assistant tool response has a text block (user-facing explanation) and a tool use block (function name + arguments).
- You must keep history manually: append the ENTIRE `response.content` (all blocks) to the messages list, not just the text.
- Update `add_user_message` / `add_assistant_message` to support multiple blocks.

### 12.6 Sending tool results
- After executing the requested function, send a follow-up request with the full history.
- Tool result block fields:
  - `tool_use_id` = ID matching the original tool use block (pairs requests with results; needed because Claude can make simultaneous tool calls).
  - `content` = tool output converted to a string (usually JSON).
  - `is_error` = boolean for execution errors (default false).
- Follow-up request must include: complete history (original user message + assistant tool-use message + new user message carrying the tool result), AND the original tool schemas even if not using tools again.
- The tool_result block goes in a USER message, not an assistant message.

```
 messages: [ user: "What is the date in 20 days?"
             assistant: [ text, tool_use{id=T1, name, input} ]
             user:      [ tool_result{tool_use_id=T1, content, is_error=false} ] ]
 + tools (schemas again)  ->  Claude's final answer
```

### 12.7 Multi-turn conversations with tools
- Claude may chain tools to answer one question. Example: "what day is 103 days from today" -> `get_current_datetime` -> `add_duration_to_datetime` -> answer.
- You cannot predict how many tools a query needs, so use a while loop that keeps calling Claude until there are no more tool requests.
- Refactors the course makes: message helpers handle multiple blocks; `chat` accepts a `tools` parameter and returns the entire message (not only the first text block); a `text_from_message` helper extracts all text blocks.

### 12.8 Implementing multiple turns (the loop)
- `stop_reason == "tool_use"` means Claude wants a tool called. Other values exist; tool_use is the one checked.
- `run_conversation` loop:
  1. Call Claude with messages + tools.
  2. Add the assistant response to history.
  3. If stop_reason is not "tool_use", break.
  4. Otherwise call `run_tools`.
  5. Add the tool results as a user message.
  6. Repeat.
- `run_tools`: filter `message.content` for blocks with `type="tool_use"`; for each, run the function via `run_tool`; build a `tool_result` block with `type="tool_result"`, `tool_use_id=original_id`, `content=JSON_encoded_output`, `is_error=boolean`; return the list of all result blocks.
- `run_tool` = dispatcher: takes tool name + input, matches name to function (if statements), scalable.
- Error handling: try/except around execution. Success: `is_error=false`, content = output. Failure: `is_error=true`, content = error message.
- An assistant message can hold multiple blocks (text + several tool_use); each tool_use gets its own tool_result; all results go back in one user message.

Java sketch of the loop (illustrative, not from the course)

```java
// illustrative, not from the course
import java.util.*;

record ToolUse(String id, String name, Map<String, Object> input) {}
record ToolResult(String toolUseId, String content, boolean isError) {}
// My own view of one model reply: stopReason, text, and any tool_use blocks.
record Reply(String stopReason, String text, List<ToolUse> toolUses) {}

interface ToolLlm {
    // appends nothing itself; caller owns history. Tools (schemas) are sent every call.
    Reply chat(List<Object> history, List<String> toolSchemasJson);
}

class ToolLoop {
    private final ToolLlm llm;
    private final Map<String, java.util.function.Function<Map<String, Object>, String>> tools;
    ToolLoop(ToolLlm llm, Map<String, java.util.function.Function<Map<String, Object>, String>> tools) {
        this.llm = llm; this.tools = tools;
    }

    String runConversation(List<Object> history, List<String> schemas) {
        while (true) {
            Reply reply = llm.chat(history, schemas);
            history.add(reply);                                   // ALL blocks, not only text
            if (!"tool_use".equals(reply.stopReason())) return reply.text(); // done
            List<ToolResult> results = runTools(reply.toolUses());
            history.add(results);                                 // one USER message with all results
        }
    }

    List<ToolResult> runTools(List<ToolUse> uses) {
        List<ToolResult> out = new ArrayList<>();
        for (ToolUse u : uses) {
            try {
                String output = tools.get(u.name()).apply(u.input());   // run_tool dispatch
                out.add(new ToolResult(u.id(), output, false));
            } catch (Exception e) {
                out.add(new ToolResult(u.id(), e.getMessage(), true));  // is_error = true
            }
        }
        return out;
    }
}
```

### 12.9 Using multiple tools
- After the framework exists, adding a tool is three steps: (1) add its schema to the tools list in `run_conversation`; (2) add a case in `run_tool` for the new name; (3) implement the function.
- Tools added: `add_duration_to_datetime` (date/time with a duration offset) and `set_reminder` (mock: prints a confirmation).
- Claude can chain them (compute the date, then set the reminder with the result).

### 12.10 The batch tool
- Problem: Claude can technically send several tool_use blocks in one message but rarely does, causing needless sequential rounds.
- Solution: a batch tool whose schema takes an `invocations` list (each with tool name + arguments). Claude calls the batch tool with the array of desired executions.
- `run_batch` iterates invocations, extracts the tool name and JSON-parsed arguments, calls `run_tool` for each, and returns a `batch_output` list.
- Result: one request-response cycle instead of several sequential rounds.

Java sketch (illustrative, not from the course)

```java
// illustrative, not from the course
record Invocation(String name, String argumentsJson) {}

static List<String> runBatch(List<Invocation> invocations) {
    List<String> batchOutput = new ArrayList<>();
    for (Invocation inv : invocations) {
        Map<String, Object> args = MyJson.parseObject(inv.argumentsJson()); // JSON-parsed arguments
        batchOutput.add(runTool(inv.name(), args));                          // reuse the dispatcher
    }
    return batchOutput;
}
```

### 12.11 Tools for structured data
- Alternative to prefill + stop sequences: more reliable, but more complex and needs a JSON schema.
- Process: define a JSON schema for a tool whose inputs ARE the desired data structure; send prompt + schema; Claude calls the tool with arguments matching the schema; read the JSON from the tool use block. No tool result needs to be sent back.
- Critical: force the tool call with `tool_choice = {"type": "tool", "name": "your_tool_name"}`.
- Implementation: update `chat` to accept `tool_choice`, pass it to `create()`, read the data from `response.content[0].input`.
- When to use: prompt-based methods for quick/simple extractions; tools for complex or reliability-critical ones.

### 12.12 Fine-grained tool calling (tool streaming)
- Streaming with tools adds `input_json_delta` events carrying `partial_json` (a chunk) and `snapshot` (cumulative sum).
- Default behavior: the API buffers tool-argument chunks until a complete top-level key-value pair exists, validates against the schema, then sends. Result: delays followed by bursts of chunks.
- Fine-grained mode (`fine_grained: true`): disables API-side JSON validation, sends chunks immediately, traditional streaming feel. Requires client-side handling of invalid JSON (for example "undefined" instead of null).
- In default mode, invalid JSON is wrapped as a string rather than a proper object.
- Use fine-grained for immediate UI updates or early processing of arguments; default is fine when validation delays are acceptable.

### 12.13 The text editor tool
- Built-in tool for file/text operations (read, write, create, replace, undo for files and directories).
- Only the JSON schema is built into Claude; YOU implement the actual file operations (view, string replace, create, etc.).
- You send a minimal schema stub (name + type with a version-specific date); it is auto-expanded to the full schema. The type string differs between model versions (the notes mention 3.5 vs 3.7 having different dates).
- Lets Claude act as a software engineer out of the box; use for replicating AI code editor functionality, file operations where native editors are unavailable, automated generation/refactoring, multi-file manipulation.

### 12.14 The web search tool
- Built-in; no custom code needed, Claude runs the search.
- Schema fields: `type: "web_search_20250305"`, `name: "web_search"`, `max_uses` (limit on total searches, default 5), optional `allowed_domains` (restrict to domains).
- Response contains: text blocks (explanations), tool use blocks (queries executed), web search result blocks (title, URL), citation blocks (specific text supporting statements).
- UI pattern: show text normally, search results as a reference list, citations with domain/title/URL/quoted text.
- Example: restrict to NIH.gov for scientifically backed exercise/medical advice.


---

## 13. Retrieval Augmented Generation (RAG)

### 13.1 What and why
- RAG = querying large documents (100-1000+ pages) with a language model without hitting context limits.
- Option 1 (direct): put the whole document in the prompt. Limits: hard token limits, lower effectiveness with longer prompts, higher cost, slower.
- Option 2 (RAG): (1) break the document into small chunks; (2) for each question find the most relevant chunks and include only those.
- Benefits: model focuses on relevant content, scales to large/multiple documents, smaller prompts, lower cost, faster.
- Downsides: more complexity, preprocessing, a search mechanism needed, no guarantee chunks contain full context, multiple chunking strategies.
- Key challenge: defining relevance and the best chunking for your case; evaluate carefully.

### 13.2 Chunking strategies
- Quality of chunking drives RAG performance. Poor chunking retrieves irrelevant context (example: medical "bug" text returned for a software-engineering question about bugs).
- Three strategies:
  1. Size-based = equal-length strings. Easy; most common in production. Cons: cut-off words, lacks context. Fix: overlap (include characters from neighboring chunks); trade-off is duplicated text but better chunk meaning.
  2. Structure-based = split on headers/paragraphs/sections. Best for structured docs (markdown, HTML) but requires guaranteed formatting. Example: split on markdown `##`.
  3. Semantic-based = NLP groups consecutive sentences by semantic similarity. Most advanced; complex.
- Fallback guidance: by character = most reliable, works with any document; by sentence = good middle ground if sentence detection is reliable; by section = optimal but requires structured input.
- No universal best method.

Java sketch of size-based chunking with overlap (illustrative, not from the course)

```java
// illustrative, not from the course
static List<String> chunkBySize(String text, int size, int overlap) {
    List<String> chunks = new ArrayList<>();
    int step = size - overlap;               // overlap = chars shared with the neighbor
    for (int start = 0; start < text.length(); start += step) {
        chunks.add(text.substring(start, Math.min(text.length(), start + size)));
        if (start + size >= text.length()) break;
    }
    return chunks;
}
```

### 13.3 Text embeddings
- An embedding model takes text and outputs a long list of numbers (range -1 to +1) representing the meaning of the text.
- Each number scores some unknown quality/feature; the actual meaning of each dimension is unknown to users.
- Semantic search uses embeddings to find chunks related to the user's question (meaning, not keyword, matching).
- Anthropic recommends Voyage AI for embeddings: separate account/API key, free to start, easy via SDK.

### 13.4 The full RAG flow (7 steps)

```
 PRE-PROCESSING (once)                         REAL-TIME (per query)
 1 chunk text                                   5 embed the user question (same model)
 2 embed chunks                                 6 similarity search (cosine)
 3 normalize (magnitude 1.0; automatic)         7 assemble prompt: question + top chunks
 4 store in vector database                         -> LLM response
```

- Normalization scales vector magnitude to 1.0 (handled automatically by embedding APIs).
- Cosine similarity = cosine of the angle between vectors, range -1 to 1; closer to 1 = more similar.
- Cosine distance = 1 minus cosine similarity; closer to 0 = more similar.
- A vector database performs similarity calculations to find closest embeddings.

Java sketch (illustrative, not from the course)

```java
// illustrative, not from the course
static double cosineSimilarity(double[] a, double[] b) {
    double dot = 0, na = 0, nb = 0;
    for (int i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
static double cosineDistance(double[] a, double[] b) { return 1.0 - cosineSimilarity(a, b); }
```

### 13.5 Implementing the RAG flow
- Chunk `report.MD` with `chunk_by_section`; `generate_embedding` accepts a string or list of strings.
- Populate a vector index: `zip()` chunks with embeddings and `store.add_vector(embedding, {content: chunk})`. Store the original text with the embedding so retrieval results are meaningful.
- Query: embed "what did software engineering department do last year", then `store.search(user_embedding, 2)` returned two chunks with cosine distances 0.71 (section two) and 0.72 (methodology section).
- The notes flag that this basic flow has limitations needing improvements (next lessons).

### 13.6 BM25 lexical search
- BM25 (Best Match 25) = lexical search algorithm used alongside semantic search.
- Problem: semantic search alone can miss exact term matches.
- Hybrid search = run semantic (embeddings/vector DB) and lexical (BM25) in parallel, then merge.
- Algorithm: (1) tokenize the query into terms (remove punctuation, split on spaces); (2) count each term's frequency across all chunks; (3) weight terms by rarity (common terms like "a" matter less, rare terms matter more); (4) rank chunks by how often they contain the higher-weighted terms.
- Both index types expose similar APIs (`add_document`, `search`) so they are easy to combine.

### 13.7 Multi-index RAG pipeline
- Components: vector index, BM25 index, and a `Retriever` class that forwards queries to both indexes and merges results.
- Reciprocal Rank Fusion (RRF): RRF_score = sum over search methods of 1/(rank + 1), per document; sort by combined score.
- Worked example from the course: vector returns [doc2, doc7, doc6]; BM25 returns [doc6, doc2, doc7]; final ranking is [doc2, doc6, doc7] because doc2 ranks high in both.
- Benefits: better accuracy, standardized API (`search()`, `add_document()`), easy to add indexes, handles cases where one method fails.

Java sketch of RRF, checked against the course example (illustrative, not from the course)

```java
// illustrative, not from the course
static List<String> rrf(List<List<String>> rankings) {
    Map<String, Double> score = new HashMap<>();
    for (List<String> ranking : rankings)
        for (int rank = 0; rank < ranking.size(); rank++)       // rank is 0-based here
            score.merge(ranking.get(rank), 1.0 / (rank + 1), Double::sum);
    return score.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .map(Map.Entry::getKey).toList();
}
// rrf([[d2,d7,d6],[d6,d2,d7]]) -> d2 (1.5), d6 (1.33), d7 (0.83) = [d2, d6, d7]
```

### 13.8 Reranking results
- Post-processing step: an LLM reorders retrieved results by relevance.
- Process: vector + BM25 -> merge -> pass to an LLM with a prompt asking it to rank candidate documents by relevance -> reordered results.
- Efficiency: send document IDs rather than full text. The LLM gets the user query + candidates + an instruction to return the most relevant in decreasing order. Prefill + stop sequence yields structured JSON.
- Trade-offs: higher accuracy (LLM understands nuance such as "ENG team" vs "engineering team") but extra latency from one more LLM call.
- Course example: "What did engineering team do with incident 2023?" correctly put the software engineering section above cybersecurity after reranking.

### 13.9 Contextual retrieval
- Problem: after chunking, each chunk loses context from the original document, lowering retrieval accuracy.
- Solution: a pre-processing step that adds context to each chunk BEFORE inserting it into the retriever databases.
  1. Take a chunk + the original source document.
  2. Send to Claude asking for context that situates the chunk.
  3. Claude produces a brief context describing the chunk's relationship to the whole.
  4. Join generated context + original chunk = "contextualized chunk".
  5. Use the contextualized chunk as input to the vector and BM25 indexes.
- Large documents: use a selective-context strategy - include the first 1-3 chunks (summary/abstract), the chunks immediately before the target chunk, and skip the middle chunks.
- Implementation: an `add_context` function takes chunk + source text, calls the LLM, concatenates context with the chunk.

Rules and traps
- Hybrid search (semantic + BM25 + RRF), then optional reranking, then contextual retrieval are successive improvements on the basic flow.
- Reranking adds latency; contextual retrieval adds pre-processing LLM calls.
- Source gap: no similarity thresholds, chunk size numbers or vector DB names are given.

---

## 14. Features of Claude

### 14.1 Extended thinking
- Lets Claude reason before the final response; the thinking is displayed separately.
- Increases accuracy on complex tasks but costs more (thinking tokens are charged) and adds latency.
- Thinking budget: MINIMUM 1024 tokens. `max_tokens` must exceed the thinking budget (budget 1024 requires max_tokens >= 1025).
- When to use: after prompt optimization fails to reach the accuracy you need; use prompt evals to decide.
- Response: a thinking block (reasoning text + cryptographic signature) and a text block (final answer). The signature prevents tampering with the thinking text.
- Redacted thinking blocks: encrypted thinking flagged by safety systems; returned so the conversation can continue without losing context. The course mentions a test string ("entropic magic string triggered redacted thinking ...") that forces redacted blocks.
- Implementation as the course states it: set thinking=true and a thinking_budget parameter.
- Source gap: the exact JSON shape of the thinking parameter is not given in the notes.

### 14.2 Image support
- Claude can analyze, compare, count and describe images placed in user messages.
- Limits: max 100 images per request; size/dimension restrictions apply; images consume tokens (based on pixel height/width).
- Image block = a special block type inside a user message holding raw base64 data or a URL. Multiple image blocks per message allowed.
- Prompting matters a lot: simple prompts often fail; accuracy depends on prompt sophistication, not only image quality. Techniques: step-by-step instructions, one-shot/multi-shot examples (alternating image and text pairs), clear guidelines with verification steps, structured analysis frameworks.
- Example: fire-risk assessment from satellite imagery (tree density, property access, roof overhang) giving a numeric risk score.
- Implementation fields: block `type: image`, source `base64`, `media_type`, `data`, followed by a text block with the detailed prompt.

Illustrative shape built from those fields:

```
{"role": "user", "content": [
  {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "<base64>"}},
  {"type": "text",  "text": "<detailed step-by-step prompt>"}
]}
```

### 14.3 PDF support
- Claude reads PDFs with code almost identical to images.
- Changes: block type `"document"` instead of `"image"`; media type `"application/pdf"` instead of `"image/png"`; variable naming `file_bytes`.
- Reads text, images, charts, tables and mixed content: a one-stop solution for document analysis.

### 14.4 Citations
- Lets Claude show where information comes from.
- Types: `citation_page_location` (PDFs: document index/title, start page, end page, cited text) and `citation_char_location` (plain text: character position in the text block).
- Enable with `"citations": {"enabled": true}` and give the source a `title`. Works for PDFs and plain text.
- Response content becomes a list of text blocks, some with `citations` arrays holding location data.
- Purpose: transparency; enables UI popups showing source document, pages and exact cited text on hover.

### 14.5 Prompt caching (concept)
- Normally: Claude processes input, generates output, then DISCARDS the processing work. A follow-up with identical input repeats the same work.
- Caching stores the input-processing results temporarily so identical input in later requests reuses them: faster responses and lower cost.

### 14.6 Rules of prompt caching
- Cache duration: 1 hour maximum (as the course notes state it).
- Activation requires manually adding cache breakpoints to blocks.
- Text block formats: shorthand `content = "text"` (cannot carry cache control) versus longhand `content = [{"type": "text", "text": "...", "cache_control": {...}}]` (required for caching).
- Scope: everything up to and including the breakpoint is cached.
- Invalidation: ANY change to content before the breakpoint invalidates the whole cache.
- Processing order: tools -> system prompt -> messages (joined).
- Breakpoints can be placed on tool schemas, system prompts and message blocks (text, image, tool use, tool result).
- Max 4 breakpoints per request; multiple breakpoints create layers, so partial cache hits are possible when only later content changes.
- Minimum 1024 tokens of content to be cached.
- Best for repeated identical content: system prompts, tool definitions, static message prefixes.

```
 order:  [ tools ][ system prompt ][ messages ... ]
                      ^ breakpoint A      ^ breakpoint B (max 4 total)
 change anything BEFORE a breakpoint -> that breakpoint's cache is invalid
 change only AFTER breakpoint A      -> A still hits (partial read)
```

### 14.7 Prompt caching in action
- Modify `chat` so caching is on by default for tools and system prompts.
- Tools: add `cache_control` with type `"ephemeral"` to the LAST tool in the list. Best practice: copy the tools list, clone the last schema, add cache_control, and overwrite in the copy so original schemas are untouched.
- System prompt: wrap it in a text block dictionary with `cache_control` type `"ephemeral"`.
- Both can be set in one request.
- Usage fields: `cache_creation_input_tokens` (written to cache on first use) and `cache_read_input_tokens` (read on later identical requests). Partial reads are possible.
- Changing cached tools or system prompt invalidates the cache and forces a new creation.

Illustrative shape (system prompt with a breakpoint):

```
"system": [
  {"type": "text", "text": "<long system prompt>", "cache_control": {"type": "ephemeral"}}
]
```

Java sketch of "copy the tools list, mark only the last tool" (illustrative, not from the course)

```java
// illustrative, not from the course
static List<Map<String, Object>> withCacheOnLastTool(List<Map<String, Object>> tools) {
    List<Map<String, Object>> copy = new ArrayList<>(tools);              // do not mutate the original
    int last = copy.size() - 1;
    Map<String, Object> clone = new HashMap<>(copy.get(last));            // clone last schema
    clone.put("cache_control", Map.of("type", "ephemeral"));              // breakpoint
    copy.set(last, clone);                                                // overwrite in the copy
    return copy;
}
```

### 14.8 Code execution and the Files API
- Files API: upload a file ahead of time, get a metadata object with an ID, reference the ID in later requests instead of sending raw data each time.
- Code execution: a server-side tool where Claude runs Python in isolated Docker containers. No implementation needed; include the predefined tool schema. Claude can run code several times, interpret results, then respond.
- Constraint: containers have NO network access; data in/out goes through the Files API.
- Combined workflow: upload via Files API -> ID -> include the ID in a container upload block -> ask Claude to analyze -> Claude writes/executes code against the file -> analysis returned. Files created in the container (plots, reports) can be downloaded by the file IDs in the response.
- Response contains code blocks, execution results and the final analysis. Use cases: data analysis, file processing, automated code generation.

- Source gap: the cache TTL value ("1 hour maximum") is quoted exactly as the course notes state it.

---

## 15. Model Context Protocol (MCP)

This one section merges the MCP section of the API course (lessons 60-70, quiz 71) with the standalone MCP course (14 lessons). Both sets of official notes cover the same material.

```
 API course lesson            MCP course lesson
 60 Introducing MCP           02 Introducing MCP
 61 MCP clients               03 MCP clients
 62 Project setup             04 Project setup
 63 Defining tools with MCP   05 Defining tools with MCP
 64 The server inspector      06 The server inspector
 65 Implementing a client     08 Implementing a client
 66 Defining resources        09 Defining resources
 67 Accessing resources       10 Accessing resources
 68 Defining prompts          11 Defining prompts
 69 Prompts in the client     12 Prompts in the client
 70 MCP review                14 MCP review (same title and 4m12 runtime)
 71 Quiz on MCP (6 q)         13 Final assessment on MCP (7 q)
 (none)                       01 Welcome; 07 Course satisfaction survey (3 q)
```

### 15.1 Introducing MCP
- MCP = Model Context Protocol, a communication layer that gives Claude context and tools without developers writing tedious integration code.
- Architecture: an MCP client connects to an MCP server. The MCP server contains tools, resources and prompts as internal components.
- Problem solved (traditional approach): YOU author and maintain a tool schema and a tool function for every service feature. The course's example is GitHub API tools: a GitHub chatbot would need tools for repositories, pull requests, issues and projects, which is significant effort and a maintenance burden for complex services with many features.
- MCP solution: tool definition and execution move from your application server to a dedicated MCP server. The MCP server is the interface to an outside service and wraps its functionality in pre-built, ready-to-use tools. Someone else authors the tools and packages them in the server. Core value: the integration burden shifts from application developers to MCP server maintainers.
- Who authors MCP servers? Anyone, but service providers often publish the official ones (AWS, etc.).
- Versus calling the API directly: MCP saves developer time by supplying tool schemas and functions you would otherwise author yourself.
- Versus tool use: complementary, not identical. MCP does not replace tool use; it decides WHO does the work (MCP server vs developer), and both still involve tools.
- The MCP client is only an intermediary. It does not execute tools; the MCP server does.

```
        YOUR APPLICATION (host)                          OUTSIDE SERVICE
 +-------------------------------------+
 |  Your server                        |
 |   - talks to Claude                 |
 |   - holds the chat / UI             |
 |        |                            |
 |        v                            |           +------------------------------+
 |  +-------------+   messages defined |           | MCP SERVER                   |
 |  | MCP CLIENT  |<--- by MCP spec -->|---------->|  (interface to the service)  |
 |  | (session)   |  stdio/HTTP/WS...  |           |                              |
 |  +-------------+                    |           |  TOOLS      model-controlled |
 +-------------------------------------+           |  RESOURCES  app-controlled   |
                                                   |  PROMPTS    user-controlled  |
                                                   +---------------+--------------+
                                                                   |
                                                                   v
                                                         e.g. GitHub API call
```

### 15.2 MCP clients
- The MCP client is the communication interface between your server and the MCP server, and provides access to the server's tools.
- Transport agnostic: client and server can talk over stdio (stdin/stdout), HTTP, WebSockets, etc. The common setup is both on one machine using standard input/output. The same MCP messages work over different transports; the transport is a deployment choice.
- Communication = a message exchange defined by the MCP spec. Message types the course names for tools: list tools request / list tools result (client asks for available tools, server returns the list) and call tool request / call tool result (client asks the server to run a tool with arguments, server returns the execution result). Resources add read resource request / result (section 15.7).
- Purpose: your server can delegate tool execution to specialized MCP servers while keeping its Claude integration.

```
 User -> Your server -> MCP client --(list tools request)--> MCP server
                          <-(list tools result)--
        Your server --(query + tools)--> Claude
        Claude --(tool_use)--> Your server --> MCP client --(call tool request)--> MCP server
                                                              runs tool (e.g. GitHub API)
        result: MCP server -> MCP client -> your server -> Claude -> final response -> user
```

### 15.3 Project setup
- The learning project is a CLI-based chatbot that implements BOTH an MCP client and an MCP server, purely for education (normally a project implements either a client OR a server).
- Components: a custom MCP client connected to a custom MCP server in the same project; the server exposes 2 tools (read document contents, update document contents); documents are fake and held in memory only, with no persistence, so restarting loses any edits.

CLI steps (as the course shows it)
```
1. Download the CLI_project.zip starter code, extract it, open it in a code editor
2. Follow readme.md; configure .env with your API key
3. Install dependencies (with or without UV)
4. Run the project:
     uv run main.py        (with UV)
     python main.py        (without UV)
5. Verify: a chat prompt appears and answers a basic query,
   e.g. "what's one plus one"
```
- Expected outcome: a working chat interface, ready for MCP feature additions.
- Source gap: the specific dependency-install command and the .env variable name for this project are not in the official notes.

### 15.4 Defining tools with MCP
- The MCP Python SDK (the official package) auto-generates tool JSON schemas from Python function definitions, so you declare a tool with a decorator plus a typed function instead of hand-writing JSON schemas.
- Syntax: `@mcp.tool(name="tool_name", description="description")` (API-course form; the MCP course writes just `@mcp.tool`) + a function with typed parameters + `Field()` with a `description` for each argument. `Field` is imported from `pydantic`; the `mcp` package supplies the server and tool decorators.
- Documents live in an in-memory dictionary named `docs`: `doc_id` keys, content values.
- SDK benefits: auto-generated JSON schema from the function signature and decorator, one-line server creation, no manual schema writing.
- Implementation pattern: decorator -> function definition -> parameter typing -> validation -> core logic.
- Error handling: validate that the document exists before operating; raise `ValueError` if `doc_id` is missing from `docs`.

The two tools (as the course states them)
- `read_doc_contents`: takes `doc_id` (string); returns the document content from `docs`; raises `ValueError` if the doc is not found.
- `edit_document`: takes `doc_id`, `old_string`, `new_string`; performs a find/replace on the document content; includes the existence check.

As the course shows it (structure only, reconstructed from the described pattern)
```python
# Names below are exactly those the course states:
#   @mcp.tool, Field (from pydantic), read_doc_contents, edit_document,
#   doc_id, old_string, new_string, docs (dict), ValueError
@mcp.tool(...)                       # decorator; tool name/description arguments
def read_doc_contents(
    doc_id: str = Field(description="...")   # Field() with description
):
    # validate: raise ValueError if doc_id not in docs
    # return docs[doc_id]
    ...

@mcp.tool(...)
def edit_document(
    doc_id: str = Field(description="..."),
    old_string: str = Field(description="..."),
    new_string: str = Field(description="..."),
):
    # validate: raise ValueError if doc_id not in docs
    # find/replace old_string with new_string in docs[doc_id]
    ...
```
- Source gap: the exact description strings and the one-line server-creation call are not in the official notes, so the body above is a skeleton, not the course's verbatim code.

### 15.5 The server inspector
- MCP Inspector = an in-browser debugger for testing MCP servers without connecting to a real application (no client or Claude needed). Essential for server development and debugging before production deployment.
- Interface: left sidebar with a Connect button; top navigation bar with Resources / Prompts / Tools sections; the Tools section lists the available tools; clicking a tool opens a right panel for manual testing. Direct and templated resources are listed separately and can be tested individually.
- Features: live development testing, simulated/manual tool invocation, parameter input fields, success/failure feedback. You can chain operations (edit, then read) to confirm a change.
- Status: in active development. The UI may change; core functionality stays similar, so do not expect an identical UI to the course video.

CLI steps (as the course shows it)
```
# with the Python environment activated:
mcp dev [server_file.py]
#  -> starts the server on a port, prints a localhost address
# open that localhost address in the browser, then:
#  1. click Connect (left sidebar)
#  2. open the Tools section (top navigation)
#  3. select a tool (e.g. read_doc_contents)
#  4. fill in the required parameters (e.g. the document ID)
#  5. click "Run Tool"
#  6. check the output / success message
```
- Source gap: the port number, the exact URL printed, and the document IDs used in the demo are not in the official notes.

### 15.6 Implementing a client
- The course's MCP client is a wrapper class around a client session. The client session is the actual connection to the MCP server (from the MCP Python SDK) and must be cleaned up when closing. Resource cleanup is handled by the connect / cleanup / async enter / async exit functions.
- Purpose: expose server functionality to the rest of the codebase; it is the interface between application code and the server (tool lists and tool execution). Common practice: wrap the session in a larger class rather than use it directly, for better resource management.

Key functions (as the course shows it)
```python
# list_tools
result = await self.session.list_tools()
return result.tools

# call_tool
return await self.session.call_tool(tool_name, tool_input)
```
(The enclosing function signatures are implied by the names `list_tools()` and `call_tool()`.)

Implementation flow (course wording)
1. The application requests the tool list for Claude.
2. The client calls `list_tools()` to get the server's tools.
3. Claude selects a tool and supplies parameters.
4. The client calls `call_tool()` to execute it on the server.
5. Results go back to Claude.

Testing and integration
- Test by running the client file (`client.py`) directly with a testing harness to verify the connection and the tool listing.
- Then run the CLI and ask Claude something like "what is contents of report.pdf document" to see it use the tool and inspect or edit documents.

Java wrapper idea (illustrative, not from the course): own the connection, expose two operations, close it deterministically with try-with-resources. Not an MCP SDK.

```java
// illustrative, not from the course. Not an MCP SDK; bodies are placeholders.
// Same idea as the course's client wrapper: own the connection, expose
// list/call, guarantee cleanup (Python: async enter/exit; Java: AutoCloseable).
class McpClientWrapper implements AutoCloseable {
    McpClientWrapper connect() { /* open transport + session; details not in the course */ return this; }
    java.util.List<String> listTools() { /* list tools request -> result */ return java.util.List.of(); }
    String callTool(String name, java.util.Map<String, Object> input) { /* call tool request -> result */ return ""; }
    @Override public void close() { /* close session and transport */ }

    static void demo() {
        try (McpClientWrapper client = new McpClientWrapper().connect()) {
            client.listTools();
        } // close() runs here even on failure
    }
}
```

### 15.7 Defining resources
- Resources = an MCP server feature that exposes data to clients for READ operations.
- Two types:
  - Direct / static: a fixed URI, e.g. `docs://documents` (the list of items).
  - Templated: a parameterized URI with wildcards, e.g. `docs://documents/{doc_id}` (fetch one item).
- A URI is the route-like address/identifier for a specific resource, defined when you create it.
- Resource flow: (1) client sends a read resource request with a URI; (2) server matches the URI to a resource function; (3) server executes it; (4) client receives the data in a read resource result.
- Implementation: `@mcp.resource` decorator with the URI and the MIME type (`application/json` for structured data, `text/plain` for text). MIME types are hints to the client about the returned data format, so it can deserialize correctly.
- Templated resources: URI parameters are parsed by the SDK and passed as keyword arguments to the function. The Python MCP SDK auto-serializes return values to strings; the client is responsible for deserializing.
- Common pattern: one resource per distinct read operation (list items vs fetch a single item).
- Resources vs tools: resources provide data proactively (for example fetching document contents when a document is @ mentioned) and are controlled by the application; tools perform actions reactively, when Claude decides to call them.

As the course shows it (names only)
```python
# @mcp.resource(<uri>, <mime type>)   decorator, URI, MIME type (argument syntax not in notes)
# static   : docs://documents          (list of items)
# templated: docs://documents/{doc_id} (doc_id passed as a keyword argument)
```
- Source conflict: the API course's official notes give the templated URI as `docs://documents/{doc_id}`; the MCP course's official notes write it as `documents/{doc_id}` (no `docs://` scheme). Unresolved; the MCP course's other example, `docs://documents`, keeps the scheme, so the shorter form may be shorthand.
- Source gap: the exact `@mcp.resource(...)` argument syntax (the keyword name for the MIME type is not stated) and the full URI strings are only partly given.

### 15.8 Accessing resources
- The client needs a `read_resource` function that takes a URI and requests it from the server: `await self.session.read_resource(AnyUrl(uri))`.
- The result's `contents` list holds the data; take `result.contents[0]` (the first resource), which carries type / `mime_type` metadata and `.text`.
- Parse by MIME type: check `resource.mime_type`. If `"application/json"`, return `json.loads(resource.text)`; otherwise return `resource.text` as plain text.
- Dependencies: the `json` module and the pydantic URI type (for typing the URI).
- Integration: other app components call the client functions. In the CLI the user selects documents with arrow keys + space, and the selected resource contents are automatically included in the LLM prompt. Benefit: Claude reads document contents during chat with no tool call.

As the course shows it
```python
# read_resource
result = await self.session.read_resource(AnyUrl(uri))
resource = result.contents[0]
if resource.mime_type == "application/json":
    return json.loads(resource.text)
return resource.text
# imports: json, and AnyUrl from pydantic
```
- Source conflict: the pydantic URI type is spelled `AnyUrl` in the MCP course's official notes and `AnyURL` in the API course's. Unresolved here; the course shows it only as imported from pydantic.

Illustrative HTTP version of a read-resource style request (illustrative, not from the course). The course's example uses stdin/stdout and does not state the JSON-RPC method names or endpoint, so those are placeholders to fill from the MCP spec.

```java
// illustrative, not from the course. Placeholders in <angle brackets>.
import java.net.URI;
import java.net.http.*;

class ReadResourceSketch {
    public static void main(String[] args) throws Exception {
        String body = """
            {"jsonrpc":"2.0","id":1,
             "method":"<read-resource method name from the MCP spec>",
             "params":{"uri":"docs://documents"}}
            """;
        HttpRequest request = HttpRequest.newBuilder(URI.create("<mcp server http endpoint>"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        // The reply carries contents with a MIME type and text; branch on the MIME type.
        System.out.println(HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString()).body());
    }
}
```

### 15.9 Defining prompts
- MCP prompts = pre-written, tested prompt templates that MCP servers expose to clients for specialized tasks. Instead of users writing ad-hoc prompts, server authors create high-quality, evaluated prompts tailored to the server's domain. Purpose: encapsulate prompt-engineering domain expertise inside specialized MCP servers.
- Implementation pattern: a prompt decorator with a name and description; the function receives arguments (for example a document ID) and returns a LIST of messages (user/assistant format) that go straight to Claude. The message objects contain the prompt text with the arguments interpolated.
- Example: a document-formatting prompt (`/format`) that takes a document ID, tells Claude to read the document with the server's tools, reformat it as markdown and save the changes.
- Benefits: server-specific expertise, pre-tested quality, reuse across client apps, better results than user-written prompts.
- Client side: prompts appear as autocomplete options (slash commands such as `/format`) that ask for the required parameters, then run the pre-built workflow.
- Workflow: user types `/format` -> selects a document -> server returns the specialized prompt -> client sends it to Claude -> Claude uses tools to read, reformat and save the document.

As the course shows it (MCP course form)
```python
@prompt(name="format", description="rewrites document in markdown")
def format_document(doc_id: str) -> list[messages]:
    return [base.user_message(prompt_text)]
```
(`prompt_text` is the prompt string with `doc_id` interpolated in.)
- Source conflict: the MCP course's official notes write the decorator as `@prompt(...)` and the message helper as `base.user_message(prompt_text)`; the API course's official notes write `@mcpserver.prompt` and `base.UserMessage` objects. Tools and resources are written `@mcp.tool` and `@mcp.resource` in both. Unresolved; neither note set explains the difference or shows the import.
- Source gap: the full text of the `/format` prompt (`prompt_text`) and where `base` is imported from are not in the official notes.

Illustrative Java version of "parameterized, tested template that returns messages" (illustrative, not from the course):

```java
// illustrative, not from the course. Uses the Message record from section 4.
import java.util.List;

class FormatPrompt {
    // Mirrors the course's format prompt: document ID in, messages out.
    static List<Message> formatDocument(String docId) {
        String promptText = "Rewrite the document with id " + docId
                + " in markdown. Use the available tools to read it and save the result.";
        // Returned messages become the conversation input to the model.
        return List.of(new Message("user", promptText));
    }
}
```

### 15.10 Prompts in the client
- Two client functions:
  - list prompts: `await self.session.list_prompts()`, returning the prompts list
  - get prompt: `await self.session.get_prompt(prompt_name, arguments)`, returning `result.messages`
- Prompt workflow: the client requests a prompt by name -> passes arguments as keyword parameters -> the MCP server interpolates the arguments into the prompt template -> returns formatted messages for the AI model.
- Arguments flow: client call (name + arguments dictionary) -> prompt function keyword arguments -> interpolated into the prompt text (e.g. the document ID goes into the template) -> messages array fed directly to the LLM. The arguments must match the prompt function's keyword parameters.
- CLI usage: `/format` -> select a document -> prompt with the document ID goes to Claude -> Claude uses tools to fetch the document -> returns the formatted result.
- Concept: prompts are server-defined templates that clients invoke with parameters, giving reusable AI instructions with dynamic content.

As the course shows it
```python
# list prompts
result = await self.session.list_prompts()
return result.props          # MCP course notes; the API course notes write result.prompts

# get prompt
result = await self.session.get_prompt(prompt_name, arguments)
return result.messages
```
- Checked against the primary sources: the MCP course's official notes (lesson 12) themselves say `result.props` for `list_prompts()`, so the earlier study note copied them faithfully (the "possible slip" is in the official text, not in the copy). The API course's official notes for the same lesson (69) say `result.prompts`.
- Source conflict: `result.props` (MCP course) versus `result.prompts` (API course). Not resolved from the sources. `result.prompts` matches the naming of the sibling returns (`result.tools`, `result.messages`), which makes it the more likely correct attribute, but that is an inference; check the SDK before relying on either.

### 15.11 MCP review: the three primitives (API lesson 70 / MCP lesson 14)
- A server offers three primitives. The control pattern decides the purpose:

```
 PRIMITIVE   CONTROLLED BY        SERVES   USE IT WHEN               COURSE EXAMPLE
 ---------   ------------------   ------   -----------------------   ------------------------------------
 tools       the model (Claude    model    you need Claude           JavaScript execution for calculations;
             decides when to               capabilities              read_doc_contents / edit_document
             run them)
 resources   the app (your code   app      you need app data         Google Drive doc listing and document
             decides when to               (UI display or prompt     selection; autocomplete options;
             fetch)                        augmentation)             contents injected into the prompt
 prompts     the user (button     user     you need predefined       chat starter buttons in the Claude
             click or slash                user workflows            interface; /format
             command)
```
- Tools add capabilities to Claude; resources get data into the app; prompts give users predefined workflows.

Rules and traps
- Templated URI parameter names must match the function's keyword argument names (the course says URI parameters become keyword arguments).
- Something the user explicitly triggers (a button or slash command) is a prompt, not a tool; data the app can fetch itself is a resource, not a tool.
- Source gap: this course's tools, resources and prompts are shown only through the MCP Python SDK; no Java MCP SDK is covered, and no wire-level (JSON-RPC) message shapes are given anywhere.
- Source gap: MCP lessons 01 (welcome) and 07 (survey) carry no technical content; the MCP quiz and final-assessment questions are covered by the gap in section 18.

---

## 16. Anthropic Apps: Claude Code and Computer Use

### 16.1 Overview
- Two deployed Anthropic applications: Claude Code and Computer Use. Both demonstrate agent architecture.
- Claude Code = terminal-based coding assistant. Computer Use = toolset expanding Claude beyond text generation.

### 16.2 Claude Code setup
- Capabilities: search/read/edit files, plus advanced tools (web fetching, terminal access), plus MCP client support for extending via MCP servers.
- Setup: install Node.js (check with `npm help`), run `npm install` to install Claude Code, run `claude` to log in to your Anthropic account. Full guide at docs.anthropic.com.

### 16.3 Claude Code in action
- Acts as a collaborative engineer: project setup, feature design, code, testing, deployment, fixing production errors.
- Workflow: download the project, run `claude`, ask it to read the README and run setup steps; the `init` command scans the codebase for architecture and style and writes `claude.md`, which is auto-included as context.
- Memory types: Project (shared), Local, User. Use `#` to add a note to memory; edit claude.md manually or rerun init. Claude can do Git operations (staging, committing).
- Prompting method 1 (three-step): identify relevant files and ask for analysis; describe the feature and ask for a PLAN (no code); then ask it to implement.
- Prompting method 2 (test-driven): give context; ask for suggested tests; pick and implement tests; ask Claude to write code until tests pass.
- Principle: effort multiplier; more detailed instructions give much better results.

### 16.4 Enhancements with MCP servers
- Claude Code embeds an MCP client. Connect servers with `claude mcp add [server-name] [startup-command]`.
- MCP servers add new functions to Claude Code in real time, without modifying Claude Code itself.
- Example: a document-processing server exposing a "Document Path to Markdown" tool (started with `uv run main.py`) lets Claude Code read PDF/Word documents.
- Use cases: production monitoring (Sentry), project management (Jira), communication (Slack), custom workflow tools.
- Setup: create an MCP server with tools, add it with name + startup command, restart Claude Code.

### 16.5 Parallelizing Claude Code
- Problem: several Claude instances editing the same files conflict.
- Solution: Git work trees: full project copies in separate directories, each tied to a branch. Workflow: create work tree -> assign task to an instance -> isolated work -> commit -> merge to main.
- Custom commands: `.claude/commands/filename.md` with an `$ARGUMENTS` placeholder automate work-tree creation. Claude resolves merge conflicts and cleans up work trees. Scales with the developer's capacity to manage tasks.

### 16.6 Automated debugging
- Daily GitHub Action checks production: fetch CloudWatch logs from the last 24 hours (AWS CLI) -> Claude identifies and deduplicates errors -> analyzes each and generates fixes -> opens a pull request.
- Catches production-only errors (example: configuration differences such as invalid model IDs or API keys that work locally but fail in production). Output is a reviewable PR.

### 16.7 Computer Use
- Claude interacts with computer interfaces visually and via controls: takes screenshots, clicks, types, navigates, follows multi-step instructions, performs QA testing and automation.
- Runs in an isolated Docker container; user instructs via a chat interface; Claude reports pass/fail with findings. A reference implementation is available for local testing.
- How it works: it is the same tool-use flow. A small special tool schema is sent (it expands behind the scenes to include an action function with arguments such as mouse move, left click, screenshot). Claude sends a tool use request (ID, name, input); the DEVELOPER fulfils it in a computing environment (typically Docker) with programmatic key presses/mouse moves; the result goes back as a tool result.
- Claude does not directly manipulate computers: computer use = tool system + developer-provided environment. Anthropic provides a reference Docker container.
- Setup needs Docker plus a simple command to run the reference container, which gives a chat interface for testing computer use. The tool system handles communication with Claude; the Docker container handles the actual computer interactions.

- Source gap: lessons 72-75 are video-only; the section above is from the official notes. The notes titled "Parallelizing Claude Code", "Automated Debugging", "Computer Use" and "How Computer Use Works" have no matching numbered lesson page in the crawl, so their lesson numbers are unknown.

---

## 17. Agents and Workflows

### 17.1 Workflows versus agents (decision rule)
- Both are strategies for tasks Claude cannot complete in a single request.
- Use a WORKFLOW when you understand the task precisely and know the exact step sequence. Use an AGENT when task details are unclear.
- Workflow = a series of calls to Claude for a specific problem with predetermined steps.
- Workflow patterns are implementation patterns other engineers have used; knowing the pattern does not implement it for you.

### 17.2 Evaluator-optimizer (the introductory example)
- Image-to-3D-model converter: (1) Claude describes the uploaded image; (2) Claude models the object with the CADQuery Python library from the description; (3) render the model; (4) Claude compares the render to the original; (5) if inaccurate, repeat from step 2 with feedback.
- Roles: producer (generates output; Claude + CADQuery), evaluator (assesses quality; the comparison step). Loop until the evaluator accepts.

Java sketch of the loop (illustrative, not from the course)

```java
// illustrative, not from the course
interface Producer  { String produce(String task, String feedbackOrNull); }
record Verdict(boolean accepted, String feedback) {}
interface Evaluator { Verdict evaluate(String task, String output); }

static String evaluatorOptimizer(Producer p, Evaluator e, String task, int maxRounds) {
    String feedback = null, output = null;
    for (int i = 0; i < maxRounds; i++) {            // bound the loop; the course does not specify a limit
        output = p.produce(task, feedback);
        Verdict v = e.evaluate(task, output);
        if (v.accepted()) return output;             // evaluator accepts -> stop
        feedback = v.feedback();                     // otherwise repeat with feedback
    }
    return output;
}
```

### 17.3 Parallelization workflows
- Break one complex task into several simultaneous subtasks, then aggregate.
- Example (material selection): instead of one big prompt weighing metal/polymer/ceramic/composite against all criteria, send separate parallel requests, each judging one material, then a final aggregation step compares.
- Structure: input -> parallel subtasks -> aggregator -> final output.
- Benefits: focus, modularity (improve/evaluate prompts separately), scalability (add a subtask without touching others), quality.

```
            +--> [judge: metal]     --+
 input ---->+--> [judge: polymer]   --+--> [aggregator] --> output
            +--> [judge: ceramic]   --+
            +--> [judge: composite] --+
```

Java sketch (illustrative, not from the course)

```java
// illustrative, not from the course
import java.util.concurrent.*;
List<String> materials = List.of("metal", "polymer", "ceramic", "composite");
List<CompletableFuture<String>> futures = materials.stream()
    .map(m -> CompletableFuture.supplyAsync(() -> llmJudge(m, requirements)))
    .toList();
List<String> assessments = futures.stream().map(CompletableFuture::join).toList();
String decision = llmAggregate(assessments);   // final comparison step
```

### 17.4 Chaining workflows
- Break a large task into sequential, distinct steps (separate calls) instead of one complex prompt.
- Example: topic -> search trending topics -> Claude picks the most interesting -> research -> write script -> generate video -> post to social media.
- Primary use: when Claude keeps ignoring constraints in a long prompt even with repetition (for example "don't mention AI, no emojis, professional tone").
- Fix: step 1 send the initial prompt and accept imperfect output; step 2 send a follow-up asking Claude to rewrite based on the specific violations found.

### 17.5 Routing workflows
- A first call categorizes the user input into predefined genres/categories; the system then routes to a specialized pipeline with customized prompts/tools.
- Example: topic "Python functions" -> category "educational" -> educational prompt template -> script with educational tone/structure. Entertainment topics get trendy language and engaging hooks.
- Structure: one routing step -> multiple specialized pipelines.

Java sketch (illustrative, not from the course)

```java
// illustrative, not from the course
String category = llmClassify(topic);   // e.g. "educational" | "entertainment"
String template = switch (category) {
    case "educational"   -> EDUCATIONAL_TEMPLATE;
    case "entertainment" -> ENTERTAINMENT_TEMPLATE;
    default              -> GENERIC_TEMPLATE;   // always have a fallback route
};
String script = llmGenerate(template, topic);
```

### 17.6 Agents and tools
- Agents plan dynamically with the tools you give them; best when exact steps are unknown. Workflows are better when precise steps are known.
- Advantage: flexibility; the same toolset solves many tasks, and tools can be combined unexpectedly.
- Design principle: provide generic/abstract tools rather than hyper-specialized ones. Claude Code uses abstract `bash`, `web_fetch`, `file_write` rather than specialized `refactor_tool` or `install_dependencies`.
- Example: `get_current_datetime` + `add_duration` + `set_reminder` can cover many time-related tasks by different combinations.
- Agents can ask for more information when needed and work best with a small set of flexible tools.

### 17.7 Environment inspection
- Agents must evaluate their environment and the results of their actions: feedback beyond the basic tool return.
- Computer use: a screenshot after every action (typing, clicking), because Claude cannot predict exactly what a click will do.
- Code editing: read the current file contents before modifying.
- Social-media-video agent examples: Whisper CPP via bash for timestamped captions (verify dialogue placement); FFmpeg to extract screenshots at intervals (inspect visual results); validate the video before posting.
- Benefit: gauge progress, detect errors, adapt to unexpected results.

### 17.8 Workflows vs agents (comparison)

```
 Aspect            | Workflow                           | Agent
 ------------------+------------------------------------+------------------------------------
 Task division     | big task -> small specific subtasks| creative handling of varied challenges
 Testing/eval      | easier (known sequence)            | harder (unpredictable path)
 User experience   | needs specific inputs              | builds own inputs, can ask for more
 Success rate      | higher completion                  | lower completion
```
- Recommendation: prioritize workflows for reliability; use agents only when flexibility is truly required. Users want 100% working products over fancy agents. Core principle: solve problems reliably first, innovate second.


## 18. Course Structure, Exercises and Quizzes

Only titles and question counts survive in the crawl. The "what it tests" column is inferred from the surrounding lessons, not from the exercises.

| Block (API-course lesson pages) | Exercise or quiz (lesson, size) | What it tests (inferred) |
|---|---|---|
| Models, API access, requests, history, system prompts, temperature, streaming, structured data (2-14) | Chat exercise (lesson 7, about 3m54 video) | Building the chat loop: keep a message list, append user and assistant turns, send the full history each time |
| | System prompts exercise (9) | Applying a role/behavior system prompt (tutor style) via the `system` argument |
| | Course satisfaction survey (11, 3 questions) | Survey, not a knowledge test |
| | Structured data exercise (14) | Prefill (opening fence) + stop sequence (closing fence) to get raw JSON/code |
| | Quiz on accessing Claude with the API (15, 8 questions) | Models, API flow, requests, history, system prompts, temperature, streaming, structured output |
| Prompt evaluation (16-22) | Exercise on prompt evals (22) | Building or extending the eval pipeline: dataset, run_prompt/test_case/eval, code and model grading |
| | Quiz on prompt evaluation (23, 6 questions) | The eval workflow and graders |
| Prompt engineering techniques (24-29) | Exercise on prompting (29) | Applying clear/direct, specific, XML tags and examples and re-scoring with evals |
| | Quiz on prompt engineering techniques (30, 5 questions) | The four techniques |
| Tool use with Claude (31-42) | Quiz on tool use with Claude (43, 7 questions) | Schemas, blocks, results, loops, built-in tools |
| RAG and features of Claude (44-58) | Quiz on features of Claude (59, 7 questions) | Thinking, vision/PDF, citations, caching, code execution |
| Model Context Protocol (60-70) | Quiz on MCP (71, 6 questions) | Clients, tools, resources, prompts, primitives |
| Anthropic apps, agents and workflows (72-82) | Quiz on agents and workflows (83, 7 questions) | Workflows vs agents |
| Course-level (API course) | Final assessment (84, 23 questions) | The whole course |
| MCP course only | Course satisfaction survey - MCP (lesson 07, 3 questions) | Survey, not a knowledge test |
| | Final assessment on MCP (lesson 13, 7 questions) | Expected to cover the MCP material above (inference) |

- The only practice the MCP sources document is the hands-on project itself: build the document tools, test them in the Inspector, build the client's `list_tools` / `call_tool`, then resources, then prompts.
- Source gap: no question text, answer choices or answer keys for any quiz, exercise or final assessment in either course were captured (each page shows only a title and a question count).
- Source gap: API lessons 01 (welcome), 07, 09, 14, 22, 29 (exercise videos), 70 (MCP review) and 85 (wrap-up) have no written content in the notes or in the lesson pages (only video-player noise). Lesson 70's content is covered by MCP course lesson 14, which has an official note block; the MCP course's own lessons 01, 07 and 13 have none.

---

## 19. Common Mistakes

| Mistake | Fix |
|---|---|
| Calling the Anthropic API directly from a browser/mobile client | Client calls your server; the server holds the API key and calls the API |
| Committing the API key or `.env` to version control | Keep ANTHROPIC_API_KEY in an ignored `.env` / environment variable |
| Losing the one-time API key display | Copy it immediately; if lost, delete the key and create a new one |
| Treating `max_tokens` as the desired answer length | It is a safety limit on generation, not a target |
| Expecting the API to remember earlier turns | Store the list yourself and send the whole history with every request |
| Forgetting to append the assistant reply to history | Append every assistant message (all blocks when using tools) before the next user turn |
| Passing a None/empty system prompt through | Omit the `system` key entirely when there is no prompt |
| Using high temperature for extraction or facts | Use temperature near 0 for factual/extraction tasks; near 1 for creative work |
| Assuming high temperature guarantees different output | It only raises the probability of variation |
| Showing only a spinner for 10-30 second responses | Stream: forward `content_block_delta` text, store the final assembled message |
| Prefill ending in a complete thought and forgetting to stitch | Claude continues from the exact end; concatenate prefill + continuation yourself |
| Getting chatty/markdown-wrapped JSON | Prefill the opening fence, set the closing fence as stop sequence |
| Shipping a prompt after one or two manual tests | Run an eval pipeline: dataset + prompt + LLM + grader; compare versions |
| Hardcoded scores (score=10) in the eval | Implement real graders (code, model, or human) |
| Model grader asked for only a score | Ask for strengths, weaknesses and reasoning plus the score to avoid middling defaults |
| Code grading without knowing the expected output format | Include a `format` key in each test case so the right validator runs |
| Vague first line in a prompt | Start with an action verb and a clear task statement plus output specs |
| Dumping interpolated content into a prompt untagged | Wrap in descriptive XML tags such as `<sales_records>` |
| Examples without explanation | Add why the example output is ideal; place examples after the instructions |
| Appending only the text block of a tool response to history | Append the full `response.content` (all blocks) |
| Sending a tool_result in an assistant message | tool_result blocks go in a USER message with the matching `tool_use_id` |
| Omitting tool schemas from the follow-up request | Include the original schemas even if no more tools are needed |
| Throwing generic errors from tool functions | Validate inputs and raise descriptive errors; return `is_error=true` so Claude can retry |
| Claude making sequential tool calls it could do in parallel | Offer a batch tool that takes an `invocations` list |
| Relying on prefill/stop for high-reliability JSON | Use a tool with a JSON schema and force it with `tool_choice` `{"type": "tool", "name": ...}` |
| Fine-grained tool streaming with no JSON error handling | Handle invalid JSON client-side, or stay with default validated mode |
| Putting the whole 1000-page document in the prompt | Use RAG: chunk, embed, retrieve relevant chunks only |
| Searching only semantically | Combine semantic with BM25 (hybrid) and merge with Reciprocal Rank Fusion |
| Storing embeddings without the original text | Store chunk text as metadata alongside each vector |
| Chunks lacking surrounding context | Contextual retrieval: LLM-generated context prepended to each chunk |
| Skipping prompt optimization and jumping to extended thinking | Optimize prompt first; use evals to decide whether thinking is needed |
| `max_tokens` not larger than the thinking budget | Ensure max_tokens > thinking budget (budget minimum 1024) |
| Cache breakpoints on shorthand string content | Use longhand content blocks with `cache_control` |
| Editing tools or system prompt and expecting cache hits | Any change before a breakpoint invalidates it; keep cached prefixes stable |
| Expecting code execution to reach the internet | Containers have no network access; use the Files API for data in/out |
| Hand-writing tool schemas and functions for every service integration | Use an MCP server that provides the tools |
| Treating MCP as a replacement for tool use | They are complementary; MCP decides who authors the tool schemas and functions (the MCP server author, often the service provider) |
| Thinking the MCP client runs the tool | The client only relays list tools and call tool requests; the MCP server executes the tool |
| Hand-writing JSON schemas in the Python SDK | Use the tool decorator with typed parameters and `Field(description=...)`; the SDK generates the schema |
| Operating on a `doc_id` that may not exist | Validate existence first, then operate; raise `ValueError` with a clear message |
| Using the raw client session directly and skipping cleanup | Wrap it in a client class with connect/cleanup and async enter/exit |
| Using the Inspector without activating the Python environment, or expecting the video's exact UI | Activate the environment, run `mcp dev [server_file.py]`; the UI may change but core functions stay |
| Reading `result.contents` as the data | Take `result.contents[0]`, then use `.text` / `.mime_type` |
| Ignoring the MIME type on a resource read (payloads arrive as strings) | If `application/json`, `json.loads(resource.text)`; otherwise return `resource.text` |
| Using a tool to let Claude read documents the app can supply | Use a resource and inject the contents into the prompt; no tool call needed |
| Returning a bare string from a prompt function | Return a list of messages, e.g. `[base.user_message(prompt_text)]` |
| Calling `get_prompt` with only the name | Pass the name AND the arguments, matching the prompt function's keyword parameters; use `result.messages` as model input |
| Choosing tools / resources / prompts without considering the controller | Model-controlled -> tools; app-controlled -> resources; user-controlled (button, slash command) -> prompts |
| Several Claude Code instances editing the same files | Use Git work trees, one per instance/branch |
| Using an agent where steps are known | Use a workflow; agents are harder to test and complete tasks less often |
| One giant prompt with many "don't" constraints | Chain: generate, then rewrite based on specific violations |

---

## 20. Key Terms

| Term | Meaning |
|---|---|
| Opus / Sonnet / Haiku | Model families: highest intelligence / balanced / fastest and cheapest (no reasoning like Opus/Sonnet) |
| Token | Text chunk: word, word part, symbol or space |
| Embedding | Numeric representation of meaning (list of numbers, range -1 to +1 in the embedding-model lesson) |
| Contextualization | Refining token meaning using neighboring tokens |
| max_tokens | Required safety limit on generation length |
| stop_reason | Why generation stopped (for example "tool_use" when Claude wants a tool) |
| end_of_sequence | Special token that ends generation |
| messages | Required list of role/content exchanges sent every request |
| system prompt | `system` string that sets role/behavior (how, not what) |
| temperature | 0-1 randomness control for token selection |
| streaming events | message_start, content_block_start, content_block_delta, content_block_stop, message_stop |
| text_stream / get_final_message | Python helpers: text only / assembled final message |
| prefill | Assistant message added at the end to steer the response; Claude continues from its exact end |
| stop sequence | String that halts generation when produced; not included in output |
| prompt engineering | Writing/editing prompts for reliable, high-quality output |
| prompt evaluation | Automated objective testing of prompts |
| eval dataset / test case | Collection of inputs / one record (JSON object) |
| run_prompt / run_test_case / run_eval | Merge-and-call / grade one case / loop over dataset |
| code grader / model grader / human grader | Programmatic check / extra LLM call scoring output / person scoring |
| prompt_input_spec / extra_criteria | Evaluator inputs: required prompt inputs / additional grading criteria |
| XML tags (in prompts) | Descriptive tags delimiting content sections |
| one-shot / multi-shot | One example / several examples in a prompt |
| tool use | Mechanism for Claude to request external information/actions |
| tool schema | `name`, `description`, `input_schema` (JSON Schema) describing a tool |
| tool use block | Assistant block with a tool name + input, requested by Claude |
| tool_result block | User-message block: `tool_use_id`, `content`, `is_error` |
| tool_use_id | ID pairing a tool_result to its tool use block |
| tool_choice | Parameter to force a tool: `{"type": "tool", "name": ...}` |
| batch tool | Custom tool with an `invocations` list to run several tools in one turn |
| input_json_delta | Streaming event for tool arguments (`partial_json`, `snapshot`) |
| fine-grained tool calling | `fine_grained: true`; streams tool args immediately without API-side JSON validation |
| text editor tool | Built-in schema for file operations; you implement the file I/O |
| web search tool | Built-in search tool (`web_search_20250305`; fields in 12.14) |
| RAG | Retrieve relevant chunks and add them to the prompt instead of the whole document |
| chunking (size / structure / semantic) | Equal-length / by headers-sections / by meaning |
| overlap | Characters shared between neighboring chunks to preserve context |
| semantic search | Embedding-based similarity search |
| cosine similarity / distance | Angle-based similarity (-1 to 1) / 1 minus that |
| normalization | Scaling embedding magnitude to 1.0 |
| vector database | Store optimized for embedding similarity search |
| BM25 | Lexical search weighting rare terms higher |
| hybrid search | Semantic + lexical run together and merged |
| Reciprocal Rank Fusion (RRF) | Merges rankings from several search methods (formula in 13.7) |
| reranking | LLM reorders retrieved results (more accurate, more latency) |
| contextual retrieval | LLM-generated context joined to each chunk before indexing |
| extended thinking | Reasoning phase before the answer (budget rules in 14.1) |
| thinking / redacted thinking block | Reasoning text + signature / encrypted flagged reasoning |
| image block / document block | Image (base64 or URL) / PDF input in a user message |
| citation_page_location / citation_char_location | Citation types for PDFs / plain text |
| prompt caching | Reuse input-processing work across identical prefixes |
| cache_control (ephemeral) | Marker for a cache breakpoint on a block |
| cache_creation_input_tokens / cache_read_input_tokens | Usage fields: written to cache / read from cache |
| Files API | Upload once, reference by file ID |
| code execution tool | Server-side Python in network-isolated Docker containers |
| MCP | Model Context Protocol: a communication layer giving Claude context and tools without developers writing tedious integration code |
| MCP client | Communication interface between your server and the MCP server; provides access to the server's tools; relays requests, does not execute tools |
| MCP server | Interface to an outside service; wraps its functionality in pre-built tools; contains tools, resources and prompts |
| Transport agnostic | The same MCP messages work over stdio, HTTP, WebSockets, etc. |
| list tools / call tool / read resource | MCP request/result pairs for discovering tools, running a tool with arguments, and reading a resource by URI |
| Tool / resource / prompt (primitives) | Model-controlled (adds capabilities to Claude) / app-controlled (gets data into the app) / user-controlled (predefined workflow via button or slash command) |
| MCP resource (direct / templated) | Read-only data by URI: static (`docs://documents`) / parameterized (`{doc_id}`, passed as a function keyword argument) |
| MIME type | Hint on a resource telling the client the data format (`application/json`, `text/plain`) so it deserializes properly |
| MCP prompt | Server-defined, tested prompt template taking arguments and returning a list of messages |
| `@mcp.tool` / `@mcp.resource` | Python SDK decorators declaring a tool (JSON schema auto-generated) / a resource (URI + MIME type) |
| Prompt decorator | Written `@prompt` in the MCP course notes and `@mcpserver.prompt` in the API course notes (see Source conflict in 15.9) |
| `Field` | Imported from `pydantic`; carries a parameter `description` for a tool argument |
| MCP Inspector | In-browser debugger started with `mcp dev [server_file.py]`; tests tools manually without a real app |
| Client session | The SDK's actual connection to the MCP server; needs cleanup on close, so it is wrapped in a client class |
| claude.md | Project context file made by `init`, auto-included in requests |
| Git work tree | Separate project copy tied to a branch, for parallel Claude instances |
| Computer Use | Tool-based screen control run through a developer-provided Docker environment |
| workflow | Predefined series of Claude calls for known steps |
| agent | Claude plans with provided tools when steps are unknown |
| evaluator-optimizer | Producer generates, evaluator judges, loop until accepted |
| parallelization / chaining / routing | Concurrent subtasks + aggregator / sequential steps / classify then route |
| environment inspection | Agent checks results of its actions (screenshots, file reads) |

---

## 21. Exam-Style Self-Test (answers follow each question)

1. Q: Why must the client not call the Anthropic API directly?
   A: To keep the API key secret; the client calls your server, which calls the API.

2. Q: Which three arguments are required in `messages.create()`?
   A: `model`, `max_tokens`, `messages`.

3. Q: How does a multi-turn chat keep context if the API stores nothing?
   A: Your code keeps the message list and sends the entire history with every request, appending each assistant reply.

4. Q: What does a system prompt control?
   A: How Claude responds (role, tone, approach), not what it responds. Omit the `system` key if there is no prompt.

5. Q: What does temperature 0 do, and what range does temperature use?
   A: Range 0-1; temperature 0 is deterministic, always picking the highest-probability token.

6. Q: Which streaming event carries the text?
   A: `content_block_delta`. (message_start, content_block_start and *_stop carry no text.)

7. Q: How do you get raw JSON with no commentary using prefill?
   A: User asks for JSON, assistant prefill is the opening fence (```json), and the closing fence (```) is the stop sequence.

8. Q: What are the three paths after writing a prompt, and which is recommended?
   A: Test once and deploy; test a few custom inputs and tweak; run an eval pipeline. The third.

9. Q: Name the six steps of a typical eval workflow.
    A: Draft the prompt; create the dataset; generate prompt variations; get LLM responses; grade (and average); iterate and compare.

10. Q: Which three grader types does the course name, and which is most flexible but tedious?
    A: Code, model, human. Human graders.

11. Q: How does the course compute the combined score when grading generated code/JSON/regex?
    A: (model_score + syntax_score) / 2, with the syntax validators returning 10 for valid, 0 for invalid.

12. Q: What two guideline types does "being specific" describe?
    A: Type A attributes (qualities of the output, nearly always) and Type B steps (how to reason, for complex problems).

13. Q: What two things must a follow-up request to Claude include after executing a tool?
    A: The complete history (including the tool_use message and the user message with the tool_result) and the original tool schemas.

14. Q: Where does the tool_result block go, and how is it matched?
    A: In a USER message; `tool_use_id` matches the original tool use block's ID.

15. Q: What condition ends the tool loop?
    A: `stop_reason` is not "tool_use" (Claude has produced its final response).

16. Q: How do you force Claude to return structured data through a tool?
    A: Define a schema tool matching the data shape and set `tool_choice` to `{"type": "tool", "name": "<tool name>"}`; read `response.content[0].input`.

17. Q: What does fine-grained tool calling change?
    A: It disables API-side JSON validation so argument chunks stream immediately; you must handle invalid JSON yourself.

18. Q: Compute RRF for vector [doc2, doc7, doc6] and BM25 [doc6, doc2, doc7]. Final order?
    A: With score 1/(rank+1) and 0-based rank: doc2 1.5, doc6 about 1.33, doc7 about 0.83, so [doc2, doc6, doc7].

19. Q: What two limits govern extended thinking budgets?
    A: Minimum thinking budget is 1024 tokens, and max_tokens must exceed the thinking budget.

20. Q: What are the prompt caching limits and the processing order?
    A: Minimum 1024 tokens, maximum 4 breakpoints, order tools -> system -> messages; any change before a breakpoint invalidates the cache.

21. Q: What problem does MCP solve compared with the traditional approach, and how does it relate to tool use?
    A: Traditionally the developer authors and maintains tool schemas and functions for each service integration (e.g. GitHub API tools). MCP moves tool definition and execution to a dedicated MCP server. It is complementary to tool use, not identical: it decides WHO does the work (server vs developer).

22. Q: Does the MCP client execute tools, and which two message types does it use for tools?
    A: No. It is an intermediary that sends requests to the MCP server, which runs the tools. The types are list tools request/result and call tool request/result.

23. Q: Which decorator and helper declare a tool in the Python SDK, and what does the SDK generate?
    A: `@mcp.tool` on a function with typed parameters and `Field` descriptions (from pydantic). The SDK auto-generates the JSON schema.

24. Q: What two tools does the course's server define, and what do they take?
    A: `read_doc_contents(doc_id)` and `edit_document(doc_id, old_string, new_string)`. Both raise `ValueError` if the document does not exist.

25. Q: How do you launch the MCP Inspector and test a tool?
    A: With the Python environment activated, run `mcp dev [server_file.py]`, open the printed localhost address, click Connect, open Tools, select a tool, enter parameters, click Run Tool, check the result.

26. Q: Why does the course wrap the client session in a class?
    A: The session is the actual connection and needs resource cleanup on close; a wrapper with connect/cleanup and async enter/exit manages that and exposes server functionality to the codebase.

27. Q: Name the two kinds of MCP resource with the course's URI examples.
    A: Direct/static (`docs://documents`) and templated (`docs://documents/{doc_id}`, where URI parameters become function keyword arguments).

28. Q: What is a resource's MIME type for, and which line reads a resource in the client?
    A: It hints at the data format. The client runs `await self.session.read_resource(AnyUrl(uri))`, takes `result.contents[0]`, and checks `resource.mime_type`: `application/json` gives `json.loads(resource.text)`, anything else returns `resource.text`.

29. Q: What is an MCP prompt, and what does a prompt function return?
    A: A pre-written, tested instruction the server exposes for specialized tasks, reachable via slash commands such as `/format`. The function takes arguments (e.g. a document ID) and returns a list of messages, such as `[base.user_message(prompt_text)]`.

30. Q: Which two client calls handle prompts, and what do they return?
    A: `list_prompts()` (the MCP course notes say `result.props`, the API course notes say `result.prompts`: unresolved) and `get_prompt(prompt_name, arguments)`, which returns `result.messages`.

31. Q: Match each MCP primitive to its controller and the need it serves.
    A: Tools: model-controlled, add capabilities to Claude (JavaScript execution). Resources: app-controlled, get data into the app (Google Drive document selection). Prompts: user-controlled, predefined workflows (chat starter buttons, slash commands).
