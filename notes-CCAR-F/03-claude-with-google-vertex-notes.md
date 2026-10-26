# Claude on Google Cloud - Study Notes

Source: Anthropic Academy course "Claude on Google Cloud" (site slug: claude-with-google-vertex; Claude with Google Vertex AI; 93 lesson pages). The site's own full-course notes are the primary source; lesson 04 (Vertex AI Setup) is the only lesson page with real written text. Notes follow course order. The course examples are Python/JSON and Google Cloud console/CLI steps; request and response JSON shapes, parameter names and gcloud commands below are kept as the course states them, and client-side logic is shown as plain illustrative Java (labelled "illustrative, not from the course").

Conventions used in these notes
- "The course says" facts come from the official course notes or lesson 04. Anything not found there is flagged "Source gap:".
- Java snippets use only java.net.http.HttpClient ideas, records and my own small interfaces (for example `Llm`). No Anthropic or Google SDK class or method names are used or implied.
- The raw Vertex AI REST endpoint, auth header format and any anthropic_version field are NOT stated in the course. They appear only as placeholders.
- No model version strings, regions (other than region="global" in the client call), quotas or prices are stated by the course beyond what is quoted below.

---

## 1. Big Picture

- This is the Vertex AI edition of the general Claude API course. The teaching content (models, messages, system prompts, temperature, streaming, prefill, stop sequences, evals, prompt engineering, tool use, RAG, features, MCP, Claude Code, computer use, workflows vs agents) is the same arc; what changes is HOW you reach Claude: through Google Cloud instead of an Anthropic API key.
- Access path: enable the Anthropic model in Vertex AI Model Garden, install and log in to the gcloud CLI, set your project ID and Application Default Credentials, then use the Anthropic SDK's Vertex client. The SDK picks up the gcloud credentials automatically.
- Client creation is different from the direct API: install `anthropic[vertex]`, import `vertex` from `anthropic`, and instantiate the client with `region="global"` and your Google Cloud `project_id`. There is no API key in the course's flow.
- Everything after the client is the same Messages shape: `model`, `max_tokens`, `messages` are required; `system`, `temperature`, `stop_sequences`, `tools`, `tool_choice`, `thinking`, `stream` are optional levers.
- The API is stateless: your code owns conversation history and resends all of it every request.
- You do not ship a prompt without measuring it: the course builds an eval pipeline (dataset + prompt + Claude + grader) and uses it to score each prompt-engineering technique.
- Tool use: Claude asks for a tool, your server runs it, you send back a tool_result, and a loop repeats until stop_reason is no longer "tool_use". Built-ins (text editor, web search) are schema-only stubs.
- RAG on Vertex uses Google's `text-embedding-005` model via the Google GenAI SDK for embeddings, plus BM25, reciprocal rank fusion, reranking and contextual retrieval.
- MCP moves tool schema/function authoring to an MCP server (tools, resources, prompts). The course ends with workflows (parallelization, chaining, routing, evaluator-optimizer) versus agents, and recommends workflows for reliability.

```
  GOOGLE CLOUD SIDE (one-time setup)               YOUR APP SIDE
  ---------------------------------                ------------------------------
  Vertex AI dashboard                              Client app (browser/mobile)
     |                                                  |  user text
     v                                                  v
  Model Garden -> search "Anthropic"               Your server  (NO creds in client)
     |                                                  |  Anthropic SDK, Vertex client
     v                                                  |  region="global", project_id
  Click model -> [Enable] (if shown)                    |  model + max_tokens + messages
     |                                                  v
  gcloud init / gcloud auth login                  Vertex AI  --->  Claude model
  gcloud config set project YOUR_PROJECT_ID             ^             |
  gcloud auth application-default login                 |             | text + usage
     |                                                  |             | + stop_reason
     +---- Application Default Credentials ------------+             v
           (SDK uses them automatically)           Your server -> client display

  COURSE ARC
  models -> access/setup -> request -> multi-turn -> system prompt/temperature
  -> streaming -> prefill/stop sequences/structured data -> [quiz]
  -> prompt evals (dataset, run, model/code grading) -> [quiz]
  -> prompt engineering (clear, specific, XML, examples) -> [quiz]
  -> tool use (functions, schemas, loop, batch, text edit, web search) -> [quiz]
  -> RAG (chunk, embed, BM25, multi-index, rerank, contextual) -> [quiz]
  -> features (thinking, image, PDF, citations, caching) -> [quiz]
  -> MCP (tools, resources, prompts) -> [quiz]
  -> Claude Code / computer use -> workflows vs agents -> [quiz] -> final assessment
```

---

## 2. Course Intro and Overview of Claude Models

Key ideas
- Lesson 01 (Welcome to the course) and lesson 93 (Course wrap-up) have no captured text.
- Three model families, each optimized for a different priority:
  - Opus = highest intelligence. For complex multi-step tasks requiring deep reasoning and planning; can work independently for hours; supports a reasoning capability. Trade-off: higher cost and moderate latency.
  - Sonnet = balanced: good intelligence, speed and cost efficiency. Strong coding; makes precise code edits without breaking functionality; fast text generation. The sweet spot for most use cases.
  - Haiku = fastest. Optimized for speed and cost efficiency. No reasoning capabilities. Best for real-time user interactions and high-volume processing.
- Selection framework: intelligence priority -> Opus; speed priority -> Haiku; balanced needs -> Sonnet.
- Teams often use multiple models in the same application: Haiku for user interactions, Sonnet for business logic, Opus for complex reasoning tasks.
- All models share core capabilities: text generation, coding, image analysis.

Rules and traps
- Pick by priority (intelligence / speed / balance), not by name recall.
- Haiku has no reasoning capability, so it is the wrong pick when extended-thinking-style deep reasoning is the point.
- Source gap: the course notes give no model version strings, context windows, prices or per-region availability for Vertex. Do not memorize any here. Which models are offered depends on what you find in Model Garden when you search "Anthropic".

---

## 3. Accessing the API

### 3.1 The five-step access flow

```
 Client app          Your server               Vertex AI -> Claude
 (browser/mobile)    (holds Google creds)
     |  user text         |                          |
     |------------------->|  SDK request             |
     |                    |------------------------->|
     |                    |  model + messages +      |
     |                    |  max_tokens              | tokenize -> embed ->
     |                    |                          | contextualize -> generate
     |                    |<-------------------------|
     |                    |  text + usage + stop_reason
     |<-------------------|                          |
     |  display           |                          |
```

Key ideas
- Step 1: the client sends user text to YOUR server. Never access Vertex directly from the client: credentials must stay secret.
- Step 2: the server calls Vertex AI using an SDK (Python, TypeScript, Go, Ruby). Required parameters: model name, messages list, max_tokens limit.
- Step 3: Claude's text generation has four stages:
  - Tokenization = input broken into tokens (words, word parts, symbols).
  - Embedding = tokens converted to lists of numbers representing all possible meanings.
  - Contextualization = embeddings adjusted based on neighboring tokens to determine the precise meaning.
  - Generation = output layer produces word probabilities; the model selects using probability plus randomness, adds the selected word, and repeats.
- Step 4: generation stops when max_tokens is reached OR the model generates an end-of-sequence token.
- Step 5: the API returns the generated text, usage counts and the stop reason. Your server forwards to the client for display.

Rules and traps
- Security: always route calls through your server; never expose credentials in client applications.
- The response carries three things worth keeping: generated text, usage (input/output token counts), stop reason.
- Trap: max_tokens is a ceiling, not a target.

---

## 4. Vertex AI Setup (lesson 04 - real written text)

This is the lesson that makes the course different from the direct-API course. The next lesson makes a request, so setup must be done first.

### Step One: ensure Anthropic models are enabled in Vertex
- In the browser go to https://console.cloud.google.com/vertex-ai/dashboard
- In the left-hand nav click **Model Garden**.
- In the **Search models** box enter **Anthropic**.
- Click on the model that you want to use.

### Step Two: enable the model
- On the model information page you may need to click the **Enable** button.
- If you do not see an **Enable** button, you already have access to the model.

### Step Three: install the gcloud CLI
- If you do not already have it, install and authenticate using https://cloud.google.com/sdk/docs/install

### Step Four: log in and set up authentication with the gcloud CLI
If you have not already logged in:

```
gcloud init
gcloud auth login
```

Then set your project ID and default credentials:

```
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default login
```

The lesson closes: the Anthropic SDK will automatically use these credentials when attempting to access Vertex.

```
  Setup checklist (in order)
  [1] console.cloud.google.com/vertex-ai/dashboard -> Model Garden
  [2] search "Anthropic" -> open model -> Enable (if button present)
  [3] install gcloud CLI (cloud.google.com/sdk/docs/install)
  [4] gcloud init ; gcloud auth login
  [5] gcloud config set project YOUR_PROJECT_ID
  [6] gcloud auth application-default login   <-- creates the credentials the SDK reads
```

Rules and traps
- Two different logins: `gcloud auth login` (for the CLI itself) and `gcloud auth application-default login` (the default credentials the SDK uses). The course lists both; do not stop after the first.
- "No Enable button" means access already exists, not that something is broken.
- The project ID you set with `gcloud config set project` is the same Google Cloud project ID you later pass as `project_id` to the client (the course describes Project ID as the unique identifier from the Google Cloud console).
- Source gap: IAM roles, billing, quota requests, and per-model region availability are not covered by the captured text.

Java note (illustrative, not from the course)
- The course's SDK is Python; the SDK reads Application Default Credentials for you. In Java you would need to obtain an access token from those same credentials yourself. How to do that (and the exact raw Vertex endpoint) is not in the course, so the snippet in section 5 leaves them as placeholders.

---

## 5. Making a Request

Key ideas
- Setup in the notebook:
  1. Install the SDK: `%pip install "anthropic[vertex]"`
  2. Import and create the client: `from anthropic import vertex`, then instantiate it with `region="global"` and `project_id`.
  3. Define a model version variable so it can be reused.
- Required arguments to `client.messages.create()`:
  - `model` = the specific Claude model version string
  - `max_tokens` = a safety limit on response length (not a target, just a maximum)
  - `messages` = list of message dictionaries
- Message types:
  - User message = `{role: "user", content: "text written by humans"}`
  - Assistant message = `{role: "assistant", content: "text generated by Claude"}`
- Response access: the raw response contains metadata. Extract the generated text with `message.content[0].text`.
- Key terms: Messages = conversation exchanges between user and Claude; Max tokens = safety mechanism preventing excessive generation; Project ID = unique identifier from the Google Cloud console.

Rules and traps
- Client args to remember: `region="global"` and `project_id`. No API key is mentioned.
- `max_tokens` is required; leaving it out is an error, and setting it huge does not make the answer longer.
- The text lives at `content[0].text`: content is a list of blocks.

Java sketch (illustrative, not from the course)

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

// Illustrative, not from the course.
// The course's request carries three required things: model, max_tokens, messages.
// ENDPOINT and the token source are placeholders: the course does not state
// the raw Vertex REST URL or auth header; the Python SDK handles both for you
// using the credentials from `gcloud auth application-default login`.
public class VertexClaudeSketch {
    static final String ENDPOINT = "<vertex-endpoint-for-your-project-region-and-model>";

    public static String ask(String accessToken, String modelId, String userText) throws Exception {
        // Body shape mirrors the course's parameters (model, max_tokens, messages).
        // Real Vertex bodies may differ in detail; check Google/Anthropic docs.
        String body = """
            {
              "model": "%s",
              "max_tokens": 1000,
              "messages": [
                {"role": "user", "content": "%s"}
              ]
            }
            """.formatted(modelId, userText);

        HttpRequest req = HttpRequest.newBuilder(URI.create(ENDPOINT))
            .header("Authorization", "Bearer " + accessToken) // placeholder auth
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> resp = HttpClient.newHttpClient()
            .send(req, HttpResponse.BodyHandlers.ofString());
        // Response JSON has content[0].text, usage and stop_reason.
        return resp.body();
    }
}
```

---

## 6. Multi-Turn Conversations and the Chat Exercise

Key ideas
- Constraint: the Anthropic API stores no messages. Every request is stateless; Claude has no memory of earlier exchanges.
- Problem: a follow-up sent without context gets an irrelevant answer.
- Solution requirements:
  1. Manually maintain a message list in your code.
  2. Send the ENTIRE conversation history with every request.
- Implementation pattern:
  - create an empty messages list
  - add the user message
  - send to Claude, get the response
  - add the assistant response to the list
  - add the next user message
  - send the whole updated list
  - repeat
- Helper functions:
  - `add_user_message(messages, text)` appends a user message
  - `add_assistant_message(messages, text)` appends an assistant response
  - `chat(messages)` sends the message list to the API and returns the response
- Message structure = list of dictionaries with "role" (user/assistant) and "content".
- Including full history in each call lets Claude understand references and keep a coherent dialogue.

Rules and traps
- Forgetting to append the assistant reply before the next user message breaks the conversation.
- Cost grows with history length because the whole list is resent each turn (a consequence of statelessness).
- Source gap: lesson 07 (Chat Exercise) has no captured text; presumably it practices these helpers in a chat loop.

Java sketch (illustrative, not from the course)

```java
import java.util.ArrayList;
import java.util.List;

// Illustrative, not from the course. Mirrors the course's three helpers.
public class Conversation {
    public record Message(String role, String content) {}

    private final List<Message> messages = new ArrayList<>();

    public void addUserMessage(String text)      { messages.add(new Message("user", text)); }
    public void addAssistantMessage(String text) { messages.add(new Message("assistant", text)); }

    // chat(messages): the FULL list is sent every time, because the API keeps no state.
    public String chat(Llm llm) {
        String reply = llm.send(List.copyOf(messages)); // wraps one HTTP call
        addAssistantMessage(reply);                      // keep the reply for the next turn
        return reply;
    }

    public interface Llm { String send(List<Message> fullHistory); }
}
```

---

## 7. System Prompts and Exercise

Key ideas
- System prompt = instructions that customize Claude's tone, style and behavior for a use case. It controls HOW Claude responds rather than just WHAT.
- Example: make Claude a patient math tutor that gives hints instead of direct answers.
- Implementation: pass the system prompt as a plain string using the `system` keyword argument to the create function.
- Structure: the first line typically assigns a role ("You are a patient math tutor"), followed by specific behavioral instructions.
- Principle: system prompts steer approach: a tutor gives guidance and asks leading questions rather than solving outright.

Rules and traps
- The `system` parameter cannot be None. Include it in the API call only when a system prompt exists (conditional inclusion, for example by building a params dict).
- Best practice: make the system prompt configurable instead of hard-coded, for reuse across use cases.
- Result: turns direct Q&A into guided, interactive experiences for a role.
- Source gap: lesson 09 (System Prompts Exercise) has no captured text.

Java sketch (illustrative, not from the course)

```java
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Illustrative, not from the course: only add "system" when one exists,
// because the course says the parameter cannot be None/null.
static Map<String, Object> buildParams(String model, int maxTokens,
                                       List<Map<String, String>> messages,
                                       String systemPromptOrNull) {
    Map<String, Object> p = new LinkedHashMap<>();
    p.put("model", model);
    p.put("max_tokens", maxTokens);
    p.put("messages", messages);
    if (systemPromptOrNull != null && !systemPromptOrNull.isBlank()) {
        p.put("system", systemPromptOrNull);   // e.g. "You are a patient math tutor..."
    }
    return p;
}
```

---

## 8. Temperature

Key ideas
- Temperature = parameter controlling randomness in text generation; a decimal value 0 to 1.
- Generation process: tokenization -> probability assignment -> token selection based on probabilities.
- Temperature 0 = deterministic: always selects the highest-probability token.
- Higher temperature = greater chance of picking lower-probability tokens: more creative or unexpected output.
- Guidelines:
  - Low (near 0): data extraction, factual tasks, consistent outputs.
  - High (near 1): creative writing, brainstorming, jokes, marketing.
- In the course's helper function the `temperature` parameter defaults to 1.0.

Rules and traps
- Higher temperature raises the CHANCE of variation but does not guarantee it; you may need several attempts to see creative differences.
- Do not use high temperature for extraction or structured output you will parse.
- Lesson 11 (Course Satisfaction Survey) is not content.

---

## 9. Response Streaming

Key ideas
- Purpose: give immediate feedback during long generation instead of a 10-30 second loading spinner.
- Flow: server sends the user message -> Claude immediately returns an initial response (no text, just acknowledgment) -> Claude sends a stream of events containing text chunks -> server forwards chunks to the frontend -> text appears progressively.
- Event types: `message_start`, `content_block_start`, `content_block_delta` (contains the actual text), `content_block_stop`, `message_delta`, `message_stop`.
- Python implementation levels:
  - Basic: `client.messages.create(model, max_tokens, messages, stream=True)` returns an iterator of events.
  - Text-focused: `client.messages.stream()` as a context manager gives `stream.text_stream`.
  - `stream.get_final_message()` assembles all chunks into the complete message, for example to store in a database.

Rules and traps
- Only `content_block_delta` events carry text.
- Streaming changes delivery, not content; you still need the assembled final message for persistence.

```
 message_start
   content_block_start
     content_block_delta  (text chunk)   <-- forward each chunk to the UI
     content_block_delta  (text chunk)
   content_block_stop
 message_delta
 message_stop
```

Java sketch (illustrative, not from the course)

```java
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.function.Consumer;

// Illustrative, not from the course. Shows the idea only: read the response
// as a line stream and forward text chunks as they arrive.
// Parsing event JSON and the exact wire framing are NOT specified in the course.
static void streamToUi(HttpClient http, HttpRequest streamingRequest,
                       Consumer<String> sendChunkToFrontend) throws Exception {
    HttpResponse<java.io.InputStream> resp =
        http.send(streamingRequest, HttpResponse.BodyHandlers.ofInputStream());
    StringBuilder finalText = new StringBuilder();   // like get_final_message()
    try (BufferedReader r = new BufferedReader(new InputStreamReader(resp.body()))) {
        String line;
        while ((line = r.readLine()) != null) {
            // pseudocode: if this event is content_block_delta, extract its text
            // String chunk = extractTextFromDelta(line);
            // if (chunk != null) { finalText.append(chunk); sendChunkToFrontend.accept(chunk); }
        }
    }
    // persist finalText.toString() once message_stop has arrived
}
```

---

## 10. Controlling Model Output: Prefill and Stop Sequences

Key ideas
- Two techniques beyond rewording the prompt: pre-filling assistant messages and stop sequences.
- Pre-filling an assistant message:
  - Manually add an assistant message at the END of the messages list to steer the response direction.
  - Claude treats the pre-filled content as already authored by itself and continues from that point.
  - Example: pre-fill "coffee is better because" to force Claude to justify a coffee preference.
  - The response continues from the end of the pre-filled text; it is not a full replacement.
- Stop sequences:
  - Pass a list of strings in the `stop_sequences` parameter; generation halts immediately when any is generated.
  - The generated stop sequence text is excluded from the final output.
- Use cases: prefill controls direction/stance; stop sequences control length/format by ending at specific points.

Rules and traps
- Prefill goes LAST in the list, as an assistant message.
- The stop sequence is not in the returned text, so do not look for it.

Java sketch (illustrative, not from the course)

```java
// Illustrative, not from the course. Prefill = last message has role "assistant".
String body = """
{
  "model": "<model>",
  "max_tokens": 500,
  "messages": [
    {"role": "user", "content": "Is coffee or tea better?"},
    {"role": "assistant", "content": "coffee is better because"}
  ],
  "stop_sequences": ["<some-trigger-string>"]
}
""";
// The reply text continues AFTER "coffee is better because";
// the stop-sequence text itself is not included in the output.
```

---

## 11. Structured Data and Exercise

Key ideas
- Problem: Claude naturally adds headers, footers and explanations around JSON, Python or lists. Users often want only the raw content (copy/paste).
- Solution = prefill + stop sequence together:
  1. Pre-fill the assistant message with an opening delimiter (for example "```json").
  2. Set a stop sequence matching the closing delimiter (for example "```").
  3. Claude assumes it already wrote the opening, generates only the content, and stops at the closing delimiter.
- Example: user "generate event bridge rule as JSON"; assistant prefill "```json"; stop sequence "```"; output is just the JSON.
- Benefits: no unwanted markdown, no explanatory text, direct copy/paste; works for JSON, code, lists.
- Cleanup: `text.strip()` or `JSON.loads()` handles leftover newlines/formatting.

Rules and traps
- Both halves are needed: prefill alone leaves a trailing explanation; stop sequence alone leaves the opening fence.
- The delimiter must match the content type; when the format is unknown ahead of time the course pre-fills a generic code fence (see section 13.6).
- Source gap: lesson 15 (Structured Data Exercise) has no captured text.

```
 user:      "generate event bridge rule as JSON"
 assistant: "```json"            <-- prefill (we wrote the opening)
 Claude:    { ...json... }       <-- continues
 stop seq:  "```"                <-- halts here; fence excluded
 result:    raw JSON only -> strip() / parse
```

Java sketch (illustrative, not from the course)

```java
// Illustrative, not from the course: consume the clean JSON the prefill+stop trick yields.
// Uses a placeholder parser interface so no specific JSON library API is assumed.
static Object parseModelJson(String modelText, JsonParser parser) {
    String cleaned = modelText.strip();   // course: text.strip() / JSON.loads()
    return parser.parse(cleaned);         // throws if the model added commentary
}
interface JsonParser { Object parse(String json); }
```

---

## 12. Quiz on Accessing Claude with the API

- Lesson 16 text was not captured.
- Source gap: the quiz questions and answers are not in the sources. Topics it covers (from the preceding lessons): access flow and why calls go through a server, Vertex setup, required parameters, statelessness and multi-turn history, system prompts, temperature, streaming events, prefill and stop sequences, structured data.

---

## 13. Prompt Evaluation

### 13.1 Why evaluate

Key ideas
- Prompt engineering = techniques for writing/editing prompts so Claude understands the request and the desired response format.
- Prompt evaluation = automated testing of prompts with objective metrics to measure effectiveness.
- Three paths after writing a prompt:
  1. Test once or twice and deploy to production (trap).
  2. Test with custom inputs and make minor tweaks for corner cases (trap).
  3. Run through an evaluation pipeline for objective scoring (recommended).
- Paths 1 and 2 are common traps: engineers do not test prompts enough before production use.
- Evaluation comes before engineering in the course sequence: measure effectiveness first, then learn improvement techniques.

### 13.2 A typical eval workflow (5 steps, iterative)

```
 [1] Draft prompt with input variable ("Please answer the user's question [user_input]")
          |
 [2] Evaluation dataset (3 inputs minimum in the demo; real use: hundreds/thousands;
          |             hand-made or AI-generated)
 [3] Run each dataset input through the template -> complete prompt -> Claude -> response
          |
 [4] Grade each question/answer pair (typically 1-10); average = prompt score
          |
 [5] Modify prompt, repeat, compare scores  ----> loop until good enough
```

Key ideas
- No standardized methodology across the industry; options are open-source packages, paid solutions or custom builds.
- You can start simple in a Jupyter notebook before scaling.
- Objective scores allow data-driven comparison rather than subjective feel.

### 13.3 Generating test datasets

Key ideas
- The demo goal: a prompt that helps users write AWS-specific code, outputting exactly one of three formats: Python, a JSON configuration, or a raw regular expression.
- Prompt: "Please provide a solution to the following task: [user task]" with no extra explanation/headers/footers.
- Dataset = array of JSON objects with a "task" property: `[{task: "description"}, {task: "description"}, ...]`.
- Generation: manual assembly, or automatic generation with Claude Haiku (the faster model is recommended).
- Process:
  1. Write `generate_dataset()` with a large prompt asking Claude to produce test cases.
  2. Pre-fill an assistant message "```json".
  3. Set the stop sequence "```" for clean JSON.
  4. Parse with `JSON.loads()`.
  5. Save to a file with `JSON.dump()` for later evaluation.

### 13.4 Running the eval

Key ideas
- Test case = one record from the dataset, merged with the prompt and fed to Claude.
- `run_prompt` merges the test case with the prompt ("please solve the following task" + test case), sends it, returns the output. At this stage no formatting instructions, so output is verbose.
- `run_test_case` calls `run_prompt`, grades the result (hard-coded score 10 at this stage), returns a dictionary with output, test case and score.
- `run_eval` loads the dataset, loops through each test case calling `run_test_case`, assembles a list of results.
- Pipeline: dataset -> merge with prompt -> send to Claude -> grade -> collect outputs.
- Limitations at this stage: no grading logic (hard-coded scores), no output format instructions, slow (31 seconds with Haiku).
- Result shape: array of objects each holding Claude output, original test case, and score.

Java sketch (illustrative, not from the course)

```java
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiFunction;
import java.util.function.Function;

// Illustrative, not from the course: the eval loop shape (dataset -> prompt -> LLM -> grade).
public class EvalSketch {
    public record TestCase(String task, String format) {}
    public record Result(String output, TestCase testCase, double score) {}

    public static List<Result> runEval(List<TestCase> dataset,
                                       Function<TestCase, String> runPrompt,        // merge + call Claude
                                       BiFunction<TestCase, String, Double> grade) { // code/model grader
        List<Result> results = new ArrayList<>();
        for (TestCase tc : dataset) {
            String output = runPrompt.apply(tc);
            results.add(new Result(output, tc, grade.apply(tc, output)));
        }
        return results;
    }

    public static double average(List<Result> rs) {
        return rs.stream().mapToDouble(Result::score).average().orElse(0);
    }
}
```

### 13.5 Model-based grading

Key ideas
- Using AI models to evaluate outputs of other AI models, giving an objective scoring signal.
- Three grader types:
  - Code graders = programmatic checks (length, syntax, readability, presence of words).
  - Model graders = extra API calls evaluating quality, instruction following, completeness.
  - Human graders = manual evaluation (flexible but time-consuming).
- All graders must return objective signals, typically 1-10 scores. Define the evaluation criteria up front.
- For model graders: use detailed prompts that request strengths, weaknesses and reasoning, to avoid middling scores. Without a reasoning requirement, models default to about 6.
- Implementation pattern:
  1. grading function takes test case + model output
  2. structured prompt with role definition and clear evaluation instructions
  3. extract the JSON response with score and reasoning
  4. average scores across test cases for the final metric
- Common criteria: format compliance, syntax validation, task completion accuracy.
- Model graders suit subjective quality; code graders suit objective validation.

### 13.6 Code-based grading

Key ideas
- Goal: check outputs contain ONLY valid code (Python/JSON/RegEx) without explanations.
- Components:
  - `validate_json()` tries JSON parsing; returns 10 if valid, 0 on error.
  - `validate_python()` tries AST parsing; 10 if valid, 0 on error.
  - `validate_regex()` tries regex compilation; 10 if valid, 0 on error.
  - `grade_syntax()` dispatches to the right validator by the test case's format.
- Implementation steps:
  1. add the validators (attempt parse/compile)
  2. add a "format" key to each dataset item (JSON/Python/RegEx)
  3. update the prompt template to request only code, no commentary
  4. use a pre-filled assistant message with a code block and a stop sequence
  5. merge syntax score with model score by averaging
- Prefill detail: use "```code" as the pre-filled assistant message because the exact format is unknown beforehand.
- Score = (model_score + syntax_score) / 2.
- Insight: syntax is validated by try/catch parsing rather than complex rules.

Java sketch (illustrative, not from the course)

```java
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

// Illustrative, not from the course: same "try to parse, 10 or 0" idea in Java.
public class SyntaxGraders {
    public interface JsonParser { void parse(String json) throws Exception; } // plug in any library

    public static int validateJson(String text, JsonParser parser) {
        try { parser.parse(text); return 10; } catch (Exception e) { return 0; }
    }

    public static int validateRegex(String text) {
        try { Pattern.compile(text); return 10; } catch (PatternSyntaxException e) { return 0; }
    }

    // course formula: (model_score + syntax_score) / 2
    public static double combine(double modelScore, double syntaxScore) {
        return (modelScore + syntaxScore) / 2.0;
    }
}
```

### 13.7 Exercise and quiz

- Lesson 23 (Exercise on Prompt Evals) and lesson 24 (Quiz on Prompt Evaluation): no captured text.
- Source gap: exercise instructions and quiz questions are not in the sources.

Rules and traps (evals)
- Do not rely on "a couple of manual tests" before production; build a dataset and score it.
- A model grader without required reasoning drifts to middling scores (about 6).
- Code graders catch format problems (commentary mixed into JSON) that model graders may forgive; combine both.
- The dataset needs a "format" field for the syntax grader to know which validator to run.

---

## 14. Prompt Engineering Techniques

### 14.1 Setup (lesson 25)

Key ideas
- Prompt engineering = improving prompts for more reliable, higher-quality outputs.
- Demo goal: generate a one-day meal plan for athletes from height, weight, physical goal and dietary restrictions.
- Process: write an initial (deliberately poor) prompt -> evaluate -> apply techniques iteratively -> re-evaluate after each -> monitor improvement.
- Initial prompt: "What should this person eat?" plus basic interpolation of height, weight, goal, restrictions.
- Evaluation setup uses a Prompt Evaluator class with configurable concurrency: start low (like 3) and reduce to 1 if you hit rate limits. Extra criteria can require caloric totals, macro breakdowns, exact foods/portions/timing.
- Output evaluation creates an HTML report with test case results, scores and reasoning.
- Expected pattern: initial scores poor, improving systematically as techniques are applied.

### 14.2 Being clear and direct

- The FIRST LINE of the prompt is the most important part; it sets the foundation.
- Structure: action verb + simple direct language + clear task description.
- Action verbs: write, generate, create, identify, analyze.
- Include expected output format and content requirements.
- Examples from the course:
  - "Write three paragraphs about how solar panels work" (verb + output format + topic).
  - "Identify three countries that use geothermal energy and for each include generation stats" (verb + quantity + requirements).
- Replace vague openings with direct commands.
- Result in the course: score rose from 2.32 to 3.92.

### 14.3 Being specific

- Adding guidelines or steps to push output in a direction.
- Type A = control output attributes (length, structure, qualities).
- Type B = provide steps for the model to follow (forces it to consider specific elements; improves reasoning quality).
- Both are often combined in professional prompts.
- When to use: Type A almost always (list desired output qualities). Type B for complex problems needing broader consideration of viewpoints or data beyond the model's natural scope.
- Result in the course: 3.92 -> 7.86.

### 14.4 Structure with XML tags

- Wrap content sections in descriptive tags (for example `<sales_records></sales_records>`, `<my_code></my_code>`) instead of dumping raw text.
- Purpose: helps the model tell types of interpolated content apart when large amounts of text are inserted.
- Tag names should be specific and descriptive (sales_records > records > data) to convey the nature of the content.
- Use cases: separating code from documentation, marking athlete information, organizing sales data, any prompt with several content types.
- Benefits: less ambiguity about what text serves what purpose; better comprehension of structure; can improve quality especially with simpler models.
- Best practice: even for short sections, tags clarify that content is external input or a specific category.

### 14.5 Providing examples (one-shot / multi-shot)

- One-shot = a single example; multi-shot = several.
- Wrap examples in XML tags with sample input and ideal output sections, clearly separate from the main prompt.
- Corner cases: use multi-shot to cover edge cases such as sarcasm detection; add context explaining why a scenario needs special attention.
- Complex outputs: examples especially help demonstrate intricate JSON structures or formatting.
- Link to evals: extract high-scoring test cases from eval results to use as examples; include the reasoning for why the output is ideal.

### 14.6 Exercise and quiz

- Lessons 30 (Exercise on Prompting) and 31 (Quiz on Prompt Engineering Techniques): no captured text.
- Source gap: exercise and quiz content missing.

Rules and traps
- Technique order the course applies: clear and direct -> specific (A and B) -> XML tags -> examples; re-run the eval after each so each step has a measurable effect.
- Vague first lines ("What should this person eat?") are the classic failure.
- Type B steps are for problems that need broader consideration, not every prompt.

Java sketch (illustrative, not from the course)

```java
// Illustrative, not from the course: build a prompt with a direct first line,
// guidelines, XML-tagged input and a multi-shot example block.
static String buildPrompt(String athleteInfo) {
    return """
        Generate a one-day meal plan for an athlete that meets their goal and restrictions.

        Guidelines:
        - Include a total calorie count and a macro breakdown.
        - List exact foods, portions and timing.

        <athlete_information>
        %s
        </athlete_information>

        <example>
          <sample_input>...</sample_input>
          <ideal_output>...</ideal_output>
        </example>
        """.formatted(athleteInfo);
}
```

---

## 15. Tool Use with Claude

### 15.1 Introducing tool use

Key ideas
- Tool use lets Claude reach information beyond its training data (it lacks real-time/current information).
- Flow:
  1. Send the initial request plus instructions for external data access.
  2. Claude decides whether external data is needed and requests specific information.
  3. Your server runs code to fetch the data.
  4. Send a follow-up request containing the retrieved data.
  5. Claude produces the final response from the original prompt plus the data.
- Weather example: without tools Claude says it has no access to current weather; with tools it requests weather data, the server calls a weather API, and Claude answers with current data.

### 15.2 Project overview (reminders tool project)

- Goal: teach Claude to set time-based reminders via tools in a Jupyter notebook. Target: user says "Set reminder for doctor's appointment, week from Thursday" and Claude replies "I will remind you at that point in time".
- Three problems:
  1. Claude lacks precise current time (it knows the date, not the exact time).
  2. It sometimes fails at time calculations (example: "379 days from January 13th, 1973").
  3. It has no mechanism to actually set reminders.
- Solution: three tools: (1) get current datetime, (2) add a duration to a datetime, (3) set a reminder. Built one at a time, then combined.

### 15.3 Tool functions

- A tool function is a plain Python function that retrieves specific data (current datetime, weather); it runs when Claude decides it needs extra information.
- Best practices:
  1. descriptive function and argument names
  2. validate inputs and raise errors for invalid data
  3. meaningful error messages that help Claude correct its mistakes
- Claude sees the exact error text when a call fails and can retry with corrected parameters (example: "location cannot be empty" -> retry with a valid location).
- Course example:

```
def get_current_datetime(date_format="%Y%m%d %H:%M:%S"):
    if not date_format:
        raise ValueError("date format cannot be empty")
    return datetime.now().strftime(date_format)
```

- Single responsibility per tool function.

Java sketch (illustrative, not from the course)

```java
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

// Illustrative, not from the course: same shape as get_current_datetime,
// including the clear error message Claude can learn from.
// (Python strftime codes in the course differ from Java DateTimeFormatter patterns.)
static String getCurrentDatetime(String dateFormat) {
    if (dateFormat == null || dateFormat.isBlank()) {
        throw new IllegalArgumentException("date format cannot be empty");
    }
    return LocalDateTime.now().format(DateTimeFormatter.ofPattern(dateFormat));
}
```

### 15.4 Tool schemas

- A tool schema is a JSON configuration object describing the tool function to the model.
- JSON Schema is a general data-validation spec (not LM-specific); the LM community adopted it for tool calling because it is widely understood.
- Structure:
  - `name`: tool function name
  - `description`: 3-4 sentences on what the tool does, when to use it, and what data it returns
  - `input_schema`: the actual JSON schema of the function arguments (type, description for each parameter)
- Best practice: 3-4 sentence descriptions for the tool AND for individual arguments.
- Trick: ask Claude to write the JSON schema for your function, attaching Anthropic's tool use documentation for best practices.
- Naming convention: `function_name` plus `function_name_schema`.
- Type safety: wrap the schema in `ToolParam` (import from `anthropic.types`) to avoid type errors.

Java sketch (illustrative, not from the course)

```java
// Illustrative, not from the course: a tool definition with the three fields
// the course names (name, description, input_schema).
String getCurrentDatetimeSchema = """
{
  "name": "get_current_datetime",
  "description": "Returns the current date and time formatted with the given format string. Use it whenever the user's request depends on the present moment, because the model does not know the exact current time. Returns the formatted datetime as a string.",
  "input_schema": {
    "type": "object",
    "properties": {
      "date_format": {
        "type": "string",
        "description": "A strftime-style format for the returned datetime. Must not be empty. Defaults to year-month-day hour:minute:second when omitted."
      }
    },
    "required": []
  }
}
""";
```

### 15.5 Handling message blocks

- Include the `tools` parameter (list of JSON schemas) in the request so Claude knows what is available.
- A response can be multi-block: text blocks (for display) plus tool use blocks (function name + input arguments).
- Claude stores no history, so you must preserve the ENTIRE content list (all blocks) when appending to history: `messages.append({"role": "assistant", "content": response.content})`.
- The `add_user_message` / `add_assistant_message` helpers initially support only a single text block and must be updated to handle multiple blocks per message.

### 15.6 Sending tool results

- Step 4: execute the tool Claude requested. Extract the arguments from the tool use block with `response.content[1].input` and call the function with `**kwargs` expansion.
- Step 5: send a follow-up with the full conversation history plus a new USER message containing a tool result block.
- Tool result block fields:
  - `tool_use_id` = matches the ID from the original tool use block (lets Claude pair requests and results when several tools are called)
  - `content` = tool output converted to a string
  - `is_error` = false by default; true if tool execution failed
- Complete flow: user message -> assistant message with tool use block -> run the function -> user message with tool result block -> final assistant response.
- Rule: once tools are introduced, include the tool schemas in ALL later requests, even follow-ups.

```
 messages = [
   user:       "What day is 103 days from today?"
   assistant:  [text, tool_use(id=T1, get_current_datetime, {...})]
   user:       [tool_result(tool_use_id=T1, content="...", is_error=false)]
   assistant:  [tool_use(id=T2, add_duration_to_datetime, {...})]
   user:       [tool_result(tool_use_id=T2, ...)]
   assistant:  [text: final answer]            <-- stop_reason != "tool_use"
 ]
```

### 15.7 Multi-turn tool conversations and implementing multiple turns

- Users submit queries needing several tools, in an unpredictable chain (example: "What day is 103 days from today?" needs `get_current_datetime`, then `add_duration_to_datetime`).
- `run_conversation` loop:
  1. call Claude with messages + tools
  2. add the assistant response to history
  3. check `stop_reason`; if it is not "tool_use", break
  4. otherwise call `run_tools`
  5. add the tool results as a user message
  6. repeat until Claude gives a final response
- Required refactors:
  1. helpers handle multiple blocks (text + tool_use)
  2. `chat` accepts a tool schemas list and returns the entire message, not just text
  3. a `text_from_message` helper extracts the text from multi-block messages
  4. the conversation loop supports sequential tool calls
- `stop_reason` = field saying why generation stopped; "tool_use" means Claude wants to call a tool.
- `run_tools`:
  1. filter `message.content` for tool_use blocks only
  2. iterate each request
  3. run the matching function by tool name/input
  4. create tool_result blocks with `type="tool_result"`, `tool_use_id=original_id`, `content=JSON_encoded_output`, `is_error=false/true`
  5. return the list of all result blocks
- `run_tool` maps tool names to functions (if statements), making it easy to scale.
- Error handling: try/catch around tool execution; on failure set `is_error=true` and put the error message in content.
- One Claude message may hold several blocks (text + multiple tool_use); handle them all.

Java sketch (illustrative, not from the course)

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Illustrative, not from the course: the run_conversation loop.
// Message/ToolUse/ToolResult types and the Llm interface are my own placeholders.
public class ToolLoop {
    public record ToolUse(String id, String name, Map<String, Object> input) {}
    public record ToolResult(String toolUseId, String content, boolean isError) {}
    public record AssistantTurn(String text, List<ToolUse> toolUses, String stopReason) {}

    public interface Llm { AssistantTurn chat(List<Object> history, String toolSchemasJson); }
    public interface Tools { String run(String toolName, Map<String, Object> input) throws Exception; }

    public static String runConversation(List<Object> history, Llm llm, Tools tools, String schemas) {
        while (true) {
            AssistantTurn turn = llm.chat(history, schemas);   // schemas sent on EVERY call
            history.add(turn);                                  // keep ALL blocks of the reply
            if (!"tool_use".equals(turn.stopReason())) {
                return turn.text();                             // final answer
            }
            List<ToolResult> results = new ArrayList<>();
            for (ToolUse tu : turn.toolUses()) {
                try {
                    results.add(new ToolResult(tu.id(), tools.run(tu.name(), tu.input()), false));
                } catch (Exception e) {
                    results.add(new ToolResult(tu.id(), e.getMessage(), true)); // is_error = true
                }
            }
            history.add(results);   // sent back as a USER message of tool_result blocks
        }
    }
}
```

### 15.8 Using multiple tools

- To add tools after the framework exists, update two places:
  1. add the schemas to the tools list in the `run_conversation` function
  2. add matching calls in `run_tool` using if/elif: `if tool_name == "ToolName": return ToolFunction(**tool_input)`
- Claude can chain tools (example: AddDurationToDateTime -> SetReminder). Each call creates separate message blocks with tool_use and tool_result pairs in history.
- Adding a new tool = add schema + add function + update the run_tool switch.

### 15.9 The batch tool

- Problem: Claude can technically emit several tool use blocks in one response, but rarely does; it sends separate sequential assistant messages with a single tool use each, creating unnecessary request rounds.
- Workaround: a batch tool that is an abstraction layer. Claude calls batch instead of the individual tools.
- Batch schema: an `invocations` parameter = a list of objects, each naming another tool and its arguments.
- Implementation: add batch to the tools list; when Claude calls it, extract `invocations`, parse each JSON arguments, call `run_tool()` for each, return the combined result as ONE tool result.
- Result: request rounds fall from N+1 to 2 (initial request + batch response).
- Insight: it "tricks" Claude into parallel execution by offering a higher-level abstraction it is more likely to use.

Java sketch (illustrative, not from the course)

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Illustrative, not from the course: run every invocation in a batch call
// and return the combined output as a single tool result.
record Invocation(String name, Map<String, Object> arguments) {}

static String runBatch(List<Invocation> invocations, ToolLoop.Tools tools) throws Exception {
    List<String> outputs = new ArrayList<>();
    for (Invocation inv : invocations) {
        outputs.add(tools.run(inv.name(), inv.arguments()));
    }
    return String.join("\n", outputs);   // one combined tool_result
}
```

### 15.10 Tools for structured data

- Alternative to prefill + stop sequences: use a tool whose input schema matches the desired output structure. More reliable, more complex setup.
- Workflow:
  1. prompt Claude to analyze data and call the provided tool
  2. provide a JSON schema whose inputs match the desired output structure
  3. Claude responds with a tool_use block holding structured arguments
  4. extract the JSON from the tool arguments; NO tool_result needs to be sent back
- Force the tool with `tool_choice = {"type": "tool", "name": "tool_name"}`.
- Setup: define the schema; update `chat` to accept `tool_choice`; pass it to `client.messages.create()`; read structured data at `response.content[0].input`.
- Advantage: more reliable. Disadvantage: more complex than prompt-based methods. Both are useful depending on complexity.

### 15.11 The text editor tool

- Claude's built-in tool for file/text manipulation: open/read files, edit ranges, add/replace text, create files, undo.
- Only the JSON SCHEMA is built into Claude, not the implementation. You write the tool function that handles Claude's text editor requests.
- A schema stub is required, depending on model version (the notes mention different date formats for Claude 3.7 and Claude 3.5). The small schema automatically expands to the full schema inside Claude.
- Implementation needs a class with methods such as `view` (file/directory contents), `string_replace`, `create_file`.
- Use cases: replicating code-editor functionality (file operations, refactoring, creating test files) when you lack a full editor but need programmatic file manipulation.
- Source gap: exact stub type strings and the tool's command names beyond those listed are not in the sources.

### 15.12 The web search tool

- Built-in tool for finding up-to-date or specialized information. Needs no custom implementation; Claude runs the search.
- Minimal schema: `type="web_search_20250305"`, `name="web_search"`, `max_uses=5`.
- `max_uses` = limit on total searches (a single search can return multiple results).
- Response blocks:
  - text blocks = Claude's framing/answers
  - server tool use blocks = the search query inputs
  - web search tool result blocks = results with title/URL
  - citation blocks = supporting text for Claude's statements
- `allowed_domains` constrains the search to specific domains (example: "NIH.gov" for medical content), improving quality by limiting to authoritative sources.
- UI practice: show text blocks as plain text; highlight search result blocks and citations separately; show source domains, titles, URLs and cited text.
- Use cases: current events, specialized knowledge, fact-checking with credible sources.

### 15.13 Quiz

- Lesson 45 (Quiz on Tool Use with Claude): not captured.
- Source gap: questions and answers missing.

Rules and traps (tool use)
- Preserve ALL blocks of an assistant message in history (text + tool_use), not just the text.
- `tool_use_id` in the result must equal the id of the tool_use block.
- Send tool schemas on every request after introducing tools.
- The tool result goes in a USER message.
- Tool loop terminates on `stop_reason` not "tool_use".
- Tool functions should raise clear errors; set `is_error=true` so Claude can retry.
- Text editor: schema built in, implementation is yours. Web search: both handled by Claude (you only configure `max_uses` / `allowed_domains`).
- Forced structured-output tools need `tool_choice` with type "tool" and the tool name; no tool_result follows.
- Batch tool reduces round trips by wrapping many calls in one.

---

## 16. Retrieval Augmented Generation (RAG)

### 16.1 Introduction

- RAG = technique for querying large documents (100-1000 pages) with LLMs.
- Option 1 (direct): put the entire document text in the prompt. Limits: token limits, reduced effectiveness with long prompts, higher cost, slower.
- Option 2 (RAG): (1) break the document into small chunks; (2) find the most relevant chunks for the question and include only those in the prompt.
- Advantages: the LLM focuses on relevant content; scales to large/multiple documents; smaller prompts are faster and cheaper.
- Disadvantages: complex preprocessing; needs a search mechanism; you must define "relevance"; no guarantee that chunks contain complete context; several chunking strategies are possible (equal portions vs header-based).
- RAG trades simplicity for scalability and efficiency.

### 16.2 Text chunking strategies

- Chunking quality drives RAG quality. Example failure: medical text about "bugs" retrieved for a software engineering question because of word overlap.
- Three strategies:
  - Size-based: equal-length strings. Easiest, most common in production. Cons: cuts words mid-sentence, lacks context. Fix: overlap (include characters from neighboring chunks); trade-off is duplication but better chunk meaning.
  - Structure-based: split on headers, paragraphs, sections. Works with formatted docs (markdown). Limitation: needs structured input; fails with plain text/PDFs.
  - Semantic-based: NLP groups related sentences/sections; most advanced; complex; not covered in detail.
- Key parameters: chunk size, overlap (characters shared between adjacent chunks), separation criteria.
- Selection depends on document structure guarantees, input format consistency, and use case.
- Default recommendation: chunk by character (most reliable across document types despite suboptimal results).

Java sketch (illustrative, not from the course)

```java
import java.util.ArrayList;
import java.util.List;

// Illustrative, not from the course: size-based chunking with overlap.
static List<String> chunkBySize(String text, int chunkSize, int overlap) {
    if (overlap >= chunkSize) throw new IllegalArgumentException("overlap must be < chunkSize");
    List<String> chunks = new ArrayList<>();
    for (int start = 0; start < text.length(); start += chunkSize - overlap) {
        chunks.add(text.substring(start, Math.min(text.length(), start + chunkSize)));
        if (start + chunkSize >= text.length()) break;
    }
    return chunks;
}
```

### 16.3 Text embeddings

- Text embedding = numerical representation of the meaning of text, produced by an embedding model.
- An embedding model takes text and outputs a long list of numbers (values range -1 to +1). Each number scores some quality of the text (the actual qualities are unknown, but it helps to imagine semantic features like happiness or topic relevance).
- Semantic search compares numerical representations rather than exact words.
- RAG flow: extract chunks -> user submits a query -> find related chunks via embeddings -> add them as context to the prompt.
- On Vertex AI the course uses Google's `text-embedding-005`, via the Google GenAI SDK: create a client, pass text through the model, get the embedding vectors.
- Limitation: we do not know what each number represents.

### 16.4 The full RAG flow

1. Text chunking: split source documents.
2. Embedding generation: chunks -> vectors.
3. Normalization: scale vectors to unit length (magnitude 1.0), typically handled automatically by embedding APIs.
4. Vector database storage: store normalized embeddings in a database optimized for vector operations.
5. Query processing: embed the user question with the SAME model used for the documents.
6. Similarity search: the vector DB finds stored embeddings most similar to the query.
7. Response generation: combine the question with the retrieved chunks in a prompt for the LLM.

- Cosine similarity = cosine of the angle between vectors; range -1 to 1 (1 very similar, -1 very different).
- Cosine distance = 1 minus cosine similarity; near 0 = very similar, larger = less similar.
- Steps 1-4 happen ahead of time; only steps 5-7 run when a user submits a query.

```
  OFFLINE                                            ONLINE
  docs -> chunk -> embed -> normalize -> vector DB   question -> embed (same model)
                                             ^                      |
                                             +---- similarity -----+
                                                   search (cosine)
                                                        |
                                    top chunks + question -> prompt -> Claude
```

Java sketch (illustrative, not from the course)

```java
// Illustrative, not from the course: cosine similarity / distance.
static double cosineSimilarity(double[] a, double[] b) {
    double dot = 0, na = 0, nb = 0;
    for (int i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
static double cosineDistance(double[] a, double[] b) { return 1.0 - cosineSimilarity(a, b); }
```

### 16.5 Implementing the RAG flow

- Five core steps in the demo:
  1. chunk with `chunk_by_section`
  2. embed each chunk with `generate_embedding`
  3. create a vector index (class `VectorIndex`, a sample vector DB); loop over chunk/embedding pairs and call `store.add_vector` with the embedding plus a metadata dictionary holding the original text
  4. embed the user question with the same `generate_embedding`
  5. `store.search(user_embedding, num_results)` returns documents with cosine distances
- The DB stores embeddings AND original text metadata (embeddings alone are not useful to developers).
- Lower cosine distance = more similar. Multiple chunks are returned for fuller context.
- Example query "What did software engineering department do last year?" returned section 2 (distance 0.71) and the methodology section (distance 0.72) as top matches.
- Limitation: some scenarios do not work well, which motivates the next lessons.

### 16.6 BM25 lexical search

- BM25 (Best Match 25) = a lexical search algorithm complementing semantic search.
- Semantic-only problem: example search "incident 2023 Q4 011" returned the right section (section 10) but also an irrelevant section 3 (financial analysis) that never mentions the incident.
- Fix: hybrid search = semantic (embeddings + vector DB) and lexical (BM25) in parallel, then merge.
- BM25 steps:
  1. tokenize the query (remove punctuation, split on spaces)
  2. count term frequency across all chunks
  3. assign importance weights (rare terms high, common terms like "a" low)
  4. rank chunks with higher-weighted terms more often
- Advantage: favors chunks with rare, specific terms ("incident 2023") over common words.
- Both systems expose similar APIs (`add_document`, `search`), which makes combining easy.

### 16.7 A multi-index RAG pipeline

- Vector index and BM25 index share identical APIs (`add_document`, `search`).
- A Retriever class wraps both: forwards the query to each and merges results. A unified interface makes adding new search methods easy.
- Reciprocal Rank Fusion (RRF):
  - Formula: Score = sum over search methods of (1 / (1 + rank))
  - Process: collect all results -> record each method's rank -> apply formula -> sort by highest score
  - Example: a doc ranked 1st in vector search and 2nd in BM25 scores higher than one ranked 2nd and 3rd.
- Benefits: better relevance than either method alone; modular; consistent API.

Java sketch (illustrative, not from the course)

```java
import java.util.*;

// Illustrative, not from the course: Reciprocal Rank Fusion using the formula
// stated in the course: score = sum(1 / (1 + rank)). Ranks start at 0 or 1 is
// not specified in the course; this sketch uses 0-based ranks.
static List<String> fuse(List<List<String>> rankedListsPerMethod) {
    Map<String, Double> scores = new HashMap<>();
    for (List<String> ranked : rankedListsPerMethod) {
        for (int rank = 0; rank < ranked.size(); rank++) {
            scores.merge(ranked.get(rank), 1.0 / (1 + rank), Double::sum);
        }
    }
    List<String> ids = new ArrayList<>(scores.keySet());
    ids.sort((x, y) -> Double.compare(scores.get(y), scores.get(x)));  // highest first
    return ids;
}
```

### 16.8 Reranking results

- Reranking = post-processing: use an LLM to reorder retrieved results by relevance.
- Process: after hybrid retrieval, pass the top results to Claude with a prompt to rank documents by relevance to the question; Claude returns a reordered list, most relevant first.
- Efficiency detail: use document IDs rather than full text: assign random IDs to chunks and ask Claude to return the ordered IDs. Documents go in the prompt in XML format; the JSON response uses prefill + stop sequences.
- Trade-off: improves accuracy but adds latency (extra LLM call). Effective when semantic understanding is needed (example: "engineering team" correctly put software engineering above cybersecurity).
- Prompt structure: user question + candidate documents + instruction to return the N most relevant in decreasing order.

### 16.9 Contextual retrieval

- Problem: chunking strips context from the original source, reducing retrieval accuracy.
- Solution: a preprocessing step where an LLM generates context for each chunk.
- Process:
  1. take a chunk plus the original source document
  2. send to Claude asking to situate the chunk within the larger document
  3. LLM generates a brief contextual description
  4. combine generated context + original chunk = contextualized chunk
  5. store the contextualized chunk in the vector/BM25 index
- Large documents that do not fit in one prompt: use selective context: include the starter chunks (1-3) for the summary/abstract, include chunks immediately before the target chunk, skip the middle chunks.
- Implementation: `add_context()` takes chunk + source text, generates the context, concatenates it with the chunk.
- Benefit: keeps document relationships and cross-references inside individual chunks.

### 16.10 Quiz

- Lesson 55 (Quiz on Retrieval Augmented Generation): not captured.
- Source gap: questions and answers missing.

Rules and traps (RAG)
- Embed the question with the same embedding model used for the documents.
- Preprocessing (chunk, embed, normalize, store) is offline; only query embedding, search and generation are online.
- Lower cosine DISTANCE = more similar; higher cosine SIMILARITY = more similar.
- Semantic search alone can return irrelevant sections for exact-term queries; add BM25 and fuse with RRF.
- Reranking trades latency for accuracy; contextual retrieval adds a preprocessing LLM call per chunk.
- Chunking by character is the default recommendation; structure-based needs structured input.

---

## 17. Features of Claude

### 17.1 Extended thinking

- Lets Claude reason before producing the final response.
- Chat UIs can display the separate thinking process. You are charged for tokens generated during thinking. It increases accuracy on complex tasks but adds cost and latency.
- When to enable: use prompt evals first; turn it on only when accuracy is still insufficient after prompt optimization.
- Response contains a thinking block + a text block. The thinking block carries a cryptographic signature to prevent tampering; Claude verifies thinking text was not modified when it is reused in conversations.
- Minimum thinking budget = 1024 tokens. `max_tokens` must exceed `thinking_budget` (recommended with a significant buffer).
- Redacted thinking blocks appear when the thinking text is flagged by safety systems; the content is provided encrypted to preserve context. A test string exists to force redacted thinking blocks for testing.
- Code: add a `thinking` parameter (default false) and a `thinking_budget` parameter (minimum 1024); include in the API params a thinking object with `type="enabled"` and `budget_tokens` set to the budget; ensure `max_tokens` is much greater than `thinking_budget`.

Java sketch (illustrative, not from the course)

```java
// Illustrative, not from the course: thinking fields as the course names them.
int thinkingBudget = 1024;                 // course: minimum 1024
int maxTokens = thinkingBudget + 4000;     // must be larger than the budget, with buffer
String thinkingParam = """
  "thinking": {"type": "enabled", "budget_tokens": %d}
  """.formatted(thinkingBudget);
// body = {... "max_tokens": maxTokens, <thinkingParam> ...}
```

### 17.2 Image support

- Up to 100 images per request, for analysis, comparison, counting and other visual tasks.
- Limits exist on image size/dimensions; images consume tokens based on pixel dimensions (height x width), cost computed by a specific equation (equation not given in the notes).
- Use image blocks in user messages with either raw base64 data or URLs to online images; multiple image blocks per message are allowed.
- Success factor: sophisticated prompting. Simple prompts typically fail.
- Techniques: provide analysis steps, guidelines, one-shot/multi-shot examples. Example step-by-step: identify objects, count methodically, verify the count with a different strategy, compare results. One-shot: show an example image with the correct answer, then the target image.
- Message structure: alternate image parts and text parts in one user message.
- Real-world example: wildfire risk assessment from satellite imagery: tree density, emergency access, roof overhang, a numerical risk score.
- Takeaway: image accuracy depends on prompt engineering quality, not just image clarity.

### 17.3 PDF support

- Claude reads PDF content directly. Code is nearly identical to images, with these changes:
  - block type "document" instead of "image"
  - media type "application/pdf" instead of "image/png"
  - variable naming `file_bytes` instead of `image_bytes`
- Extracts text, images, charts, tables and other elements. Attach the PDF, adjust the type/media, send with a text prompt.

### 17.4 Citations

- Lets Claude reference specific source documents so users know a response comes from a real source, not just model memory.
- Citation types:
  - citation page location = for PDF documents: cited text + document index + document title + start/end pages
  - citation char location = for plain text: character position within the text block
- Enable with a `citations` field containing `enabled: true` in the request along with the source document.
- Response: content becomes a list of text blocks, some containing citations arrays with location data.
- UI benefit: popups/overlays showing exactly which source text backs each statement.
- Supported: PDF documents and plain text sources.

Java sketch (illustrative, not from the course)

```java
// Illustrative, not from the course: keep citation data next to the text block it supports.
record CitedText(String text, java.util.List<Citation> citations) {}
record Citation(String citedText, String documentTitle, Integer startPage, Integer endPage,
                Integer startCharIndex, Integer endCharIndex) {} // page vs char location variants
// UI: for each CitedText, render text; on hover show citation.citedText + document title.
```

### 17.5 Prompt caching (lessons 60-62)

Concept
- Normal request: Claude does extensive internal computation on the input, generates output, then DISCARDS the work.
- Follow-ups containing previously seen messages force it to redo identical work.
- Prompt caching stores that computational work in a temporary store and reuses it when identical input appears again. Benefits: faster responses, lower cost.
- Requirement: input must be EXACTLY identical to the cached content.

Rules
- Cache duration = 5 minutes.
- Not on by default: you must add a manual cache breakpoint.
- To attach cache control you must use the LONGHAND text block: `{type: "text", text: "content", cache_control: {...}}`, not the shorthand string.
- Cache scope: everything up to and INCLUDING the breakpoint (not what comes after).
- Follow-up requests must have identical content up to the breakpoint or the cache is invalidated.
- Breakpoint locations: text blocks, image blocks, tool use, tool results, tool schemas, system prompts.
- Processing order: tools -> system prompt -> messages (joined behind the scenes).
- Up to 4 breakpoints total.
- Minimum cacheable length = 1024 tokens.
- Use cases: repeated requests with the same content, stable system prompts, unchanging tool schemas.

In action
- Tool schema caching: add `cache_control` to the LAST tool schema only. Best practice: copy the tools list first, clone the last tool, add `cache_control` type="ephemeral" (avoids mutating the originals).
- System prompt caching: convert the system string to a list with a text block carrying cache_control: `[{"type": "text", "text": system_content, "cache_control": {"type": "ephemeral"}}]`.
- Usage fields: `cache_creation_input_tokens` = tokens written to cache (first use); `cache_read_input_tokens` = tokens read from cache (later identical requests).
- Any change to cached content invalidates the cache and forces a new `cache_creation`.
- Example token counts: base message about 14 tokens, tool schemas about 1.7K, system prompt about 6.3K.
- Cache invalidation: any modification to tools/system prompt creates a completely new cache breakpoint.

```
 request = [ tools... | system prompt | messages... ]
                 ^            ^               ^
        cache_control    cache_control    cache_control   (max 4 breakpoints)
   cached prefix = everything up to and including the breakpoint
   change anything inside the prefix -> cache miss -> cache_creation_input_tokens again
```

Java sketch (illustrative, not from the course)

```java
// Illustrative, not from the course: the longhand system block the course shows.
String systemWithCache = """
[
  {"type": "text",
   "text": "%s",
   "cache_control": {"type": "ephemeral"}}
]
""".formatted(longStableSystemPrompt);
// Put cache_control on the LAST tool schema only; keep original schemas unmodified
// (copy the list, clone the last element, add the field).
```

### 17.6 Quiz

- Lesson 63 (Quiz on Features of Claude): not captured.
- Source gap: questions and answers missing.

Rules and traps (features)
- Thinking: min budget 1024; max_tokens > thinking_budget; you pay for thinking tokens; enable only after prompt evals show insufficient accuracy.
- Do not edit thinking blocks: the signature check fails on modified text.
- PDFs: type "document" and media type "application/pdf".
- Caching: 5-minute lifetime, 1024-token minimum, 4 breakpoints, longhand block required, identical content up to breakpoint, last tool schema only.
- Image prompts need techniques (steps, examples), not just a good image.
- Source gap: image size/dimension limits and the token-cost equation are mentioned but not given.

---

## 18. Model Context Protocol (MCP)

### 18.1 Introducing MCP

- MCP = communication layer that gives Claude context and tools without developers writing tedious code.
- Architecture: client-server; the server contains tools, resources and prompts.
- Main problem solved: shifts the burden of defining and running tools from YOUR server to the MCP server. You do not author schemas and functions yourself.
- An MCP server is an interface to an outside service (like GitHub) wrapping its functionality into pre-built tools.
- Anyone can create servers; service providers often publish official ones (example: AWS released its own).
- MCP vs tool use: complementary, not identical. MCP is about WHO does the work (pre-built vs custom); both involve tool usage. The common misconception comes from missing MCP's delegation aspect.

### 18.2 MCP clients

- MCP client = the communication interface between your server and the MCP server; gives access to the server's tools.
- Transport agnostic: stdin/stdout, HTTP, WebSockets, etc.
- Message types: list tools request / list tools result; call tool request / call tool result.
- Typical flow (10 steps): user queries your server -> your server asks the MCP client for tools -> client sends list tools request -> MCP server responds -> your server sends query + tools to Claude -> Claude requests tool execution -> your server asks the client to run it -> client sends call tool request -> MCP server executes (for example a GitHub API call) -> results flow back MCP server -> client -> your server -> Claude -> user.
- The client is an intermediary and does not execute tools itself.

```
 user -> Your server <-> MCP client <-> MCP server <-> outside service (e.g. GitHub)
              |
              +-> Claude  (gets user query + tool list; asks to run tools)
```

### 18.3 Project setup

- A CLI chatbot that contains both an MCP client and a custom MCP server in one project (normally you build one or the other; both here for learning).
- Documents are fake and in-memory only. Server tools: read document contents, update document contents.
- Steps: download the CLI project zip starter, extract and open, check readme.md, add the API key to `.env`, install dependencies (with or without UV), run with `uv run main.py` or `python main.py`, verify a chat prompt appears and responds.
- Source gap: the notes mention an API key in `.env` (from the generic course); how this project is pointed at Vertex rather than an API key is not stated.

### 18.4 Defining tools with MCP

- Create a server with the Python SDK (`mcp` package) in one line.
- Define tools with the `@mcp.tool` decorator (name, description, typed arguments) instead of manual JSON schemas; the SDK auto-generates the JSON schemas from decorators and types.
- Example tools: `read_doc_contents` (takes `doc_id` string, returns content from the in-memory docs dictionary) and `edit_document` (`doc_id`, `old_string`, `new_string` for find/replace).
- `Field()` from pydantic adds argument descriptions.
- Error handling: check the doc_id exists; raise ValueError if not.
- Pattern: decorator -> function -> typed params with Field descriptions -> validation -> core logic.

### 18.5 The server inspector

- MCP Inspector = in-browser debugger for testing servers without connecting an application.
- Run `mcp dev [server-file.py]` with the Python environment activated -> local server URL -> open in browser.
- Connect button starts the server; top bar shows resources, prompts, tools; Tools section lists tools; right panel manually invokes them.
- Workflow: Connect -> Tools -> List Tools -> select a tool -> enter parameters -> Run Tool -> verify output. Example: run `edit_document` then re-run `read_doc_contents` to verify.
- The UI may change as the tool is under development; core function stays similar.

### 18.6 Implementing a client

- MCP Client = a wrapper class around a client session, for resource management and cleanup.
- Client Session = the actual connection to the MCP server from the Python SDK; requires cleanup.
- Functions: `list_tools()` = `await self.session.list_tools()`, return `result.tools`; `call_tool()` = `await self.session.call_tool(tool_name, tool_input)`.
- Usage flow: app calls `client.list_tools()` -> sends to Claude -> Claude requests execution -> `client.call_tool()` -> results to Claude.
- Lifecycle handled with async context managers (connect, cleanup, async enter/exit).

### 18.7 Defining resources

- Resources = how MCP servers expose data to clients for READ operations.
- Types:
  - Direct/static: fixed URI (example: `docs://documents`).
  - Templated: parameterized URI with wildcards (example: `documents/{doc_id}`).
- Flow: client sends a read resource request with a URI -> server matches it to a defined resource function -> executes and returns data in a read resource result.
- Implementation: `@mcp.resource` decorator with URI and MIME type. MIME type is a hint about format (application/json, text/plain, ...). Templated parameters become function keyword arguments. The SDK auto-serializes returns to strings.
- Example: one resource returns the document name list (autocomplete); another returns a document by ID. Enables an `@` mention feature that inserts documents into prompts.
- Key points: one resource per distinct read operation; resources expose data, they do not modify it; the client deserializes returned data.

### 18.8 Accessing resources

- Client function reads a resource by URI, parses by MIME type, returns data.
- Imports: `json` module, `AnyURL` from pydantic (the notes' spelling).
- Flow: `await self.session.read_resource(AnyURL(uri))` -> take `results.contents[0]` -> check MIME type: if `TextResourceContents` and mime_type == "application/json" return `json.loads(resource.text)`, else return `resource.text`.
- `result.contents` is a list of resource objects with type and mime_type.
- CLI test: the resource list appears, the user selects with arrow keys/space, and the content is sent directly to Claude in the prompt without a tool call.

### 18.9 Defining prompts and prompts in the client

- MCP prompts = pre-defined, tested prompts exposed by the server for specialized tasks; server authors write high-quality domain prompts instead of users writing generic ones.
- Server: `@prompt` decorator with name and description; the function takes parameters (like a document ID) and returns a list of messages. Import: `from mcp.server.fastmcp.prompts import BaseMessage`.
- Example from the course:

```
@prompt(name="format", description="rewrites document in markdown")
def format_document(doc_id: str) -> list[BaseMessage]:
    return [BaseMessage.user(prompt_text)]
```

- Flow: client requests the prompt -> server returns the message list -> client sends to the LLM -> the LLM executes using available tools.
- Test prompts in the MCP inspector before deployment.
- Client functions: `list_prompts()` = `await self.session.list_prompts()` (return `result.props` per the notes); `get_prompt()` = `await self.session.get_prompt(prompt_name, arguments)`, return `result.messages`.
- Arguments are interpolated into the prompt function as keyword arguments; the returned messages feed straight to Claude.
- Example: Format command -> select a document -> prompt with the document ID goes to Claude -> Claude uses tools to fetch the document and reformats it.

### 18.10 MCP review: the three primitives

| Primitive | Controlled by | Purpose | Example |
|-----------|---------------|---------|---------|
| Tools | The model (Claude decides when) | Add capabilities to the model | JavaScript execution for calculations |
| Resources | The app (code decides when) | Provide data for UI or prompt augmentation | autocomplete options, document listings, Google Drive integration |
| Prompts | The user (UI buttons, menus, slash commands) | Predefined workflows, optimized conversation starters | a "format" slash command |

- Summary: tools serve the model; resources serve the app; prompts serve the users.
- Need AI capabilities -> tools; need app data -> resources; need user workflows -> prompts.

### 18.11 Quiz

- Lesson 75 (Quiz on Model Context Protocol): not captured.
- Source gap: questions and answers missing.

Rules and traps (MCP)
- MCP does not replace tool use; it delegates who writes and runs the tools.
- The MCP client does not run tools; it relays requests to the MCP server.
- Resources are read-only data exposure; actions belong in tools.
- Control pattern mnemonic: model / app / user for tools / resources / prompts.
- Templated resource URI parameters become function arguments; static URIs have none.
- `mcp dev <file>` launches the Inspector.

Java sketch (illustrative, not from the course)

```java
import java.util.List;
import java.util.Map;

// Illustrative, not from the course: the client role as a thin wrapper interface.
// Methods mirror the course's message types (list tools / call tool / read resource /
// list prompts / get prompt). This is NOT an MCP SDK API.
public interface McpClientLike extends AutoCloseable {
    List<Map<String, Object>> listTools();                              // list tools request
    String callTool(String name, Map<String, Object> input);            // call tool request
    String readResource(String uri);                                    // read resource request
    List<Map<String, Object>> listPrompts();
    List<Map<String, Object>> getPrompt(String name, Map<String, String> args); // returns messages
    @Override void close();                                             // session cleanup
}
```

---

## 19. Anthropic Apps, Claude Code and Computer Use (lessons 76-83)

Source gap: the official course notes contain NO notes for lessons 76 (Anthropic Apps), 77 (Claude Code Setup), 78 (Claude Code in Action), 79 (Enhancements with MCP Servers), 80 (Parallelizing Claude Code), 81 (Automated Debugging), 82 (Computer Use) or 83 (How Computer Use Works). The lesson pages are video-only. Only the following facts about computer use and Claude Code appear elsewhere in the notes (in the Agents sections):

- Computer use: Claude takes a screenshot after every action (typing, clicking), because it cannot predict how an action changes the environment; a button click may navigate pages or open menus, and the screenshot reveals the new state.
- Claude Code uses abstract tools (bash, web fetch, file write) rather than hyper-specialized ones such as a dedicated refactor or install tool.
- Code editing: before modifying a file the agent reads current file contents to learn its state.

Exam readiness note: do not rely on these notes for Claude Code setup, MCP-server enhancements, parallel instances or the debugging workflow; use the Claude Code course notes in this folder set instead.

---

## 20. Agents and Workflows

### 20.1 Agents and workflows overview

- Both are strategies for user tasks that cannot be completed by Claude in a single request.
- Decision rule: use workflows when you know the exact task steps ahead of time; use agents when task details are uncertain.
- Workflow = a series of calls to Claude for a specific problem where all steps are predetermined and plannable.
- Agent = letting Claude figure out how to complete the task with the tools you provide (like the tool-use examples earlier in the course).
- Example workflow: image-to-3D-model converter:
  1. Claude describes an uploaded metal-part image in detail
  2. Claude uses the CADQuery Python library to create a 3D model from the description
  3. render the model as an image
  4. Claude compares the rendering to the original image
  5. if inaccurate, return to step 2 with feedback; if accurate, output the step file
- This is the evaluator-optimizer pattern: Producer (Claude + CADQuery) creates output; Evaluator (Claude comparing images) judges it; loop until the evaluator accepts.
- Workflows are proven patterns from other engineers; you still write the implementation.

```
 Evaluator-optimizer loop
   input image -> [describe] -> [produce 3D model] -> [render] -> [evaluate vs original]
                                       ^                               |
                                       +------ feedback (inaccurate) --+
                                                       |
                                                   accurate -> output step file
```

### 20.2 Parallelization workflows

- Break one complex task into several parallel subtasks, then aggregate.
- Pattern: split into specialized parallel requests -> each focuses on ONE aspect -> an aggregator combines results.
- Example: instead of one big prompt analyzing an image and recommending the best material (metal, polymer, ceramic, ...), run separate simultaneous requests each evaluating suitability for ONE material, then feed all analyses back to Claude for the final recommendation.
- Benefits: focus (one task per request); optimization (improve/evaluate each prompt independently); scalability (add subtasks without touching others).
- Structure: Input -> multiple parallel subtasks -> aggregator -> final output.
- Best when a complex decision needs several independent criteria or options evaluated at once.

```
              +--> [assess: metal]   --+
 input image -+--> [assess: polymer] --+--> [aggregator] -> final recommendation
              +--> [assess: ceramic] --+
```

Java sketch (illustrative, not from the course)

```java
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;

// Illustrative, not from the course: fan out one request per material, then aggregate.
static String recommendMaterial(String imageRef, List<String> materials,
                                Function<String, String> assessOne,   // one Claude call per material
                                Function<List<String>, String> aggregate) { // final Claude call
    List<CompletableFuture<String>> futures = materials.stream()
        .map(m -> CompletableFuture.supplyAsync(() -> assessOne.apply(m)))
        .toList();
    List<String> analyses = futures.stream().map(CompletableFuture::join).toList();
    return aggregate.apply(analyses);
}
```

### 20.3 Chaining workflows

- Break a large task into sequential distinct steps rather than one complex prompt; each step feeds the next.
- Example: user topic -> Twitter trending search -> Claude selects the best topic -> Claude researches it -> Claude writes a script -> AI creates the video -> post to social media.
- Primary benefit: Claude focuses on one task at a time instead of juggling many requirements.
- Critical use: large prompts with many constraints where Claude keeps violating some despite repeated instructions.
- Pattern: (1) send the initial complex prompt with all constraints; (2) accept imperfect output that violates some constraints; (3) send a follow-up asking Claude to fix specific violations in its previous output; (4) Claude focuses solely on correction.
- Why it works: focused corrections beat managing many simultaneous constraints.

### 20.4 Routing workflows

- Categorize user input to choose the processing pipeline.
- Process: user input -> routing step (an AI call classifying into predefined genres/categories) -> forward to a specialized pipeline with customized prompts/tools for that category.
- Example: social media video scripts. Programming topic -> Educational category -> educational script prompt (clear explanations, definitions, examples). Surfing topic -> Entertainment category -> entertainment prompt (trendy language, engaging hooks).
- Components: predefined categories; category-specific prompts; a single routing decision determines downstream processing; each route may have different workflows/tools.
- Purpose: output style matches the nature of the input, not one-size-fits-all.

```
 topic -> [router: classify] --educational--> [educational script prompt]
                            \--entertainment-> [entertainment script prompt]
```

### 20.5 Agents and tools

- Agents = AI systems that use tools to complete tasks when exact steps are unknown. Workflows = known step sequences; agents = flexible tool combination for unknown sequences.
- Advantage: flexibility to solve many tasks with the same toolset; Claude builds plans dynamically.
- Tool abstraction principle: give abstract/general tools rather than hyper-specialized ones. Example: Claude Code uses bash, web fetch and file write, not specific refactor or install tools.
- Example with get_current_datetime, add_duration, set_reminder: "what time is it" uses one tool; "remind me gym next Wednesday" uses several plus planning.
- Dynamic interaction: agents can ask the user for more information (example: asking the warranty purchase date to compute expiration).
- Best practice: a small set of abstract tools that combine creatively, rather than many single-purpose tools.
- Real example: a social media video agent with bash/FFmpeg, generate_image, text_to_speech and post_media supports both a simple "create video" and a complex "generate sample cover first for approval".

### 20.6 Environment inspection

- Agents examine environment state after (or before) actions to understand results and progress; tool return values alone are not enough feedback.
- Computer use: a screenshot after every action because Claude cannot predict how an action changes the environment.
- Code editing: read the current file contents before modifying.
- Video agent: Whisper CPP via bash to produce timestamped captions and verify audio placement; FFmpeg to extract screenshots at intervals to verify visual output; inspect generated videos to ensure quality.
- Benefits: better progress tracking, error handling and handling of unexpected results.

### 20.7 Workflows vs agents

| Aspect | Workflows | Agents |
|--------|-----------|--------|
| Definition | Pre-defined series of Claude calls for known steps | Flexible systems using basic tools Claude combines creatively |
| Task approach | Divide a big task into smaller specific subtasks | Handle varied challenges via creative tool combination |
| Accuracy | Higher (focused, specific steps) | Lower successful-completion rates (complexity delegated) |
| Testing | Easier (known step sequence) | Harder (unpredictable paths) |
| Flexibility | Specific inputs, fixed sequence | Adapts to varied queries, can ask for more input, flexible UX |
| Reliability | More reliable | More experimental, less dependable |

- Recommendation: prioritize workflows whenever possible; use agents only when flexibility is truly required. Users want a 100% working product over a fancy but unreliable agent.

### 20.8 Quiz, final assessment, wrap-up

- Lessons 91 (Quiz on Agents and Workflows), 92 (Final Assessment Quiz) and 93 (Course Wrap-Up): not captured.
- Source gap: questions and answers missing for both quizzes and the final assessment.

Rules and traps (agents/workflows)
- Known steps -> workflow; uncertain steps -> agent.
- Evaluator-optimizer = producer + evaluator in a loop until accepted.
- Parallelization needs an aggregator; chaining feeds each step into the next; routing makes ONE classification decision that picks the downstream pipeline.
- Agents need abstract tools and environment feedback (screenshots, file reads).
- Prefer workflows for accuracy, testability, reliability.

---

## 21. Exercises and Quizzes That Appear

What the course lists (page titles) versus what was captured. Exercise and quiz pages are video/interactive pages; no instructions or answer keys were captured for any of them.

| Lesson | Page | What it tests (inferred from adjacent lessons only) | Reasoning given in sources |
|--------|------|------------------------------------------------------|----------------------------|
| 07 | Chat Exercise | Building a multi-turn chat with message list and helpers | None captured |
| 09 | System Prompts Exercise | Using the system parameter to set role/behavior | None captured |
| 11 | Course Satisfaction Survey | Feedback survey, not assessed content | n/a |
| 15 | Structured Data Exercise | Prefill + stop sequence for raw JSON/code | None captured |
| 16 | Quiz on Accessing Claude with the API | Access flow, Vertex setup, statelessness, system prompt, temperature, streaming, prefill/stop | None captured |
| 23 | Exercise on Prompt Evals | Building/running an eval with graders | None captured |
| 24 | Quiz on Prompt Evaluation | Eval workflow, dataset, model vs code graders | None captured |
| 30 | Exercise on Prompting | Applying clear/specific/XML/examples techniques with evals | None captured |
| 31 | Quiz on Prompt Engineering Techniques | The four techniques | None captured |
| 45 | Quiz on Tool Use with Claude | Tool schema, tool_use/tool_result loop, batch, tool_choice, built-in tools | None captured |
| 55 | Quiz on RAG | Chunking, embeddings, BM25, RRF, reranking, contextual retrieval | None captured |
| 63 | Quiz on Features of Claude | Thinking, images, PDFs, citations, caching | None captured |
| 75 | Quiz on MCP | Tools/resources/prompts, client/server roles | None captured |
| 91 | Quiz on Agents and Workflows | Workflows vs agents, patterns | None captured |
| 92 | Final Assessment Quiz | Whole course | None captured |

Source gap: no exercise instructions, quiz questions, answer keys or scoring thresholds were captured. The self-test in section 24 is built from the lesson content, not from the real quizzes.

---

## 22. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Calling Vertex directly from a browser or mobile client | Route through your own server; credentials never go to the client |
| Stopping after `gcloud auth login` | Also run `gcloud config set project YOUR_PROJECT_ID` and `gcloud auth application-default login` so the SDK finds default credentials |
| Not seeing an Enable button and assuming failure | No Enable button means you already have access to the model |
| Forgetting to enable the Anthropic model in Model Garden | Vertex AI dashboard -> Model Garden -> search "Anthropic" -> pick model -> Enable |
| Omitting `max_tokens`, or treating it as a target | It is required and is only a maximum safety limit |
| Expecting Claude to remember earlier turns | The API is stateless; keep the message list and resend all of it every request |
| Not appending the assistant reply before the next user turn | Add each assistant response to the list before the next user message |
| Passing `system=None` | Include `system` only when a prompt exists |
| Using high temperature for extraction or parsed output | Use near 0 for extraction/factual tasks; near 1 for creative work |
| Expecting higher temperature to always change the output | It only raises the chance of variation; try multiple runs |
| Getting commentary around JSON/code | Prefill assistant with the opening fence and set the closing fence as a stop sequence |
| Looking for the stop sequence in the output | Generated stop sequence text is excluded from the output |
| Shipping a prompt after one or two manual tests | Run it through an eval pipeline with a dataset and objective scores |
| Model grader returns middling scores (about 6) | Require strengths, weaknesses and reasoning in the grading prompt |
| Syntax grader has no way to know the expected format | Add a "format" key to each dataset item |
| Vague first line in a prompt | Start with an action verb and a clear task and output description |
| Raw interpolated text confusing the model | Wrap sections in descriptive XML tags |
| Tool schema with a one-line description | Write 3-4 sentence descriptions for the tool and each argument |
| Saving only the text of a multi-block reply | Append the whole `response.content` (all blocks) to history |
| Mismatched `tool_use_id` in a tool result | Use the exact ID from the tool_use block |
| Omitting tool schemas on follow-up requests | Include `tools` in every request once introduced |
| Sending a tool_result for a forced structured-data tool | Not needed: read `response.content[0].input` |
| Expecting the web search or text editor tools to run themselves without config | Web search: configure `max_uses` / `allowed_domains`. Text editor: only the schema is built in; you implement the functions |
| Embedding the question with a different model than the documents | Use the same embedding model for both |
| Reading cosine distance like similarity | Lower distance = more similar; higher similarity = more similar |
| Relying on semantic search alone for exact-term queries | Add BM25 and merge with reciprocal rank fusion |
| Enabling extended thinking by default | Try prompt evals first; enable only if accuracy is still insufficient |
| `max_tokens` not larger than `thinking_budget`, or budget below 1024 | Budget minimum 1024; keep `max_tokens` well above the budget |
| Using shorthand string content with cache_control | Use the longhand text block with a `cache_control` field |
| Caching content under 1024 tokens or expecting a cache after 5 minutes | 1024-token minimum; 5-minute lifetime |
| Putting cache_control on every tool schema | Put it on the LAST tool schema only (copy the list first) |
| Thinking MCP and tool use are the same thing | MCP delegates who writes and runs the tools; both are tool usage |
| Using resources to change data | Resources are read-only; use tools for actions |
| Choosing an agent when the steps are known | Use a workflow for known steps; agents only when flexibility is required |

---

## 23. Key Terms

| Term | Meaning |
|------|---------|
| Vertex AI | Google Cloud's AI platform through which this course reaches Claude |
| Model Garden | Vertex AI console area where you search "Anthropic" and enable a Claude model |
| gcloud CLI | Google Cloud command line used for init, login, project and default credentials |
| `gcloud auth application-default login` | Sets the default credentials the Anthropic SDK uses automatically for Vertex |
| Project ID | Unique identifier of your Google Cloud project; passed as `project_id` to the client |
| `anthropic[vertex]` | The pip install target for the SDK's Vertex support |
| region="global" | The region argument used when the course instantiates the Vertex client |
| Opus / Sonnet / Haiku | Intelligence-first / balanced / speed-and-cost-first model families |
| Token | Chunk of text (word, part, symbol) |
| Embedding | List of numbers representing the meaning of a token or text |
| Contextualization | Adjusting embeddings using neighboring tokens |
| max_tokens | Required cap on generation length; not a target |
| stop_reason | Why generation ended (for example "tool_use" means Claude wants a tool) |
| usage | Input/output token counts in the response |
| Message | `{role, content}` item; roles "user" and "assistant" |
| Stateless | The API stores no conversation; you resend history |
| System prompt | `system` string customizing tone, style, behavior |
| Temperature | Randomness control, 0 to 1; 0 deterministic |
| Streaming | Event stream delivering text chunks progressively |
| content_block_delta | Streaming event type carrying actual text |
| Prefill | Assistant message added last to steer and continue the response |
| Stop sequence | String in `stop_sequences` that halts generation and is excluded from output |
| Eval / prompt evaluation | Automated, objective scoring of prompts over a dataset |
| Code grader / model grader / human grader | Programmatic check / extra LLM call / manual review |
| Test case | One dataset record merged with the prompt |
| XML tags | Descriptive tags that separate content sections in a prompt |
| One-shot / multi-shot | One or several examples inside the prompt |
| Tool schema | JSON object with name, description, input_schema |
| tool_use block | Claude's request to call a tool (name + input) |
| tool_result block | Your reply: tool_use_id, content, is_error |
| tool_choice | Parameter to force a specific tool, `{"type": "tool", "name": ...}` |
| Batch tool | Wrapper tool with `invocations` list to run several tools in one round |
| Text editor tool | Built-in schema for file/text manipulation; you implement it |
| Web search tool | Built-in search tool: `type`, `name`, `max_uses`, optional `allowed_domains` |
| RAG | Retrieval Augmented Generation: retrieve relevant chunks, then prompt |
| Chunking | Splitting documents (size-, structure- or semantic-based) |
| Overlap | Characters shared between adjacent chunks |
| text-embedding-005 | Google embedding model on Vertex AI used in the course |
| Cosine similarity / distance | Angle-based similarity (-1..1) / 1 minus similarity |
| Vector database | Store optimized for embeddings plus metadata |
| BM25 | Lexical (term-weighting) search algorithm |
| Hybrid search | Semantic plus lexical search merged |
| Reciprocal Rank Fusion | Merge by summing 1/(1+rank) per method |
| Reranking | LLM reorders retrieved results by relevance (adds latency) |
| Contextual retrieval | LLM-generated context prepended to each chunk before indexing |
| Extended thinking | Reasoning-before-answer feature; `thinking` with `budget_tokens` |
| Thinking budget | Minimum 1024 tokens; `max_tokens` must exceed it |
| Redacted thinking | Encrypted thinking block when safety systems flag the text |
| Citations | `citations` with `enabled: true`; page location (PDF) or char location (text) |
| Prompt caching | Reuse of computation for identical prefixes; 5-minute lifetime |
| cache_control / ephemeral | Breakpoint marker, `{"type": "ephemeral"}`; up to 4; 1024-token minimum |
| cache_creation_input_tokens / cache_read_input_tokens | Tokens written to / read from cache |
| MCP | Model Context Protocol: client-server layer providing tools, resources, prompts |
| MCP server / client | Exposes tools/resources/prompts / relays requests between your server and the MCP server |
| Tools / Resources / Prompts (MCP) | Model-controlled / app-controlled / user-controlled primitives |
| MCP Inspector | Browser debugger started with `mcp dev [server-file.py]` |
| Static vs templated resource | Fixed URI vs parameterized URI like `documents/{doc_id}` |
| MIME type | Hint on resource data format (application/json, text/plain) |
| Workflow | Predefined series of Claude calls for known steps |
| Agent | Claude plans with provided tools when steps are unknown |
| Evaluator-optimizer | Producer plus evaluator loop until output accepted |
| Parallelization / Chaining / Routing | Fan-out and aggregate / sequential steps / classify then pick a pipeline |
| Environment inspection | Agent checks state (screenshots, file reads) after or before actions |

---

## 24. Exam-Style Self-Test

Q1. Why should API calls to Vertex AI go through your server rather than the client app?
A1. Credentials must stay secret; never expose them in client applications.

Q2. Describe the four Vertex setup steps from the course.
A2. (1) Open the Vertex AI dashboard, go to Model Garden, search "Anthropic", open the model. (2) Click Enable if the button is shown (no button = already have access). (3) Install the gcloud CLI. (4) `gcloud init`, `gcloud auth login`, then `gcloud config set project YOUR_PROJECT_ID` and `gcloud auth application-default login`.

Q3. How is the Vertex client created, and what are the required arguments to `client.messages.create()`?
A3. Install `anthropic[vertex]`, `from anthropic import vertex`, instantiate with `region="global"` and `project_id`. Required: `model`, `max_tokens`, `messages`.

Q4. Where is the generated text in the response, and what is max_tokens?
A4. `message.content[0].text`. `max_tokens` is a safety maximum on response length, not a target.

Q5. Why must you resend the whole conversation each turn?
A5. The API stores no messages; each request is stateless, so you must keep the list and send the entire history every time.

Q6. What is wrong with passing `system=None`, and what is the fix?
A6. The system parameter cannot be None; include it in the call only when a prompt exists.

Q7. What are the effects of temperature 0 versus near 1, and the suitable uses?
A7. 0 = deterministic, always the highest-probability token (extraction, factual tasks). Near 1 = more chance of lower-probability tokens (creative writing, brainstorming, marketing). Higher temperature raises the chance of variation but does not guarantee it.

Q8. How do you get raw JSON with no commentary using prefill and stop sequences?
A8. Pre-fill the assistant message with the opening delimiter (```json) and set the closing delimiter (```) as a stop sequence; Claude continues from the prefill and stops at the closing fence, which is excluded from the output. Then strip/parse.

Q9. Name the five steps of a typical eval workflow.
A9. Draft the prompt; create an evaluation dataset; run each input through the prompt and Claude; grade each output (typically 1-10) and average; modify the prompt and compare scores.

Q10. Name the three grader types and one tip for model graders.
A10. Code, model and human graders. For model graders, ask for strengths, weaknesses and reasoning, otherwise scores cluster around 6.

Q11. How does the course combine syntax and model scores, and what does each validator return?
A11. Score = (model_score + syntax_score) / 2. Each validator (JSON parse, Python AST, regex compile) returns 10 if valid and 0 on error.

Q12. Give the course's four prompt-engineering techniques and the ideas for each.
A12. Be clear and direct (action verb in the first line); be specific (Type A output guidelines, Type B step guidelines); XML tags (descriptive tag names around content); examples (one-shot/multi-shot, with ideal output and reasoning, pulling high-scoring eval cases).

Q13. What is the tool-use loop, and when does it end?
A13. Call Claude with messages + tools; append the full assistant reply; if `stop_reason` is "tool_use", run each tool_use block and send tool_result blocks (with `tool_use_id`, `content`, `is_error`) in a user message; repeat. Ends when `stop_reason` is not "tool_use".

Q14. How do you force structured JSON output via a tool, and is a tool_result needed?
A14. Define a tool whose input schema matches the desired output and set `tool_choice = {"type": "tool", "name": "tool_name"}`; read `response.content[0].input`. No tool_result is needed.

Q15. What is the batch tool for?
A15. Claude rarely emits several tool_use blocks in one response; a batch tool with an `invocations` list lets it request many calls at once, cutting rounds from N+1 to 2.

Q16. Name the steps of the full RAG flow and which are online.
A16. Chunk, embed, normalize, store in vector DB (offline); embed query, similarity search, generate response (online).

Q17. How do BM25, reciprocal rank fusion and reranking each improve RAG?
A17. BM25 adds lexical matching that weights rare terms; RRF merges ranked lists with score = sum of 1/(1+rank); reranking uses an LLM to reorder results by relevance (more accurate, adds latency). Contextual retrieval additionally prepends LLM-generated context to each chunk.

Q18. State the extended thinking and prompt caching limits.
A18. Thinking: minimum budget 1024 tokens, `max_tokens` must exceed `thinking_budget`, thinking tokens are billed, enable only after prompt evals fall short. Caching: 5-minute lifetime, 1024-token minimum, up to 4 breakpoints, longhand text block with cache_control, content identical up to the breakpoint, order tools -> system -> messages, `cache_control` on the LAST tool schema only.

Q19. What are MCP's three primitives and who controls each?
A19. Tools (the model), resources (the app), prompts (the user).

Q20. When should you use a workflow and when an agent, and what does the course recommend?
A20. Workflow when exact steps are known; agent when details are uncertain. Prioritize workflows for accuracy, testability and reliability; use agents only when flexibility is truly required.
