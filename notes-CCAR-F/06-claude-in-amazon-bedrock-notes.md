# Claude with Amazon Bedrock - Study Notes

Source: Anthropic Academy course "Claude with Amazon Bedrock" (site slug: claude-in-amazon-bedrock; 83 lesson pages). The site's own full-course notes (63 note blocks) are the primary source. The numbered lesson pages contain only video-player noise and quiz headers (question counts only), so nothing extra could be merged from them.

Conventions used in these notes
- "The course says" facts come from the official course notes. Anything not found there is flagged "Source gap:".
- Java snippets use only java.net.http.HttpClient ideas, records, enums and my own small interfaces. No AWS SDK for Java or Anthropic class/method names are used or implied. Every snippet is labelled "illustrative, not from the course".
- The course's code is Python with boto3. Parameter names such as `modelId`, `messages`, `system`, `inference_config`, `stop_sequences` are quoted as the course states them. The raw Bedrock REST endpoint, request signing, exact tool-config parameter name and exact JSON key casing on the wire are NOT stated in the course; they appear only as placeholders.
- No model IDs, region lists, quotas, IAM policy details or prices are given by the course beyond what is quoted below ("US West 2" is the only region example).

---

## 1. Big Picture

- This is the Amazon Bedrock edition of the general Claude API course. The teaching arc (API basics, evals, prompt engineering, tool use, RAG, Claude features, MCP, Claude Code, computer use, agents) is the same; what changes is HOW you reach Claude: through the AWS Bedrock service, using a boto3 Bedrock runtime client, not the Anthropic API.
- Critical distinction the course stresses: the AWS Bedrock API is NOT the Anthropic API. Same Claude models (Sonnet, Haiku), but different service, different SDKs, different documentation. Use Bedrock-specific resources.
- A request needs three things: a boto3 client for the Bedrock runtime service (with a region such as US West 2), a model ID (in practice an inference profile ID), and a user message object.
- You call `client.converse(modelId=..., messages=[...])` and read the text at `response["output"]["message"]["content"][0]["text"]`.
- The API is stateless: your code stores the full message list and resends it every request. Roles must alternate user, assistant, user, assistant.
- Optional levers on converse: `system`, `inference_config` (temperature, stop_sequences), assistant prefill, a streaming variant (converse stream), tools, thinking, cache points, images.
- You do not ship a prompt without measuring it: the course builds an eval pipeline (dataset, prompt run, grader, average score) and uses it to score each prompt-engineering technique.
- Tool use: Claude returns stop_reason "tool_use", your server runs the tool, you send back a tool result part, loop until stop_reason is not "tool_use".
- RAG: chunk, embed, vector search, plus BM25, reciprocal rank fusion, LLM reranking and contextual retrieval.
- MCP moves tool schema and function authoring to an MCP server (tools, resources, prompts). The course ends with Claude Code, computer use and qualities of agents.

```
  AWS SIDE (setup, from the course)                YOUR APP SIDE
  ---------------------------------                -----------------------------
  Bedrock console                                  Browser / app
   - model catalog (NOT where IDs are                 |  user text
     found for this course)                           v
   - "cross region inference"  ----> inference    Your server
     profile ID (use THIS as modelId)               (boto3 Bedrock runtime client,
                                                     region e.g. US West 2)
                                                      |  converse(modelId, messages,
                                                      |     system, inference_config, ...)
                                                      v
                                                  AWS Bedrock  --->  Claude model
                                                      ^                 |
                                                      |                 | assistant message
                                                      +-----------------+ (+ stop_reason,
                                                                          usage)

  COURSE ARC
  API basics -> Evals -> Prompt engineering -> Tool use -> RAG
     -> Features (thinking, images, caching) -> MCP -> Claude Code,
        computer use, agents
```

---

## 2. Introduction and Claude Models (lessons 01-02)

Key ideas
- Lesson 01 (Introduction to the course) and lesson 02 (Overview of Claude models) are video lessons.

Source gap: the official notes have no note block for lessons 01 and 02 and the lesson pages contain only player noise. Model family comparisons, model IDs and capability tiers are therefore not recorded here. The only model facts in the sources: Claude models (Sonnet, Haiku) are hosted on both AWS Bedrock and the official Anthropic API; the course uses Haiku for dataset generation because it is "faster/cheaper".

---

## 3. Accessing the API (lesson 03)

Key ideas
- Chat bot flow: user submits text -> your server receives the request -> the Bedrock client makes an API call to AWS Bedrock -> the request includes the user message plus the model ID -> the model generates text -> an assistant message comes back -> your server sends the response to the browser.
- Key API components: user message (input text), model ID (which model), assistant message (generated output).
- Course focus: communication between the Bedrock client and the Bedrock service, API requests, text access and design patterns.
- Claude is hosted on both AWS Bedrock and the Anthropic API, but here you access it through AWS Bedrock.

Rules and traps
- Trap: reading Anthropic API docs or SDK examples and expecting them to work on Bedrock. Different services, different SDKs, different docs.
- The browser never talks to Bedrock directly in the flow shown; your server does.

```
  Browser --text--> Your server --(user msg + model ID)--> Bedrock --> Claude
  Browser <--text-- Your server <------(assistant msg)---- Bedrock <-- Claude
```

---

## 4. Making a Request (lesson 04)

Key ideas
- Three requirements for a request:
  1. Boto3 client connected to the Bedrock runtime service (specify a region such as US West 2).
  2. Model ID: identifier of the model to run.
  3. User message: a specially formatted object containing the input text.
- Message shape (as the course states it):
  - User message = `{"role": "user", "content": [{"text": "your input"}]}`
  - Assistant message = same structure with `role` = "assistant".
  - `content` is a list because a message can have multiple parts (for example text plus images).
- Call: `client.converse(modelId="profile_id", messages=[user_message])`.
- Response text: `response["output"]["message"]["content"][0]["text"]`.

Model ID and inference profiles
- Not all models are hosted in every region. Wrong region gives cryptic error messages.
- Inference profiles route requests to regions where the model actually exists.
- Use the inference profile ID instead of the direct model ID for guaranteed routing.
- Find it in the AWS console under "cross region inference", NOT under "model catalog".

Rules and traps
- Trap: copying a model ID from the model catalog, then getting a cryptic error because the model is not in your region.
- Fix: use the inference profile ID from the cross region inference page.
- Message types: user message = input to the model; assistant message = model-generated response.

Java snippet (illustrative, not from the course). Plain HttpClient with a placeholder URL; the real endpoint, signing and JSON key casing are not stated in the course, so treat the body as a shape sketch only.

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ConverseSketch {
    public static void main(String[] args) throws Exception {
        // PLACEHOLDER: real Bedrock runtime URL and AWS request signing are NOT in the course.
        String url = "https://<bedrock-runtime-endpoint-for-your-region>/<converse-path>";
        String inferenceProfileId = "<inference-profile-id-from-cross-region-inference>";

        // Shape from the course: role + content list of parts, each part {"text": ...}.
        String body = """
            {
              "modelId": "%s",
              "messages": [
                { "role": "user", "content": [ { "text": "Hello" } ] }
              ]
            }
            """.formatted(inferenceProfileId);

        HttpRequest req = HttpRequest.newBuilder(URI.create(url))
            .header("Content-Type", "application/json")
            // signing headers would go here (not covered by the course)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> resp = HttpClient.newHttpClient()
            .send(req, HttpResponse.BodyHandlers.ofString());

        // Course path to the text: response["output"]["message"]["content"][0]["text"]
        System.out.println(resp.body());
    }
}
```

---

## 5. Multi-Turn Conversations (lesson 05; exercise lesson 06)

Key ideas
- Multi-turn conversation = several back-and-forth exchanges that keep context.
- Bedrock/Claude APIs are stateless: they store no messages or responses.
- Two requirements:
  1. Manual message management: keep the complete list of exchanged messages in your code.
  2. Full context transmission: send the entire history with every follow-up request.
- Messages are a list of alternating user/assistant roles. Never two consecutive messages with the same role. Pattern: user, assistant, user, assistant.
- Implementation approach in the course: helper functions to add user and assistant messages to the list; include previous messages and responses in each new call; build history incrementally.
- Example: send "what's 1+1?" -> "2"; add both to the list; send the full list plus "and three more" -> "5".
- Without history, follow-ups produce nonsensical replies because the model lacks context.

Rules and traps
- Trap: assuming the service remembers the conversation. It does not.
- Trap: appending two user messages in a row, or two assistant messages in a row.
- Cost note implied by the design: every turn resends the whole history (which is why prompt caching, section 20, matters).

Java snippet (illustrative, not from the course):

```java
import java.util.ArrayList;
import java.util.List;

public class Conversation {
    public record Message(String role, String text) {}

    private final List<Message> history = new ArrayList<>();

    private void add(String role, String text) {
        // Enforce the course rule: never two consecutive messages with the same role.
        if (!history.isEmpty() && history.get(history.size() - 1).role().equals(role)) {
            throw new IllegalStateException("Roles must alternate user/assistant");
        }
        history.add(new Message(role, text));
    }

    public void addUser(String text)      { add("user", text); }
    public void addAssistant(String text) { add("assistant", text); }

    /** The whole list is what you send on EVERY request (API is stateless). */
    public List<Message> snapshot() { return List.copyOf(history); }
}
```

Source gap: the Chat bot exercise (lesson 06) was not captured; only the multi-turn concept above is known.

---

## 6. System Prompts (lesson 07; exercise lesson 08)

Key ideas
- System prompt = instructions that assign a role to the model to guide its responses.
- Passed to converse using the `system` keyword parameter.
- Purpose: make the model "pretend" to have a specific job or role instead of listing explicit do and don't rules.
- Course example: "You are an AWS cloud support specialist" makes the model respond like a real support specialist, automatically avoiding competitor mentions and refusing non-cloud questions.
- Technical requirements: the system prompt must have at least 1 character; it is passed as a list containing a dictionary with a text field (shape like `[{"text": "..."}]`).
- Benefit: role-based responses enforce constraints more naturally than rule lists and handle edge cases automatically.
- Best practice: make the system prompt parameter optional in your chat function (default none) to avoid empty-string errors and keep the function reusable.

Rules and traps
- Trap: passing an empty string as the system prompt. It must be at least 1 character.
- Trap: passing a plain string rather than a list with a text dictionary.
- Fix: default to none and only add the `system` parameter when a prompt exists.

Java snippet (illustrative, not from the course):

```java
import java.util.Optional;

public class SystemPromptSketch {
    /** Returns the JSON fragment for "system", or empty if there is no prompt. */
    static Optional<String> systemFragment(String systemPrompt) {
        if (systemPrompt == null || systemPrompt.isEmpty()) {
            return Optional.empty(); // never send an empty system prompt (min 1 char)
        }
        // Course shape: a list holding a dictionary with a "text" field.
        // (A real implementation must JSON-escape the text.)
        return Optional.of("\"system\": [ { \"text\": \"" + systemPrompt + "\" } ]");
    }
}
```

Source gap: the System prompt exercise (lesson 08) was not captured.

---

## 7. Temperature (lesson 09)

Key ideas
- Temperature = decimal parameter from 0 to 1 that controls randomness in token selection.
- Text generation has three stages: tokenization (break input into chunks), prediction (assign probabilities to possible next tokens), sampling (pick a token based on the probabilities).
- Temperature 0 = deterministic; always picks the highest-probability token.
- Higher temperature raises the chance of picking lower-probability tokens.
- Default temperature = 1.0 (maximum creativity).
- Low temperature (near 0): data extraction, factual tasks, consistent output.
- High temperature (near 1): creative writing, brainstorming, jokes, marketing.
- Implementation: pass `temperature` inside `inference_config` when calling converse.
- Lower temperature gives more similar, predictable responses; higher gives more varied ones.

Rules and traps
- Trap: leaving the default (1.0) for extraction or classification, which makes results vary run to run.
- Trap: believing temperature 0 changes quality; it only changes how deterministic the sampling is.

```
  temperature 0  <------------------------------------>  temperature 1
  deterministic, factual, extraction                      varied, creative, brainstorming
```

---

## 8. Streaming (lesson 10)

Key ideas
- Problem: users expect immediate feedback, but a full response takes 3-30 seconds.
- Solution: the Converse Stream function streams generated text as the model produces it.
- Flow:
  1. User submits a question; server sends the request to Bedrock via converse stream.
  2. An immediate initial response arrives (no text, just an acknowledgment).
  3. A stream of events follows, carrying pieces of the generated response.
  4. Each event contains a small text chunk that you forward to the browser/app.
  5. The user sees the response build in real time.
- Event types, in order: message start (first), content block delta (carries the text chunks), content block stop, message stop, metadata (last).
- The response has a `stream` key holding an event stream (generator). Iterate it.
- Only content block delta events matter for text. Chunk location: `event['content_block_delta']['delta']['text']`.
- Collect chunks if you also need the full message afterwards.

Course code pattern (Python, kept as stated):

```
for event in response['stream']:
    if 'content_block_delta' in event:
        chunk = event['content_block_delta']['delta']['text']
        # Send chunk to user interface
        total_text += chunk
```

Rules and traps
- Trap: treating every event as text. Only content block delta events carry text; the others are lifecycle markers (start, stop, metadata).
- Trap: forgetting to accumulate chunks when you need the complete assistant message for history (section 5).

Java snippet (illustrative, not from the course). The event model here is my own record; the course names only the event types and the delta text location.

```java
import java.util.List;
import java.util.function.Consumer;

public class StreamSketch {
    // Own illustrative type. "kind" mirrors the course's event names.
    public record StreamEvent(String kind, String deltaText) {}

    static String consume(List<StreamEvent> events, Consumer<String> sendToBrowser) {
        StringBuilder total = new StringBuilder();
        for (StreamEvent e : events) {
            if ("content_block_delta".equals(e.kind())) {   // only these carry text
                sendToBrowser.accept(e.deltaText());          // forward immediately
                total.append(e.deltaText());                  // keep for history
            }
            // message start / content block stop / message stop / metadata: ignore for text
        }
        return total.toString();
    }
}
```

---

## 9. Controlling Model Output (lesson 11)

Key ideas
- Two techniques: pre-filling assistant messages and stop sequences.
- Pre-filling: manually add an assistant message at the END of the message list to steer direction. Claude sees a partial assistant response, assumes it already wrote it, and continues from the exact endpoint (not from the beginning).
- You must concatenate the pre-filled text with the returned response to get the complete output.
- Stop sequences: strings that force generation to stop immediately when encountered. Passed as a parameter to converse (via `inference_config` as `stop_sequences`). Several sequences can be given. Generation halts at the first match; the stop sequence itself is NOT in the returned text.
- Both techniques influence output strongly, beyond prompt wording alone.
- Implementation: add a `stop_sequences` parameter to the chat function and pass it into `inference_config`; pre-filling requires building the message list manually with an assistant role.

Rules and traps
- Trap: forgetting that the response continues after the prefill, so the visible text lacks the prefill.
- Fix: output = prefill + returned text.
- Trap: expecting the stop string to appear in the output. It is excluded.

```
  messages: [ user: "..." , assistant: "PREFILL"  <-- last message, model continues here ]
  model returns:  "...continuation..."   (stops at first stop sequence, which is dropped)
  full answer  =  "PREFILL" + "...continuation..."
```

---

## 10. Structured Data (lesson 12; exercise lesson 13)

Key ideas
- Structured data generation = prefill + stop sequence to extract only the wanted content, with no commentary.
- Problem: Claude naturally adds headers, footers and explanations around JSON, Python or lists, but apps need the raw content.
- Pattern:
  1. Pre-fill the assistant message with the opening delimiter (for example a json code fence).
  2. Set the stop sequence to the closing delimiter (the closing code fence).
  3. Claude assumes it already wrote the opening, generates only the content, stops at the closing delimiter.
- Example: user "generate JSON rule"; assistant prefill = opening fence with `json`; stop sequence = closing fence; output = raw JSON only.
- Works for any structured format, not only JSON.

Java snippet (illustrative, not from the course). Body shape sketch only; key names for the stop-sequence setting follow the course wording (`inference_config`, `stop_sequences`).

```java
public class PrefillStopSketch {
    static final String FENCE = "```";

    static String body(String userText) {
        // Last message is the assistant PREFILL; stop sequence is the closing fence.
        return """
            {
              "messages": [
                { "role": "user",      "content": [ { "text": "%s" } ] },
                { "role": "assistant", "content": [ { "text": "%sjson" } ] }
              ],
              "inference_config": { "stop_sequences": [ "%s" ] }
            }
            """.formatted(userText, FENCE, FENCE);
    }
    // Returned text is already raw JSON (no closing fence, no commentary).
    // Remember the prefill is not part of the returned text.
}
```

Source gap: the Structured data exercise (lesson 13) and "Quiz on working with the API" (lesson 14, 4 questions) were not captured beyond the question count.

---

## 11. Prompt Evaluation (lessons 15-22)

### 11.1 Why evaluate (lesson 15)
Key ideas
- Prompt engineering = techniques for writing and editing prompts so Claude understands the request and the desired response.
- Prompt evaluation = automated testing of prompts with objective metrics to measure effectiveness.
- Three paths after writing a prompt:
  1. Test once or twice, then use in production (trap).
  2. Test with custom inputs and make minor tweaks (trap).
  3. Run through an evaluation pipeline for objective scoring (recommended).
- Paths 1 and 2 are common traps: engineers do not test prompts enough for serious applications.
- Recommended process: write prompt -> evaluation pipeline -> objective score -> iterate -> optimize.
- Evaluation comes before engineering in the workflow, to establish a measurement baseline before optimizing.

### 11.2 A typical eval workflow (lesson 16)
Key ideas
- No standard methodology; many open source and paid tools exist. You can start simple and scale up.
- Steps:
  1. Initial prompt draft (baseline).
  2. Evaluation dataset: test inputs, hand-crafted or AI-generated, from tens to thousands of records.
  3. Prompt execution: feed each dataset input through the prompt to get responses.
  4. Grading: score each response (typically 1-10 where 10 = perfect).
  5. Averaging: compute the overall score across all test cases.
  6. Iteration: change the prompt and repeat.
- Comparison: run several prompt versions through the same pipeline and compare average scores.
- Objective: a quantitative way to measure improvement instead of subjective impressions.
- A lightweight custom implementation is enough to start; no heavy enterprise solution needed.

```
  prompt draft
      |
      v
  dataset (inputs) --> run prompt on each --> LLM output --> grader (1-10)
      ^                                                          |
      |                                                          v
      +------- modify prompt <------------------------ average score
```

### 11.3 Generating test datasets (lesson 17)
Key ideas
- Project goal: a prompt that accepts a user task and outputs one of three formats: Python code, JSON configuration, or a regular expression (no extra explanation or formatting). The domain is AWS-related tasks.
- Evaluation dataset = JSON objects with task properties fed into the prompt.
- Dataset generation: manual assembly, or automatic generation with an LLM.
- Steps:
  1. Draft prompt (V1: "please provide solution to following task").
  2. Generate the dataset with the Haiku model (faster and cheaper for dataset generation).
  3. Write a `generate_dataset()` function with a lengthy prompt asking for AWS-related tasks.
  4. Use the JSON extraction technique: pre-filled assistant message plus stop sequences.
  5. Parse the JSON and return structured data.
  6. Save the dataset to a JSON file for reuse.
- Uses an inference profile for the Haiku model. Requests an array of objects with task properties. The demo generates 3 test cases (real use needs many more). Dataset structure evolves later in the course.

### 11.4 Running the eval (lesson 18)
Key ideas
- Test case = one record from the dataset.
- Three functions form the pipeline core:
  - run prompt: takes a test case, merges with the template, sends to Claude, returns output. V1 prompt: "please solve the following task [test_case_task]"; no output formatting constraints yet.
  - run test case: calls run prompt, grades the result (placeholder hardcoded score of 10 at this stage), returns a dictionary with output, test_case and score.
  - run eval: loads the dataset, loops all test cases, assembles a list of results.
- Runtime: about 31 seconds with Haiku for the full (small) dataset. Speed optimizations exist.
- Output: array of objects, each with Claude's output (verbose, unformatted), the original test case and the score.
- Limitations at this point: verbose responses (no formatting in prompt), hardcoded score. Next step: real graders.

Java snippet (illustrative, not from the course). The three-function eval skeleton; `Llm` and `Grader` are my own interfaces, not any SDK.

```java
import java.util.ArrayList;
import java.util.List;

public class EvalSketch {
    public record TestCase(String task, String format) {}
    public record Result(String output, TestCase testCase, double score) {}

    interface Llm    { String complete(String prompt); }
    interface Grader { double grade(TestCase tc, String output); } // 0-10

    static String runPrompt(Llm llm, TestCase tc) {
        // V1 prompt from the course (no formatting constraints yet)
        return llm.complete("please solve the following task " + tc.task());
    }

    static Result runTestCase(Llm llm, Grader grader, TestCase tc) {
        String out = runPrompt(llm, tc);
        return new Result(out, tc, grader.grade(tc, out));
    }

    static List<Result> runEval(Llm llm, Grader grader, List<TestCase> dataset) {
        List<Result> results = new ArrayList<>();
        for (TestCase tc : dataset) results.add(runTestCase(llm, grader, tc));
        return results;
    }

    static double average(List<Result> rs) {
        return rs.stream().mapToDouble(Result::score).average().orElse(0);
    }
}
```

### 11.5 Grading: model, code and human (lessons 19-20)
Three grader types
- Code graders: programmatic checks (length, syntax, keywords, readability scores).
- Model graders: extra API calls to judge quality, instruction following, completeness.
- Human graders: manual evaluation; flexible but time-consuming.

Model-based grading (lesson 19)
- Process: take the original output; feed it to an evaluation model with a detailed prompt; request reasoning plus a score (typically 1-10); return a structured assessment.
- Criteria must be defined upfront.
- Ask for reasoning, strengths and weaknesses to avoid default middling scores.
- JSON response format with pre-filled assistant messages for clean parsing.
- Average scores across test cases for an objective metric.
- Common criteria: format compliance, syntax validation, task completion accuracy, general response quality.
- Model graders handle subjective quality that code graders cannot.

Code-based grading (lesson 20)
- Automated validation for outputs that are code or structured data.
- Components:
  - `validate_json()`: parses with `json.loads()`, returns 10 if valid else 0.
  - `validate_python()`: parses using AST, returns 10 if valid else 0.
  - `validate_regex()`: compiles the pattern, returns 10 if valid else 0.
  - `grade_syntax()`: router that picks the validator by the test case format.
- Requirements:
  - Dataset must include a "format" key naming the expected output type (JSON/Python/regex).
  - Prompt template updated to "respond only with Python, JSON, or plain regex, no comments".
  - Assistant message pre-filled with a code fence to force raw code; stop sequence = closing fence.
  - Final score = (model_score + syntax_score) / 2.
- Mechanism: try/catch parsing; successful parse = full score, parse error = zero.

Rules and traps
- Trap: relying on only a model grader; add cheap deterministic checks for format and syntax.
- Trap: a model grader prompt without reasoning/strengths/weaknesses gives default middling scores.
- Trap: forgetting the "format" key in the dataset, so the router cannot choose a validator.

Java snippet (illustrative, not from the course). Syntax graders in Java: the course's Python AST check has no direct equivalent here, so it is left as a comment; the JSON parser is any parser you already use.

```java
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

public class CodeGraders {
    interface JsonParser { void parse(String s) throws Exception; } // plug in your own parser

    static int validateJson(JsonParser p, String out) {
        try { p.parse(out); return 10; } catch (Exception e) { return 0; }
    }

    static int validateRegex(String out) {
        try { Pattern.compile(out.trim()); return 10; }
        catch (PatternSyntaxException e) { return 0; }
    }

    static int validatePython(String out) {
        // Course uses Python's AST parser. In Java you would shell out to a Python
        // syntax checker or skip this format; deliberately not implemented here.
        throw new UnsupportedOperationException();
    }

    // Router keyed on the dataset's "format" key, as in the course's grade_syntax().
    static int gradeSyntax(String format, String out, JsonParser p) {
        return switch (format.toLowerCase()) {
            case "json"  -> validateJson(p, out);
            case "regex" -> validateRegex(out);
            case "python"-> validatePython(out);
            default      -> throw new IllegalArgumentException("unknown format " + format);
        };
    }

    // Course: final score = (model_score + syntax_score) / 2
    static double finalScore(double modelScore, double syntaxScore) {
        return (modelScore + syntaxScore) / 2.0;
    }
}
```

Source gap: "Exercise on prompt evals" (lesson 21) and "Quiz on prompt evaluations" (lesson 22, 7 questions) were not captured beyond the question count.

---

## 12. Prompt Engineering (lessons 23-29)

### 12.1 The process (lesson 23)
Key ideas
- Prompt engineering = improving written prompts for more reliable, higher quality outputs.
- Process: (1) set a goal; (2) write an initial version (usually poor); (3) evaluate; (4) apply techniques iteratively; (5) re-evaluate after each improvement.
- Example goal: generate a one-day meal plan for athletes from height, weight, goals and dietary restrictions.
- Evaluation setup: a flexible pipeline with a prompt evaluator class; supports concurrency (tune to rate limits); generates test datasets from specified inputs and criteria; writes an `output.html` report.
- Components: `prompt_inputs` (dictionary of variables interpolated into the prompt); `run_prompt` function (executes once per test case); `extra_criteria` (additional validation requirements for model grading). Dataset generation needs a prompt purpose description, input specifications and number of test cases.
- Baseline scores are typically poor; each technique is followed by a re-eval.

### 12.2 Being clear and direct (lesson 24)
- Use simple, direct language with an action verb in the FIRST line. The first line is the most important part of the prompt.
- Action verbs: write, generate, create, identify, analyze.
- Examples from the course: "Write three paragraphs about how solar panels work"; "Identify three countries that use geothermal energy and include generation stats for each"; "Generate a one day meal plan for an athlete that meets their dietary restrictions".
- Structure: action verb + specific task + output expectations.
- Result in the example: score improved from 2.32 to 3.92.

### 12.3 Being specific (lesson 25)
- Add guidelines to direct output. Two types:
  - Type A: list qualities or attributes of the output (length, structure, format).
  - Type B: give step-by-step process for the model to follow (forces it to consider specific elements; improves reasoning).
- Both can be combined in professional prompts.
- When to use: Type A almost always, for any prompt. Type B for complex problems needing a broader perspective or extra viewpoints the model would not consider by itself.
- Result in the example: 3.92 to 7.86.

### 12.4 Structure with XML tags (lesson 26)
- Wrap content sections in descriptive custom tags such as `<sales_records></sales_records>`, `<my_code></my_code>`, `<docs></docs>`.
- Purpose: help the model tell content types apart when large amounts of text are interpolated.
- Tag naming: specific and descriptive ("sales_records" better than "data").
- Use when a prompt has multiple large blocks that could be confused (code vs docs, data vs instructions). Also useful for small content to mark it as external input.
- Example: athlete information (height, weight, goals, restrictions) wrapped in `<athlete_information></athlete_information>`.

### 12.5 Providing examples (lesson 27)
- One-shot = one example; multi-shot = several.
- Wrap examples in XML tags; include sample input and ideal output.
- Uses: corner cases (for example sarcasm detection), complex output formats (JSON structures), consistency.
- Corner cases: warn the model about the scenario, then show an example of correct handling.
- For formats: show complex structures by example rather than only describing them.
- Optimization via evals: take the highest-scoring outputs from testing, use them as examples, optionally with the reasoning why each is ideal. Explaining why reinforces the behavior.

Rules and traps
- Trap: starting with a vague first line instead of an action verb plus task.
- Trap: generic tag names like "data".
- Trap: skipping the re-eval after each technique; you then cannot tell which technique helped.

```
  Prompt skeleton (illustrative):
    <verb> <specific task> <output expectations>        <- first line
    guidelines: qualities (Type A), steps (Type B)
    <athlete_information> ... </athlete_information>    <- external input in tags
    <example> <input>...</input> <ideal_output>...</ideal_output> </example>
```

Java snippet (illustrative, not from the course):

```java
public class PromptBuilder {
    static String mealPlanPrompt(String athleteInfo) {
        return """
            Generate a one day meal plan for an athlete that meets their dietary restrictions.

            Guidelines:
            - Include calorie and macro totals.   (Type A: output qualities)
            Steps:
            1. Consider the athlete's goals.      (Type B: process)
            2. Check every dietary restriction.

            <athlete_information>
            %s
            </athlete_information>
            """.formatted(athleteInfo);
    }
}
```

Source gap: "Exercise on prompting" (lesson 28) and "Quiz on prompt engineering" (lesson 29, 4 questions) were not captured beyond the question count.

---

## 13. Tool Use (lessons 30-42)

### 13.1 Introducing tool use (lesson 30)
- Tool use lets Claude access external information beyond its training data (for example current weather).
- Flow:
  1. Send request to Claude plus tool instructions.
  2. Claude requests specific external data.
  3. Your server runs code to fetch it from external APIs.
  4. Send the fetched data back to Claude.
  5. Claude produces the final response using it.
- Weather example: user asks -> Claude requests weather data -> server calls weather API -> Claude receives it -> Claude replies.
- Challenge: implementation order differs from logical flow. You typically write tool function -> JSON schema -> tool result handling -> include schema in request. Keep the flow diagram handy.

```
  user --> server --(msg + tool schemas)--> Claude
                                              |  stop_reason = "tool_use"
  server <--- assistant msg with tool_use part
  server runs the function (weather API ...)
  server --(history + tool_result part + schemas)--> Claude --> final answer
```

### 13.2 Tool functions (lesson 31)
- Tool functions are plain functions that Claude asks you to call for things it cannot do natively: it does not know the exact current time, is imperfect at time-based calculations, and cannot actually set reminders.
- The example project has 3 tools: `get_current_datetime`, `add_duration_to_date`, `set_reminder`.
- Best practices: descriptive argument names (critical for Claude's understanding); validate inputs and raise errors on invalid data; write plain functions that return useful data.
- Creation process: (1) write the function; (2) create the JSON schema spec; (3) register with Claude; (4) test integration.
- Example: `def get_current_datetime(date_format="%Y%m%d%H%M%S"): return datetime.now().strftime(date_format)`.

### 13.3 JSON schema for tools (lesson 32)
- JSON Schema is a general data validation format, not specific to LLMs. A tool schema has two parts: name and description at the top, and a JSON object defining the function parameters.
- Creation process:
  1. Make a dictionary with the function arguments as keys and sample data as values.
  2. Convert to JSON (Python True becomes JSON true).
  3. Use an online "JSON to JSON schema converter".
  4. Remove the `$schema` statement from the output.
  5. Add a `description` to each property.
- Descriptions: overall tool description = 3-4 sentences covering what it does, when to use it and what data it returns; property descriptions = detailed purpose of each argument. You can ask Claude to generate descriptions by pasting the function code.
- The schema is sent to Claude in requests.

### 13.4 Handling tool use responses (lesson 33)
- The response has a `stop_reason` key; `stop_reason = "tool_use"` means the model wants to call a tool.
- The assistant message `content` is a list of parts: a text part (helpful message to the user) and a tool_use part (instruction for you to run a tool).
- Tool use part fields: `tool_use_id` (unique tracking id), `name` (exact tool name from the schema), `input` (dictionary of arguments).
- Follow-up requests must include the entire history: original user message, the complete assistant message (all parts), and tool result parts.
- Implementation changes: chat() returns text and parts (not just text); add_assistant_message() and add_user_message() accept a string or a list of parts; the `content` parameter replaces the `text` parameter.
- Tool choice configuration:
  - `auto`: Claude decides whether to use tools (default).
  - `any`: forces Claude to use some available tool.
  - `{tool: {name: "tool_name"}}`: forces a specific tool (useful for testing).

### 13.5 Running tool functions (lesson 34)
- Extract tool use parts by filtering message parts for dictionaries with a "tool_use" key.
- Claude can send MULTIPLE tool use requests in parallel in one message. Extract `tool_use_id`, `name`, `input` from each.
- Execution function: match the tool name to the real function; splat the input dictionary into it (`**tool_input`); raise an exception for unknown tool names; return the output.
- Tool result part shape: `{tool_result: {tool_use_id, content: [text output], status: success/error}}`.
- The tool use ID links each request to its result when several run in parallel.
- Error handling: wrap execution in try/except and return an error status (with the message in content) instead of failing. Claude can analyze the error and may retry with corrected arguments.
- Output processing: JSON-serialize tool outputs to strings. Final step: return the list of tool result parts.

### 13.6 Sending tool results (lesson 35)
- Add the assistant message (with the tool use requests) to history, then add a user message holding the tool result parts.
- The final API call sends the complete message history PLUS the original tool schemas. Without schemas Claude gets confused about the tool definitions.
- Conversation structure: user message -> assistant message (tool requests) -> user message (tool results) -> assistant response.
- Verification: Claude shows real-time data it could not have otherwise (for example the current time, not just the date).

### 13.7 Multi-turn conversations with tools (lesson 36)
- Pattern: check `response.stop_reason`; if not "tool_use", the conversation is complete; if "tool_use", process the requests and loop.
- chat returns the parts list, stop_reason and text. A `run_conversation` function holds the while loop.
- Only process tool requests when stop_reason says so, to avoid adding empty tool-result messages.
- Course pseudocode:

```
run_conversation(messages):
  while True:
    result = chat(messages, tools)
    add assistant_message(result.parts) to messages
    if result.stop_reason != "tool_use": break
    tool_results = run_tools(result.parts)
    add user_message(tool_results) to messages
  return messages
```

Java snippet (illustrative, not from the course). `Llm` and the part records are my own types.

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ToolLoopSketch {
    public record ToolUse(String toolUseId, String name, Map<String, Object> input) {}
    public record ToolResult(String toolUseId, String content, String status) {} // success|error
    public record Reply(List<ToolUse> toolUses, String text, String stopReason) {}

    interface Llm  { Reply chat(List<Object> history, List<String> toolSchemas); }
    interface Tool { String run(Map<String, Object> input) throws Exception; }

    static List<Object> runConversation(Llm llm, Map<String, Tool> tools,
                                        List<String> schemas, List<Object> history) {
        while (true) {
            Reply r = llm.chat(history, schemas);        // schemas sent on EVERY call
            history.add(r);                               // whole assistant message, all parts
            if (!"tool_use".equals(r.stopReason())) break;

            List<ToolResult> results = new ArrayList<>();
            for (ToolUse tu : r.toolUses()) {             // may be several, in parallel
                Tool t = tools.get(tu.name());
                if (t == null) throw new IllegalArgumentException("unknown tool " + tu.name());
                try {
                    results.add(new ToolResult(tu.toolUseId(), t.run(tu.input()), "success"));
                } catch (Exception e) {                   // report errors to Claude, don't crash
                    results.add(new ToolResult(tu.toolUseId(), e.getMessage(), "error"));
                }
            }
            history.add(results);                         // goes back as a USER message
        }
        return history;
    }
}
```

### 13.8 Adding multiple tools (lesson 37)
- Adding tools after the first is easy: (1) add the schemas to the conversation function; (2) add cases to `run_tools` mapping tool names to functions; (3) rerun cells.
- Example: "Set reminder for doctor appointment in 100 days". Claude plans: get current date, add 100 days duration, set reminder, executing three tools sequentially.
- Tool schema = JSON spec of parameters; run tools function = dispatcher from tool name to implementation.

### 13.9 Batch tool use (lesson 38)
- Problem: Claude can send multiple tool use parts in one message but often runs them sequentially even when independent.
- Solution: a "batch tool".
  - Name: "batch_tool". Input: a list called "invocations". Each invocation = tool name + arguments (JSON-encoded string).
  - Add a batch case to `run_tool`; a `run_batch` function loops over invocations, parses arguments with `json.loads()`, delegates to the existing `run_tool`, collects outputs in a `batch_output` list and returns them as a single tool response.
- Effect: Claude treats multiple calls as a single batch operation; the course says Claude is "tricked" into grouping parallel-eligible operations.

Java snippet (illustrative, not from the course):

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class BatchToolSketch {
    public record Invocation(String name, String argumentsJson) {} // args JSON-encoded string
    interface Dispatcher { String runTool(String name, String argumentsJson); }

    // One batch tool call -> many real tool calls -> one combined result.
    static List<String> runBatch(Dispatcher d, List<Invocation> invocations) {
        List<CompletableFuture<String>> futures = new ArrayList<>();
        for (Invocation inv : invocations) {
            futures.add(CompletableFuture.supplyAsync(
                () -> d.runTool(inv.name(), inv.argumentsJson())));
        }
        return futures.stream().map(CompletableFuture::join).toList(); // "batch_output"
    }
}
```

### 13.10 Structured data with tools (lesson 39)
- Alternative to prefill + stop sequences: define a JSON schema as a "fake tool" whose inputs match the desired data structure. Claude calls it with the extracted data as arguments.
- Process: (1) tool schema with the desired output structure as input parameters; (2) send prompt + data + schema with the `tool_choice` parameter; (3) Claude replies with a tool use call; (4) extract the JSON arguments; (5) END the conversation (do not continue).
- Advantage: more reliable than prompt-based extraction. Disadvantage: more complex; needs a schema.
- `tool_choice` forces a specific tool instead of auto: options "auto", "any", or a specific tool name.
- Example: financial data extraction with inputs `balance` (integer) and `key_insights` (string array).

### 13.11 Flexible tool extraction (lesson 40)
- Avoids big JSON schemas: one schema named "toJSON" with a flexible object input that accepts any properties. The desired structure is stated in the prompt text.
- Steps: define the toJSON tool with a flexible object parameter; write a prompt listing exact properties and types; tell Claude to call toJSON with that structure; use escaped curly braces in F-strings for property definitions.
- Benefit: change structure by editing prompt text only. Trade-off: slightly lower quality than dedicated schemas, but still high quality.
- Recommendation: flexible approach for general extraction; dedicated schemas for critical data needing maximum accuracy.

### 13.12 The text editor tool (lesson 41)
- Built-in tool giving Claude file and directory manipulation. The JSON schema is provided automatically; YOU must implement the actual file operations.
- Required tool names (exact strings for AWS Bedrock): Claude 3-7: `str_replace_editor`; Claude 3-5: `str_replace_based_edit_tool`.
- Five commands Claude can request: `view` (read file/directory), `str_replace` (replace text in a file), `create` (new file/directory), `insert` (add text at a line), `undo_edit` (reverse previous edit).
- Flow: user prompt needing file access -> assistant message with tool_use part -> your code runs the command via a text editor class -> tool result back as a user message -> Claude's final response.
- You must implement all five handlers. Use case: replicate AI code editor behavior (refactor, new features, generate tests).

```
  view | str_replace | create | insert | undo_edit      <- Claude asks (tool_use)
        |
        v   YOUR code touches the file system, returns a tool_result
```

Rules and traps (tool use overall)
- Trap: omitting tool schemas in the follow-up call that carries tool results.
- Trap: sending an empty tool-result user message when stop_reason is not "tool_use".
- Trap: replying to only the last tool_use when several arrived; match every `tool_use_id`.
- Trap: raising an exception instead of returning a tool result with status error (Claude loses the chance to retry).
- Trap: using the wrong text editor tool name for the model version on Bedrock.
- Trap: assuming the built-in text editor performs file edits itself; it is only a schema.
- Trap: continuing the conversation after the "fake tool" extraction.

Source gap: "Quiz on tool use" (lesson 42, 4 questions) was not captured beyond the question count. The exact Bedrock parameter that carries the tool list and `tool_choice` is not named in the course.

---

## 14. Retrieval Augmented Generation (lessons 43-52)

### 14.1 Introducing RAG (lesson 43)
- RAG = technique for querying large documents (100-1000 pages) with an LLM.
- Option 1, direct: put the whole document in the prompt. Issues: token limits, reduced effectiveness with long prompts, higher cost, slower.
- Option 2, RAG, two steps: (1) split the document into small chunks; (2) for each question, find the most relevant chunks and include only those with the question.
- Advantages: Claude focuses on relevant content; scales to very large or multiple documents; smaller prompts are faster and cheaper.
- Disadvantages: more complexity; needs preprocessing; needs a search mechanism; you must define "relevance"; no guarantee chunks hold complete context; several chunking strategies exist.

### 14.2 Text chunking strategies (lesson 44)
- Poor chunking creates context errors. Example: medical text containing "bug" gets retrieved for a software engineering question because of word overlap.
- Three strategies:
  1. Size-based: equal-length strings. Easiest, most common in production. Cons: cuts words mid-sentence, lacks context. Fix: overlap (include characters from neighbouring chunks). Trade-off: duplication but better meaning.
  2. Structure-based: split on headers, paragraphs or sections (example: markdown `##` headers). Pros: well-formed, contextual sections. Cons: needs structured documents; not for plain PDFs or unformatted text.
  3. Semantic-based: NLP groups related sentences by similarity. Most advanced.
- Selection: structured documents with format guarantees -> structure-based; unstructured documents -> sentence-based; code or complex formats -> character-based (most reliable fallback).
- Key parameters: chunk size, overlap amount, splitting criteria (characters, sentences, sections).
- Character-based chunking is the most reliable default despite suboptimal results, because it works across document types.

Java snippet (illustrative, not from the course):

```java
import java.util.ArrayList;
import java.util.List;

public class Chunker {
    /** Size-based chunking with overlap: step = chunkSize - overlap. */
    static List<String> chunk(String text, int chunkSize, int overlap) {
        if (overlap >= chunkSize) throw new IllegalArgumentException("overlap must be < chunkSize");
        List<String> chunks = new ArrayList<>();
        int step = chunkSize - overlap;
        for (int start = 0; start < text.length(); start += step) {
            chunks.add(text.substring(start, Math.min(text.length(), start + chunkSize)));
            if (start + chunkSize >= text.length()) break;
        }
        return chunks;
    }

    /** Structure-based: split a markdown document on "## " headers. */
    static List<String> bySection(String markdown) {
        return List.of(markdown.split("(?m)^(?=## )"));
    }
}
```

### 14.3 Text embeddings (lesson 45)
- Embedding = numerical representation of the meaning of text, produced by an embedding model.
- Text -> embedding model -> list of numbers (typically 1024 elements, values -1 to +1).
- Each number scores some quality of the text, but the meaning of individual numbers is opaque. Mental model: scores for qualities such as happiness or topic relevance.
- Multiple models exist (example named: Titan embed text V2).
- Purpose in RAG: semantic search, comparing numerical representations instead of exact text match. Implemented as a simple call to the embedding service that returns a long array of floats.

### 14.4 The full RAG flow (lesson 46)
1. Chunk the source documents.
2. Generate embeddings for chunks.
3. Normalization: scale vector magnitudes to 1.0 (handled automatically by embedding APIs).
4. Store in a vector database (stores, compares and retrieves vectors).
5. Embed the user question with the SAME embedding model.
6. Similarity search: the vector DB finds stored embeddings closest to the query.
7. Build the prompt: question plus the most relevant chunks.
8. Send to the LLM.
- Cosine similarity = cosine of the angle between vectors; range -1 to 1; closer to 1 = more similar.
- Cosine distance = 1 minus cosine similarity; closer to 0 = more similar.

```
  docs -> chunks -> embedding model -> vectors -> [vector DB]
  question -> SAME embedding model -> query vector -> cosine search -> top chunks
  prompt = question + top chunks -> LLM -> answer
```

Java snippet (illustrative, not from the course):

```java
public class VectorMath {
    /** cosine similarity in [-1, 1]; cosine distance = 1 - similarity. */
    static double cosineSimilarity(double[] a, double[] b) {
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
        }
        return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }
    static double cosineDistance(double[] a, double[] b) { return 1 - cosineSimilarity(a, b); }
}
```

### 14.5 Implementing the RAG flow (lesson 47)
- 5 steps: (1) chunk the document with `chunk_by_section` on `report.MD`; (2) loop over chunks and call `generate_embedding` for each; (3) create a `vector_index` instance and store embedding plus chunk pairs via zip, keeping the original text in a dictionary alongside the vector; (4) embed the user question ("what did software entering depth do last year"); (5) `store.search` with the user embedding for the top 2 chunks by cosine distance.
- Results: Section 2 (distance 0.71) and the Methodology section (distance 0.72). These were the top two, which sets up the weakness fixed in later lessons.
- Design choice: store the original text with embeddings because raw embeddings mean nothing to developers.
- `vector_index` is a custom class. Search output: document content plus cosine distance score.
- Limitation: works, but some scenarios need improvements.

### 14.6 BM25 lexical search (lesson 48)
- BM25 (Best Match 25) = lexical keyword-matching algorithm.
- Problem with pure semantic search: can miss documents with exact keyword matches.
- Hybrid strategy: run semantic and lexical search in parallel, then merge.
- Algorithm: (1) tokenize the query (remove punctuation, split on spaces); (2) count each term's frequency across all chunks; (3) weight terms (rare terms high, common terms like "a", "the" low); (4) return chunks containing higher-weighted terms more often.
- Strong for exact identifiers, codes, technical terms (example: "incident 2023").
- Design: a unified API where both search systems expose `add_document()` and `search()`.

### 14.7 A multi-search RAG pipeline (lesson 49)
- Components: Vector Index (semantic), BM25 Index (lexical), Retriever class wrapping both with `add_document` and `search`.
- Reciprocal Rank Fusion (RRF) merges results. Course formula: score = sum over methods of 1/(1+rank).
- Process: run the same query on both indexes; collect all unique results with their ranks; apply the formula; sort by score descending.
- Worked example: ranked 1st in vector and 2nd in BM25 gives 1/(1+1) + 1/(1+2) = 0.5 + 0.33 = 0.83.
- Benefits: better accuracy, modular (add more search methods), unified API, handles cases where a single method fails.

Java snippet (illustrative, not from the course), using the course's formula 1/(1+rank):

```java
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Rrf {
    /** rankedLists: one ordered list of doc IDs per search method (best first). */
    static Map<String, Double> fuse(List<List<String>> rankedLists) {
        Map<String, Double> score = new HashMap<>();
        for (List<String> list : rankedLists) {
            for (int i = 0; i < list.size(); i++) {
                int rank = i + 1;                                  // rank starts at 1
                score.merge(list.get(i), 1.0 / (1 + rank), Double::sum);
            }
        }
        return score; // sort descending by value to get the merged order
    }
    // Example: doc A is rank 1 in vector and rank 2 in BM25 -> 0.5 + 0.333 = 0.83
}
```

### 14.8 Reranking results (lesson 50)
- Reranking = post-processing step where an LLM reorders results by relevance.
- Process: vector + BM25 search -> merge -> pass to Claude with a prompt asking to rank documents by relevance to the query.
- Details: assign temporary IDs to documents so the LLM returns ordered IDs, not full text; present documents in XML; ask for a specific number of most relevant results in decreasing order; use assistant prefill plus a stop sequence for structured JSON output.
- Benefit: better accuracy. Trade-off: extra LLM call adds latency.
- Example: query "What did engineering team do with incident 2023?" put the software engineering section on top after reranking, where hybrid retrieval alone ranked it second.

### 14.9 Contextual retrieval (lesson 51)
- Problem: chunks lose context from the original document.
- Solution: a pre-processing step where an LLM writes context for each chunk BEFORE it goes into the retriever database.
- Process: (1) take a chunk plus the source document; (2) prompt the LLM to situate the chunk in the larger document; (3) LLM returns a brief context; (4) combine context plus original chunk = contextualized chunk; (5) insert it into the vector and BM25 indexes.
- Large documents that do not fit in one prompt: include chunks from the start (summary/abstract) and chunks immediately before the target chunk; skip the middle.
- Example context: "This is section X from larger report covering Y domains, following methodology Z, before financial analysis section".
- Implementation: `add_context()` takes a chunk plus source text and returns the contextualized chunk.

Rules and traps (RAG)
- Trap: pure semantic search missing exact keywords (fix: BM25 plus RRF).
- Trap: embedding the question with a different embedding model than the chunks.
- Trap: storing only vectors with no original text or chunk ID.
- Trap: size-based chunks cut mid-sentence (fix: overlap).
- Trap: assuming reranking is free; it adds an LLM call and latency.

Source gap: "Quiz on retrieval augmented generation" (lesson 52, 5 questions) was not captured beyond the question count.

---

## 15. Features of Claude (lessons 53-60)

### 15.1 Extended thinking (lesson 53)
- Lets Claude reason before the final response. Chat UIs can show the thinking separately.
- The response has a reasoning content part (thinking text plus a cryptographic signature) and a text part.
- The signature prevents tampering with the reasoning text. Redacted content = encrypted thinking text flagged by safety systems.
- Trade-offs: more accuracy on complex tasks; higher cost (you pay for thinking tokens); higher latency.
- When to use: run prompt evals first; enable only if accuracy is still insufficient after prompt optimization. No universal rule; decide per use case via evals.
- Parameters as the course states them: `thinking` (boolean) and `thinking_budget` (minimum 1024 tokens). The budget is the maximum tokens Claude may spend thinking. The right budget comes from evals, not rules of thumb.
- A magic string exists to force redacted content, used only to test your handling of redacted blocks.
- Principle: the decision to use extended thinking must be eval-driven.

### 15.2 Image support (lesson 54)
- Claude can process images in messages alongside text.
- Requirements: maximum 20 images per request across all messages; size and dimension limits apply; images consume tokens based on pixel dimensions (height x width).
- Images are message parts in user messages: one image part per image; several images = several image parts in the same message.
- Success factor: strong prompting. A simple prompt ("How many marbles?") gave a wrong count (13 instead of 12).
- Techniques: (1) step-by-step analysis instructions with a verification or recount step and comparison of results; (2) one-shot or multi-shot prompting by alternating image parts with text parts (Image -> text explanation -> target image -> query).
- Real-world example: fire risk assessment for insurance from satellite imagery. Multi-step evaluation: residence identification, tree density, fire service access, roof overhang; structured scoring with detailed criteria; final risk rating with summary.
- Takeaway: accuracy depends on prompt engineering, not only on image quality.

### 15.3 PDF support and citations (lessons 55-56)
Source gap: the official notes contain no note block for "PDF support" (lesson 55) or "Citations" (lesson 56), and the pages hold only player noise. Nothing about how PDFs are sent or how citations are returned on Bedrock is recorded here.

### 15.4 Prompt caching (lessons 57-59)
Concept (lesson 57)
- Normal request: user message -> Claude builds internal data structures and does calculations on the input -> generates output -> responds -> DISCARDS all that work.
- Problem: identical input text is reprocessed over and over.
- Prompt caching stores the work in a temporary cache. Follow-ups with identical input reuse it, giving faster responses and lower cost.

Rules (lesson 58)
- Cache lifetime: 5 minutes.
- A cache point is a special message part marking where caching happens; it caches ALL content BEFORE the cache point. Content after the cache point is never cached.
- First request processes and saves; follow-ups reuse if the content before the cache point is IDENTICAL; any difference invalidates the cache.
- Minimum 1024 tokens before the cache point.
- Works across multiple messages and parts, including assistant messages.
- Applicable to: text parts in messages, tool definition lists, system prompts, multi-message conversations.
- Typical targets: tool schemas (often reused), system prompts (rarely change).

In action (lesson 59)
- Add a `cache_point` with `type="default"` to system prompt parts; concatenate a cache_point onto the tools list; read the `usage` field in the response to watch cache activity.
- First request = cache_write; later requests = cache_read; expires after 5 minutes of inactivity; changing cached content triggers a new cache_write.
- Usage fields: `cache_write_input_tokens` (tokens stored), `cache_read_input_tokens` (tokens retrieved).
- Best practices: cache system prompts and tool schemas (static, often over 1024 tokens); cache survives text changes BELOW the cache point; changes ABOVE it invalidate.

```
  [ system prompt ][ tool schemas ][ CACHE POINT ][ new user text ... ]
   \_____ cached (>= 1024 tokens, identical, within 5 min) _____/  \__ never cached __/
```

Java snippet (illustrative, not from the course). The course states only "cache_point with type default"; the exact JSON placement is my assumption, shown as a shape sketch.

```java
public class CacheSketch {
    // ASSUMED SHAPE: course says a cache_point part with type="default" is added to
    // system prompt parts and concatenated onto the tools list. Wire format unverified.
    static final String CACHE_POINT = "{ \"cache_point\": { \"type\": \"default\" } }";

    // Read these two numbers from the response "usage" field to verify caching works.
    record Usage(long cacheWriteInputTokens, long cacheReadInputTokens) {
        boolean firstCall()   { return cacheWriteInputTokens > 0 && cacheReadInputTokens == 0; }
        boolean cacheHit()    { return cacheReadInputTokens > 0; }
    }
}
```

Rules and traps (features)
- Trap: enabling extended thinking by default. Eval first; thinking tokens cost money and add latency.
- Trap: setting a thinking budget under 1024.
- Trap: a simple prompt with an image and expecting accuracy; use step-by-step and multi-shot prompting.
- Trap: caching less than 1024 tokens (no caching occurs).
- Trap: changing text ABOVE the cache point and expecting a hit; the whole cache is invalidated.
- Trap: putting volatile content before the cache point.
- Trap: forgetting the 5 minute lifetime.

Source gap: "Quiz on features of Claude" (lesson 60, 4 questions) was not captured beyond the question count.

---

## 16. Model Context Protocol (lessons 61-72)

### 16.1 Introducing MCP (lesson 61)
- MCP = Model Context Protocol, a communication layer that gives Claude context and tools without developers writing tedious code.
- Architecture: client-server. A server contains tools, resources and prompts.
- Problem solved: you no longer author, test and maintain many tool schemas and functions for external services (GitHub API is the example).
- MCP server = interface to an outside service, wrapping its functionality into pre-built tools; tool definition and execution move from your server to the MCP server.
- Q and A from the course: anyone can author MCP servers, but service providers often ship official ones; versus direct API calls, it saves you from writing schemas and functions yourself; MCP versus tool use: complementary. MCP handles WHO does the work, tool use is the mechanism.

### 16.2 MCP clients (lesson 62)
- MCP client = communication layer between your server and the MCP server; gives access to the server's tools.
- Transport agnostic: stdio, HTTP, WebSockets and others. Common setup: client and server on the same machine over standard input/output.
- Message types: list tools request / list tools result; call tool request / call tool result.
- Typical flow:
  1. User queries your server.
  2. Server asks the MCP client for the tool list.
  3. Client sends list tools request to the MCP server.
  4. Server sends query plus tools to Claude.
  5. Claude responds with a tool use request.
  6. Server asks the MCP client to run the tool.
  7. Client sends call tool request to the MCP server.
  8. MCP server executes the tool (for example a GitHub API call).
  9. Results flow MCP server -> client -> server -> Claude.
  10. Claude writes the final response.

```
  user -> your server -> MCP client --list tools--> MCP server (tools/resources/prompts)
                |  query + tools                         ^
                v                                        | call tool request / result
              Claude --tool_use--> your server --> MCP client --> MCP server --> GitHub etc.
```

### 16.3 Project setup (lesson 63)
- A CLI chatbot built to learn the client-server interaction. One project contains both an MCP client and a custom MCP server (normally you build only one side).
- Features: fake documents held in memory; 2 tools (read document contents, update document contents).
- Setup steps: download the CLI project zip starter; configure environment variables (the Bedrock region and model ID from previous notebooks); install Python dependencies via `uv` or `pip`.
- Run: `uv run main.py` or `python main.py` to launch the chat prompt.

### 16.4 Defining tools with MCP (lesson 64)
- MCP tools = functions the model can call. The official MCP Python SDK lets you define them without hand-writing JSON schema.
- Syntax: `@mcp.tool` decorator with name, description and typed parameters using pydantic `Field`.
- Steps: decorator; typed function; `Field` descriptions per parameter; implement logic; SDK auto-generates the JSON schema.
- Tools implemented: `read_doc_contents` (takes `doc_id`, returns content from an in-memory dictionary) and `edit_document` (takes `doc_id`, `old_string`, `new_string`; find and replace).
- Error handling: check `doc_id` exists in the docs dictionary, raise `ValueError` if not found.

### 16.5 The server inspector (lesson 65)
- MCP Inspector = in-browser debugger for testing MCP servers without connecting an application.
- Start: run `mcp dev [server-filename.py]` in a terminal with the Python environment activated; it serves on a port; open the localhost address shown.
- Features: Connect button starts the server; the top bar shows resources, prompts, tools; the Tools section lists tools; the right panel invokes tools manually.
- Workflow: Connect -> Tools -> List Tools -> select a tool -> enter parameters -> Run Tool.
- The UI may change during development; core behavior stays similar.

### 16.6 Implementing a client (lesson 66)
- MCP client = wrapper class around a client session, for resource management and cleanup. Client session = the actual connection (part of the MCP Python SDK).
- The wrapper exposes server features to the codebase and cleans up through async enter/exit functions.
- Key functions: `list_tools()` = `await self.session.list_tools()` then return `result.tools`; `call_tool()` = `await self.session.call_tool(tool_name, tool_input)`.
- MCP tool definitions differ from what Bedrock expects, so a `to_bedrock_tools()` function converts them.
- Test by running the client directly to verify the server connection and tool retrieval.

### 16.7 Defining and accessing resources (lessons 67-68)
Defining (lesson 67)
- Resources let MCP servers expose data to clients for READ operations.
- Direct/static resource: fixed URI, for example `docs://documents`. Templated resource: parameterized URI, for example `docs://documents/{doc_id}`.
- Flow: client sends a read resource request with a URI; server matches it to a resource function; runs it; client gets a read resource result.
- Implementation: `@mcp.resource` decorator with URI and MIME type. MIME types: `application/json` for structured data, `text/plain` for raw text. Templated parameters become function keyword arguments. The SDK auto-serializes return values to strings.
- Example: a list-documents resource returns names for autocomplete; a fetch-document resource returns one document by ID. This enables @ mentions in chat without tool calls.
- One resource per distinct read operation. Resources expose data; tools perform actions. The client deserializes based on MIME type. Errors via exceptions (for example `ValueError`).

Accessing (lesson 68)
- `read_resource(uri)` is the main client function: calls `session.read_resource(AnyURL(uri))` and takes `result.contents[0]`.
- Parsing: check `resource.mime_type`; if "application/json" return `json.loads(resource.text)`, else return `resource.text`.
- Integration: client requests the resource list; the user selects one in the CLI; the content is inserted into the prompt and sent to Claude. No tool call needed because the content is already retrieved.

### 16.8 Defining prompts and prompts in the client (lessons 69-70)
- MCP prompts = pre-defined, tested prompts exposed by servers for specialized tasks. Server developers write high-quality domain-specific prompts so users do not write ad-hoc ones.
- Implementation: `@prompt` decorator with name and description; return a list of messages (user/assistant format). The function receives parameters (for example a document ID) and returns `base.UserMessage` objects with interpolated text.
- Benefits: better results than user-written prompts; reusable across clients; specialized to the server's domain.
- Example: a document formatting prompt telling Claude to read the document via tools, reformat to markdown and save.
- Testing: use the MCP dev inspector to list prompts, choose one, enter parameters and get the message list.
- Client side: `list_prompts()` = `await self.session.list_prompts()` returning `result.props` (as the course notes state it); `get_prompt()` = `await self.session.get_prompt(prompt_name, arguments)` returning `result.messages`.
- Flow: define prompts with argument placeholders (for example `document_id`); client requests by name with an arguments dictionary; server interpolates; returned messages go straight to Claude. The CLI shows prompts as commands with argument selection. Example: `format_document` expects `document_id`.

### 16.9 MCP review (lesson 71): the three primitives
| Primitive | Controlled by | Purpose | Example |
|---|---|---|---|
| Tools | Model (Claude decides when) | Add capabilities to Claude | JavaScript execution for calculations |
| Resources | App (application code decides) | Provide data to UI or augment prompts | Autocomplete options, document content injection |
| Prompts | User (UI buttons, slash commands) | Predefined workflows | Chat starter buttons |

- Summary: tools serve the model; resources serve the app; prompts serve users.
- Guidance: need Claude capabilities -> tools; need app data or UI content -> resources; need predefined workflows -> prompts.
- Claude.ai examples: buttons below the chat input = prompts; Google Drive document listing = resources; automatic code execution = tools.

Java snippet (illustrative, not from the course). Encodes the control pattern as a lookup; no MCP SDK is implied.

```java
public class McpPrimitives {
    enum Primitive { TOOL, RESOURCE, PROMPT }
    enum ControlledBy { MODEL, APPLICATION, USER }

    static ControlledBy controlledBy(Primitive p) {
        return switch (p) {
            case TOOL     -> ControlledBy.MODEL;        // Claude decides when to run it
            case RESOURCE -> ControlledBy.APPLICATION;  // app code decides when to fetch
            case PROMPT   -> ControlledBy.USER;         // user triggers via button / slash command
        };
    }
}
```

Rules and traps (MCP)
- Trap: thinking MCP replaces tool use. They are complementary: MCP decides who authors and runs the tools; tool use is still the mechanism between Claude and your server.
- Trap: using a tool when you only need app-side data (use a resource; no model decision needed).
- Trap: forgetting to convert MCP tool definitions with `to_bedrock_tools()` before sending to Bedrock.
- Trap: ignoring the MIME type; JSON resources must be parsed, text returned as is.
- Trap: using a templated URI without matching the keyword argument to the placeholder name (templated parameters become keyword arguments).

Source gap: "Quiz on Model Context Protocol" (lesson 72, 8 questions) was not captured beyond the question count.

---

## 17. Agents, Claude Code and Computer Use (lessons 73-83)

Source gap: lessons 73 (Agents overview), 74 (Claude Code setup) and 83 (Course wrap-up) have no note block in the official notes. Lessons 75-81 are covered below. The Final assessment quiz (lesson 82, 21 questions) was not captured beyond the question count.

### 17.1 Claude Code in action (lesson 75)
- Claude Code = AI coding assistant that works like another engineer on the team, not just a code generator.
- Workflow: download the project zip, extract, open in an editor; run `claude` in a terminal; ask it to read the README and run setup; run the `init` command (Claude scans the codebase and creates a `claude.md` with project architecture and coding style notes); `claude.md` is automatically included as context in future requests.
- Three memory types: project, local, user. Use `#` plus a note to append a direction to `claude.md`; you can edit it manually or rerun `init`.
- Effort multiplier principle: a little effort directing Claude produces much better results.
- Two workflows for complex features:
  - Workflow 1 (three steps): (1) identify relevant files and ask Claude to read and analyze them; (2) describe the feature and ask for a plan, no code yet; (3) ask it to implement the plan.
  - Workflow 2 (test-driven): (1) ask it to read relevant context; (2) ask it to suggest tests, no implementation; (3) pick the most relevant tests and ask it to implement them; (4) ask it to write code until tests pass.
- Example feature: a document-to-markdown tool reading PDF/Word from a file path, converting to markdown, with error handling for unsupported files.
- Commands: `claude` (launch), `init` (scan, generate claude.md), `/clear` (reset conversation history), `# [note]` (append to claude.md).

### 17.2 Enhancements with MCP servers (lesson 76)
- Claude Code has an embedded MCP client, so external MCP servers can extend it.
- Setup: `claude mcp add [server-name] [startup-command]`, for example `claude mcp add documents "uv run main.py"`, then restart with `claude`.
- Demo: the Document Path to Markdown tool lets Claude Code read PDF/Word and convert to Markdown.
- Use cases named: Sentry MCP server (production error details), Jira MCP server (ticket contents), Slack MCP server (completion notifications), custom workflow integrations.

### 17.3 Parallelizing Claude Code (lesson 77)
- Run multiple Claude instances at once, so one developer manages several virtual engineers.
- Challenge: file conflicts when instances edit the same files.
- Solution: Git work trees: complete project copies in separate directories, each on its own branch.
- Workflow: create work tree -> assign a task to a Claude instance -> work in isolation -> commit -> merge back to main.
- Automation: custom commands in `.claude/commands` (markdown files with prompts); use the `$ARGUMENTS` placeholder; invoke with `/project:command-name`.
- Steps: (1) create work trees for different features; (2) launch Claude in each with a task; (3) let them run in parallel; (4) commit in each branch; (5) merge all back to main (Claude can handle merge conflicts); (6) clean up work trees.
- Key insight: delegate the entire workflow, including work tree creation, merging and cleanup, to Claude itself.

```
  main
   |-- worktree A (branch feature-a) -> Claude #1 -> commit --+
   |-- worktree B (branch feature-b) -> Claude #2 -> commit --+--> merge to main
   |-- worktree C (branch feature-c) -> Claude #3 -> commit --+     (clean up trees)
```

### 17.4 Automated debugging (lesson 78)
- Using AI agents to detect, diagnose and fix production errors without manual intervention.
- Workflow: a GitHub Action runs daily -> pulls CloudWatch logs -> filters and deduplicates errors -> Claude analyzes each error -> generates fixes -> commits -> opens a pull request for review.
- Components: error detection (log monitoring), error analysis (stack traces and messages), fix generation, integration (commit and PR).
- Example: an app failing silently in production (worked locally); the logs showed an "invalid model identifier" error; Claude found a typo in the model ID, corrected the configuration and submitted a PR.
- Benefits: catches production-only issues, reduces log hunting, explained fixes, keeps code review via PRs.
- Needs: CI/CD pipeline, log access (CloudWatch or similar), AI coding assistant integration, version control automation.
- Limitation: a human must still review fixes before merging.

### 17.5 Computer use (lessons 79-80)
What it is (lesson 79)
- Claude interacts with and controls computer interfaces through visual input and actions: takes screenshots; mouse clicks, keyboard input, scrolling; navigates browsers and apps; runs multi-step workflows.
- Use cases: QA test automation (run test cases, find UI bugs, report), web application testing (navigate, fill forms, validate), general task automation.
- Runs in an isolated Docker container for security, with a chat interface for instructions; processes visual feedback to choose next actions; produces detailed reports.
- Benefits: saves time on repetitive testing, finds edge cases and failures, handles complex multi-step processes, works with existing apps without modification.

How it works (lesson 80)
- It is a special case of tool use. Flow: user request with tool schema -> Claude returns a tool use part (ID, name, input) -> server executes and returns a result -> Claude receives it.
- A minimal schema expands into a large structure describing an action function with arguments (mouse move, left click, screenshot, and so on).
- A Docker container simulates a computing environment and executes programmatic key presses and mouse movements per Claude's requests. Claude does not directly manipulate the computer.
- Key point: Claude decides to use tools but developers provide the actual execution (weather API, Docker environment, and so on).
- Setup: Docker plus a local AWS profile plus a simple Docker command. Anthropic provides a reference implementation with a pre-built container.

### 17.6 Qualities of agents (lesson 81)
- Agent = a language model with tool access, run repeatedly until the goal is achieved.
- Qualities:
  - Tool-centric: tools used in loops until goal or error.
  - Information gathering focus: most tool calls gather environment data rather than modify it.
  - Context dependency: agents rely on tools to inspect the environment, not on RAG or detailed prompts.
  - Focused toolset: a small set of tools with clear purposes.
  - High-value, low-risk tasks: valuable work where mistakes cause no major economic or safety damage.
- Tool patterns: Claude Code reads files (gathering), writes files (modifying) and runs tests; computer use gets automatic visual feedback from screenshots.
- Principles: context is king (the model has no inherent world knowledge); evals are necessary to ensure agent effectiveness; risk assessment (suited to high-value tasks with manageable failure cost).
- Core loop: tool execution -> environment inspection -> goal progress -> repeat until success or failure.

```
  goal --> [LLM + tools] --tool call--> environment
              ^                             |
              +---- inspect result <--------+      repeat until success / failure / error
```

Java snippet (illustrative, not from the course). The agent loop is the same shape as the tool loop in section 13.7 with a goal check and a step cap (the cap is my own safety addition, not stated in the course).

```java
public class AgentLoopSketch {
    interface Step { boolean goalReachedOrFailed(); void execute(); }

    static void run(Step step, int maxSteps) {
        for (int i = 0; i < maxSteps && !step.goalReachedOrFailed(); i++) {
            step.execute(); // tool call -> inspect environment -> progress toward goal
        }
    }
}
```

---

## 18. Exercises and Quizzes That Appear

The lesson pages for quizzes show only the question count. Exercise lessons contain only player noise. Nothing about the actual questions or answers was captured. What each is likely to test is inferred ONLY from the neighbouring lessons.

| Lesson | Item | Questions | Source coverage |
|---|---|---|---|
| 06 | Chat bot exercise | n/a | Not captured; follows Multi-turn (section 5) |
| 08 | System prompt exercise | n/a | Not captured; follows System prompts (section 6) |
| 13 | Structured data exercise | n/a | Not captured; follows prefill + stop sequence (section 10) |
| 14 | Quiz on working with the API | 4 | Count only; covers sections 3-10 |
| 21 | Exercise on prompt evals | n/a | Not captured; follows eval workflow (section 11) |
| 22 | Quiz on prompt evaluations | 7 | Count only |
| 28 | Exercise on prompting | n/a | Not captured; follows prompt techniques (section 12) |
| 29 | Quiz on prompt engineering | 4 | Count only |
| 42 | Quiz on tool use | 4 | Count only |
| 52 | Quiz on RAG | 5 | Count only |
| 60 | Quiz on features of Claude | 4 | Count only |
| 72 | Quiz on MCP | 8 | Count only |
| 82 | Final assessment quiz | 21 | Count only |

Source gap: no exercise instructions, quiz questions, answer options or reasoning were captured for any of the items above. The self-test in section 21 is built from the taught content, not from the real quizzes.

---

## 19. Common Mistakes

| Mistake | Fix |
|---|---|
| Treating AWS Bedrock as the Anthropic API and reading Anthropic docs/SDKs | Bedrock is a different service with its own SDKs and docs; use Bedrock resources |
| Using a direct model ID from the model catalog and hitting cryptic region errors | Use the inference profile ID from "cross region inference" in the console |
| Expecting the service to remember the conversation | API is stateless; keep the full message list and resend it every request |
| Two consecutive messages with the same role | Alternate user, assistant, user, assistant |
| Empty system prompt string | Minimum 1 character; make the parameter optional and default to none |
| Default temperature (1.0) for extraction or factual tasks | Use values near 0 for extraction and consistency; near 1 for creative work |
| Treating every stream event as text | Only content block delta events carry text (`event['content_block_delta']['delta']['text']`) |
| Forgetting to prepend the prefill to the returned text | Full output = prefill + response |
| Expecting the stop sequence in the output | It is excluded from the returned text |
| Parsing Claude's JSON out of commentary | Prefill the opening fence and use the closing fence as stop sequence (or use a fake tool with tool_choice) |
| Testing a prompt once or twice and shipping | Build an eval pipeline with a dataset, grader and average score |
| Relying on subjective judgment of prompt quality | Compare average scores of prompt versions on the same dataset |
| Model grader returning middling scores | Ask for reasoning, strengths and weaknesses; define criteria upfront |
| Dataset lacks a "format" key for the syntax grader | Add `format` (JSON/Python/regex) so grade_syntax() can route |
| Vague first line in a prompt | Start with an action verb plus a specific task plus output expectations |
| Unlabeled big blocks of text in a prompt | Wrap in descriptive XML tags (for example `<sales_records>`) |
| Omitting tool schemas when sending tool results | Send full history plus the original tool schemas every time |
| Adding a tool-result message when stop_reason is not "tool_use" | Only process tool requests when stop_reason is "tool_use" |
| Raising an exception when a tool fails | Return a tool result with status error and the message so Claude can retry |
| Ignoring that Claude may send several tool_use parts | Process each and answer by `tool_use_id` |
| Wrong text editor tool name on Bedrock | Use exact names: `str_replace_editor` (Claude 3-7), `str_replace_based_edit_tool` (Claude 3-5) |
| Assuming the built-in text editor tool edits files | Its schema is provided, but you implement view, str_replace, create, insert, undo_edit |
| Stuffing a 100-1000 page document in one prompt | Use RAG: chunk, embed, retrieve relevant chunks |
| Embedding queries with a different model than chunks | Use the same embedding model for chunks and question |
| Relying on semantic search only | Add BM25 and merge with reciprocal rank fusion |
| Storing only vectors | Store the original chunk text (or an ID) alongside each embedding |
| Chunks lacking surrounding context | Overlap size-based chunks; use contextual retrieval (LLM-written chunk context) |
| Turning on extended thinking without testing | Run evals first; enable only if accuracy remains insufficient |
| Thinking budget below 1024 | Minimum is 1024 tokens; tune the budget by evals |
| Prompt cache never hits | Need at least 1024 tokens before the cache point, identical content, within 5 minutes; check `cache_read_input_tokens` |
| Simple image prompts ("How many marbles?") | Use step-by-step instructions with recount, or multi-shot with image/text parts; max 20 images per request |
| Thinking MCP replaces tool use | They complement each other; MCP handles who does the work |
| Forgetting `to_bedrock_tools()` conversion | MCP tool definitions must be converted to Bedrock's expected format |
| Letting an automated debugging agent merge fixes unreviewed | Keep a human review of the PR before merging |

---

## 20. Key Terms

| Term | Meaning |
|---|---|
| Amazon Bedrock | AWS service through which this course reaches Claude; not the same as the Anthropic API |
| boto3 client | Python AWS client connected to the Bedrock runtime service in a chosen region |
| `converse` | Call taking `modelId`, `messages` and optional `system`, `inference_config` etc. |
| Converse Stream | Streaming variant; returns an event stream with a `stream` key |
| Model ID | Identifier of the model to run |
| Inference profile | Routes requests to regions where the model exists; use its ID as modelId; found under "cross region inference" |
| User message | `{"role": "user", "content": [{"text": ...}]}` |
| Assistant message | Model response with the same structure and role "assistant" |
| Stateless API | Service stores no messages; you resend history |
| System prompt | Role-assigning instructions via the `system` parameter (min 1 character) |
| Temperature | 0-1 randomness control in `inference_config`; default 1.0 |
| Content block delta | Stream event holding a text chunk |
| Pre-filling | Ending the message list with a partial assistant message; the model continues from it |
| Stop sequence | String that halts generation; excluded from output; set via `stop_sequences` |
| Prompt evaluation | Automated testing of prompts with objective scores |
| Eval dataset | Set of test inputs (JSON objects) for a prompt |
| Code grader | Programmatic check of output (syntax, length, keywords) |
| Model grader | Another LLM call that scores output with reasoning |
| Human grader | Manual evaluation |
| Prompt engineering | Techniques to improve a prompt (clear and direct, specific, XML tags, examples) |
| Type A / Type B guidelines | Output attributes versus step-by-step process |
| One-shot / multi-shot | One example versus several examples in a prompt |
| Tool use | Claude requesting external data or actions that your server executes |
| JSON schema (tools) | Spec of a tool name, description and argument structure sent to Claude |
| `stop_reason` | Why generation stopped; "tool_use" means run a tool |
| tool_use part | Part with `tool_use_id`, `name`, `input` |
| tool_result part | Part with `tool_use_id`, `content`, `status` (success or error) |
| tool choice | auto (default), any, or a specific tool by name |
| Batch tool | Tool taking a list of `invocations` so parallel work is grouped |
| toJSON tool | Flexible-object schema for extraction defined by prompt text |
| Text editor tool | Built-in schema for view, str_replace, create, insert, undo_edit; you implement it |
| RAG | Retrieval Augmented Generation: retrieve relevant chunks, then prompt |
| Chunking | Size-based, structure-based or semantic splitting of documents |
| Embedding | Numeric vector (typically 1024 elements, -1 to +1) representing text meaning |
| Cosine similarity / distance | Angle-based similarity (-1 to 1) and 1 minus that |
| Vector database | Stores, compares and retrieves embeddings |
| BM25 | Lexical keyword-weighted search |
| Reciprocal Rank Fusion | Merge ranked lists with score = sum of 1/(1+rank) |
| Reranking | LLM reorders merged results by relevance |
| Contextual retrieval | LLM prepends chunk-situating context before indexing |
| Extended thinking | Reasoning before the answer; has a signature; redacted content possible |
| Thinking budget | Maximum thinking tokens; minimum 1024 |
| Prompt caching | 5-minute reuse of processed prompt prefix; needs 1024+ tokens |
| Cache point | Part marking the end of cacheable content (`type="default"`) |
| cache_write / cache_read | First-request store versus later retrieval; counted in `usage` |
| MCP | Model Context Protocol: client-server layer exposing tools, resources and prompts |
| MCP client / server | Client connects your app to the server that holds the primitives |
| Tools / Resources / Prompts | Model-controlled / app-controlled / user-controlled primitives |
| MCP Inspector | Browser debugger started with `mcp dev [file.py]` |
| Claude Code | AI coding assistant for the terminal; `claude`, `init`, `claude.md`, `/clear` |
| Git work trees | Separate directories and branches enabling parallel Claude instances |
| Computer use | Claude controls a computer via screenshots and actions executed in Docker |
| Agent | Language model with tools run repeatedly until a goal is achieved |

---

## 21. Exam-Style Self-Test

1. Q: Why can you not simply follow Anthropic API documentation when using Claude on Bedrock?
   A: AWS Bedrock API is not the Anthropic API. Same Claude models but a different service, SDKs and documentation.

2. Q: Name the three things needed to make a Bedrock request.
   A: A boto3 client for the Bedrock runtime (with a region), a model ID, and a user message object.

3. Q: Where do you find the ID to use as the model ID, and why?
   A: Under "cross region inference" in the AWS console. An inference profile routes to regions where the model exists, avoiding cryptic errors.

4. Q: How do you read the reply text from a converse response?
   A: `response["output"]["message"]["content"][0]["text"]`.

5. Q: Why must your code store all messages in a chat bot?
   A: The API is stateless; you must resend the complete history each request, with alternating roles.

6. Q: What are the system prompt format constraints?
   A: At least 1 character, passed as a list with a dictionary containing a text field; make it optional (default none).

7. Q: What does temperature 0 do and what is the default?
   A: Always selects the highest-probability token (deterministic). Default is 1.0.

8. Q: Which stream events carry text, and where?
   A: Content block delta events, at `event['content_block_delta']['delta']['text']`.

9. Q: What do you get back if you pre-fill the assistant message?
   A: Only the continuation; concatenate prefill plus response for the full output.

10. Q: How do you get raw JSON with no commentary using prompt techniques?
    A: Prefill with the opening code fence (json) and set the closing fence as a stop sequence.

11. Q: Name the three grader types and one strength of each.
    A: Code (programmatic checks such as syntax), model (subjective quality via extra API calls), human (flexible but slow).

12. Q: How is the final score computed in the course's code-graded eval?
    A: (model_score + syntax_score) / 2, where syntax score is 10 for a successful parse and 0 otherwise.

13. Q: What first-line pattern does "being clear and direct" recommend?
    A: An action verb plus a specific task plus output expectations (course example score 2.32 to 3.92).

14. Q: Difference between the two kinds of guidelines in "being specific"?
    A: Type A lists output qualities (almost always use); Type B gives steps for the model to follow (for complex problems).

15. Q: What stop_reason signals a tool request, and what must the follow-up request contain?
    A: "tool_use"; the full history (including the complete assistant message and tool result parts) plus the original tool schemas.

16. Q: How should tool errors be reported?
    A: As a tool result part with status error and the message in content, so Claude can retry.

17. Q: What does `tool_choice` offer?
    A: auto (default), any, or a specific named tool (for example to force a fake extraction tool).

18. Q: Why do people use a batch tool?
    A: Claude often runs independent tool calls sequentially; a batch tool with a list of `invocations` groups them into one parallelizable call.

19. Q: What are the three chunking strategies and the fallback?
    A: Size-based, structure-based, semantic-based; character-based chunking is the most reliable fallback default.

20. Q: How does reciprocal rank fusion score a document ranked 1st in vector search and 2nd in BM25?
    A: 1/(1+1) + 1/(1+2) = 0.5 + 0.33 = 0.83.

21. Q: What are the conditions for prompt caching to work?
    A: At least 1024 tokens before the cache point, identical content before it, within 5 minutes; changes above the cache point invalidate it.

22. Q: Who controls each MCP primitive?
    A: Tools: the model; resources: the application; prompts: the user.
