# Delta: Claude on Google Cloud vs the Anthropic API - Study Notes

Source: Anthropic Academy course "Claude on Google Cloud" (site slug claude-with-google-vertex, 93 lesson pages) diffed note-by-note against the "Claude with the Anthropic API" course (85 lesson pages). Primary evidence: the two official full-course note files, plus the one lesson page with real text (Vertex AI Setup, lesson 04), plus page-level facts (quiz question counts, video lengths).

---

## 1. How to use this file

- Read the core notes first (01-core-claude-api-and-mcp.md in this folder, or the API course notes); this file only lists what the Google Cloud (Vertex AI) course teaches differently.
- Go to section 2 to see every Vertex lesson marked same / differs / Vertex-only / unclear. Skip every "same" row (some carry a small addendum tag A-n, listed in 3.9). Read section 3 only for the rows that are not "same".
- Course facts are quoted as the course states them. Java snippets are labelled "illustrative, not from the course" and use placeholder type names only; no Anthropic or Google SDK class names are used.

How "same" was judged (strict rule)
- A difference = a fact, step, parameter, limit or availability stated in the Vertex notes that is absent from, or stated differently in, the API notes.
- Rewording, a different example topic, a different order, or a different step count for the same content is "same".
- Small extras in the Vertex wording that restate the same concept (a parameter spelled out, a helper default, an example number) keep the row "same" but are tagged A-n and written out in 3.9, so nothing is hidden.
- "unclear" = one side has no usable notes. Each has a "Source gap:" line in 3.10.

Supporting hint (not proof): on the Skilljar pages, the video length is identical in both courses for every lesson that shows a timer on both sides, except lessons 01, 03, 05, 48, 50 and 77. Lessons 03, 05 and 48 are real differences (below); 01, 50 and 77 are unclear. Lesson 04 (Vertex AI Setup) has no video timer; the API course's lesson 04 (Getting an API key) has none either.

```
  WHERE THE DELTA LIVES (course arc, Vertex numbering)

  01 welcome  02 models  03 access  04 SETUP  05 REQUEST  06..44 same teaching
  ----------  ---------  ---------  --------  ----------  --------------------
     ?          same     DIFFERS   VERTEX-    DIFFERS     (quiz counts differ;
                         (creds)    ONLY      (client)     61 cache time differs;
                                                            72/73 MCP spelling)
  46 RAG ... 48 EMBEDDINGS ... 50 ...        76-83 Claude Code / computer use
  same        DIFFERS (Google)   ?           NO NOTES in Vertex course (?)
```

---

## 2. Same-as-API checklist (every lesson in the Vertex course)

Status key: same = teaching and facts match the API notes | differs = stated differently or only in Vertex | Vertex-only = exists only in the Vertex course | unclear = one side has no usable notes. "API lesson list" = the API course's page list; "API notes" = its official note file.

| Lesson (Vertex numbering) | Same as API? | Note |
|---|---|---|
| 01 Welcome to the course | unclear | No text either side. Video 2:08 vs 2:14 in the API course. |
| 02 Overview of Claude Models | same | Same three families and selection framework. Addendum A-1. |
| 03 Accessing the API | differs | Credentials instead of an API key; SDK list differs. See 3.1. |
| 04 Vertex AI Setup | Vertex-only | Replaces the API course's "Getting an API key". See 3.1. |
| 05 Making a Request | differs | anthropic[vertex], region="global", project_id, no .env. See 3.2. |
| 06 Multi-Turn Conversations | same | Stateless API, resend full history, same three helpers. |
| 07 Chat Exercise | unclear | No text; video 3:54 in both. |
| 08 System Prompts | same | Addendum A-2. |
| 09 System Prompts Exercise | unclear | No text; video 1:25 in both. |
| 10 Temperature | same | Addendum A-3. |
| 11 Course Satisfaction Survey | unclear | Title suffix "Google Vertex" vs "Anthropic API"; 3 questions in both; text not captured. |
| 12 Response Streaming | same | Addendum A-4. |
| 13 Controlling Model Output | same | Page is not in the API lesson list, but the API notes contain the same note (prefill + stop sequences). Addendum A-5. |
| 14 Structured Data | same | Addendum A-6. |
| 15 Structured Data Exercise | unclear | No text; video 4:57 in both. |
| 16 Quiz on Accessing Claude with the API | differs | 7 questions here vs 8 in the API quiz. See 3.8. |
| 17 Prompt Evaluation | same | |
| 18 A Typical Eval Workflow | same | Vertex notes say 5 steps, API notes say 6; the content is the same (dataset-to-prompt and send-to-Claude are merged in one step). |
| 19 Generating Test Datasets | same | |
| 20 Running the Eval | same | Both: about 31 seconds with Haiku, hardcoded score 10 at this stage. |
| 21 Model Based Grading | same | |
| 22 Code Based Grading | same | Addendum A-7. |
| 23 Exercise on Prompt Evals | unclear | No text; video 4:44 in both. |
| 24 Quiz on Prompt Evaluation | differs | 4 questions here vs 6. See 3.8. |
| 25 Prompt Engineering | same | Addendum A-8. |
| 26 Being Clear and Direct | same | Both: 2.32 to 3.92. |
| 27 Being Specific | same | Both: 3.92 to 7.86. |
| 28 Structure with XML Tags | same | |
| 29 Providing Examples | same | |
| 30 Exercise on Prompting | unclear | No text; video 5:22 in both. |
| 31 Quiz on Prompt Engineering Techniques | differs | 6 questions here vs 5. See 3.8. |
| 32 Introducing Tool Use | same | |
| 33 Project Overview | same | |
| 34 Tool Functions | same | |
| 35 Tool Schemas | same | |
| 36 Handling Message Blocks | same | |
| 37 Sending Tool Results | same | Addendum A-9. |
| 38 Multi-Turn Conversations with Tools | same | |
| 39 Implementing Multiple Turns | same | |
| 40 Using Multiple Tools | same | |
| 41 The Batch Tool | same | Page not in the API lesson list; the API notes contain the same note. Addendum A-10. |
| 42 Tools for Structured Data | same | Page not in the API lesson list; the API notes contain the same note (tool_choice forcing). |
| 43 The Text Edit Tool | same | Both: schema stub varies by Claude model version (3.7 vs 3.5 dates). |
| 44 The Web Search Tool | same | Addendum A-11. |
| 45 Quiz on Tool Use with Claude | unclear | 7 questions in both; text not captured. |
| 46 Introducing RAG | same | |
| 47 Text Chunking Strategies | same | |
| 48 Text Embeddings | differs | Google text-embedding-005 + Google GenAI SDK instead of Voyage AI. See 3.3. |
| 49 The Full RAG Flow | same | |
| 50 Implementing the RAG Flow | unclear | Notes read the same, but video 4:57 vs 5:12. See 3.10. |
| 51 BM25 Lexical Search | same | |
| 52 A Multi-Index RAG Pipeline | same | RRF formula stated identically (1/(rank+1)). |
| 53 Reranking Results | same | Page not in the API lesson list; the API notes contain the same note. |
| 54 Contextual Retrieval | same | Page not in the API lesson list; the API notes contain the same note. |
| 55 Quiz on Retrieval Augmented Generation | Vertex-only | 8 questions; the API lesson list has no RAG quiz. Questions not captured. |
| 56 Extended Thinking | same | Addendum A-12. |
| 57 Image Support | same | Both: up to 100 images per request. |
| 58 PDF Support | same | |
| 59 Citations | same | |
| 60 Prompt Caching | same | |
| 61 Rules of Prompt Caching | differs | Cache duration: 5 minutes here vs 1 hour maximum in the API notes. See 3.4. |
| 62 Prompt Caching in Action | same | Addendum A-13. |
| 63 Quiz on Features of Claude | differs | 6 questions here vs 7. See 3.8. |
| 64 Introducing MCP | same | |
| 65 MCP Clients | same | |
| 66 Project Setup (MCP CLI project) | same | Wording matches the API notes, including "add API key to .env". Trap, see section 4 and 3.10. |
| 67 Defining Tools with MCP | same | |
| 68 The Server Inspector | same | Both: mcp dev [server file]. |
| 69 Implementing a Client | same | |
| 70 Defining Resources | same | |
| 71 Accessing Resources | same | |
| 72 Defining Prompts | differs | MCP Python SDK spelling differs (minor, not Vertex related). See 3.7. |
| 73 Prompts in the Client | differs | list_prompts returns result.props here vs result.prompts (minor, likely a typo). See 3.7. |
| 74 MCP Review | unclear | Vertex notes have the review; API notes have none. See 3.10. |
| 75 Quiz on Model Context Protocol | differs | 7 questions here vs 6. See 3.8. |
| 76 Anthropic Apps | unclear | No Vertex note; API notes have one. |
| 77 Claude Code Setup | unclear | No Vertex note; API notes have one. Video 1:31 vs 1:33. |
| 78 Claude Code in Action | unclear | No Vertex note; API notes have one. |
| 79 Enhancements with MCP Servers | unclear | No Vertex note; API notes have one. |
| 80 Parallelizing Claude Code | unclear | No Vertex note; API notes have one (page not in the API lesson list). |
| 81 Automated Debugging | unclear | No Vertex note; API notes have one (page not in the API lesson list). |
| 82 Computer Use | unclear | No Vertex note; API notes have one (page not in the API lesson list). |
| 83 How Computer Use Works | unclear | No Vertex note; API notes have one (page not in the API lesson list). |
| 84 Agents and Workflows | same | |
| 85 Parallelization Workflows | same | |
| 86 Chaining Workflows | same | |
| 87 Routing Workflows | same | |
| 88 Agents and Tools | same | Different extra example (video agent tools) only. |
| 89 Environment Inspection | same | |
| 90 Workflows vs Agents | same | |
| 91 Quiz on Agents and Workflows | unclear | 7 questions in both; text not captured. |
| 92 Final Assessment Quiz | differs | 24 questions here vs 23 in the API final assessment. See 3.8. |
| 93 Course Wrap Up | unclear | No text; video 3:12 in both. |

### 2b. Lessons that exist in the API course but not in the Vertex course

| API lesson | In Vertex course? | Note |
|---|---|---|
| 04 Getting an API key (console.anthropic.com, workspace "Default", Create Key) | No | Replaced by Vertex AI Setup. See 3.1 and 3.5. |
| 40 Fine Grained Tool Calling | No | Absent. See 3.5. |
| 58 Code Execution and the Files API | No | Absent. See 3.5. |

Counts for the 93 Vertex lessons: same 59, differs 12, Vertex-only 2, unclear 20.

---

## 3. Differences in detail

### 3.1 Setup and authentication (lessons 03 and 04)

What changes
- Lesson 03 (Accessing the API), step 1: the client sends user text to your server and "never access Vertex directly from client - credentials must stay secret" (API notes: never access the Anthropic API directly, "to keep API key secret").
- Step 2, required parameters: Vertex notes list "model name, messages list, max_tokens limit" only. API notes list "API key + model name + messages list + max_tokens". No API key appears anywhere in the Vertex flow.
- Step 2, SDK languages: Vertex notes say "(Python/TypeScript/Go/Ruby)". API notes say "(Python, TypeScript, JavaScript, Go, Ruby) or plain HTTP". The Vertex notes do not say JavaScript or plain HTTP are unsupported; the list is just shorter (see 3.10 for the gap).
- Steps 3-5 (four generation stages, stop on max_tokens or end-of-sequence token, response with text + usage + stop reason) are the same.
- Lesson 04 (Vertex AI Setup) replaces the API-key lesson. The course's own wording:

Step One: ensure Anthropic models are enabled in Vertex
- Go to https://console.cloud.google.com/vertex-ai/dashboard
- Left nav: click 'Model Garden'
- 'Search models' box: enter 'Anthropic'
- Click on the model that you want to use.

Step Two: enable the model
- On the model information page, you may need to click the 'Enable' button.
- If you do not see an 'Enable' button, you already have access to the model.

Step Three: install the gcloud CLI
- Install and authenticate using https://cloud.google.com/sdk/docs/install

Step Four: login and set up authentication with the gcloud CLI
```
gcloud init
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default login
```
- "The Anthropic SDK will automatically use these credentials when attempting to access Vertex."

```
  ANTHROPIC API COURSE                    VERTEX COURSE
  --------------------                    -------------
  console.anthropic.com                   console.cloud.google.com/vertex-ai/dashboard
    -> Get API Keys -> Create Key           -> Model Garden -> search 'Anthropic'
       (workspace 'Default', a name)           -> click model -> [Enable] if shown
    -> copy key (shown once)                -> gcloud init, gcloud auth login
  .env: ANTHROPIC_API_KEY="..."             -> gcloud config set project YOUR_PROJECT_ID
  python-dotenv loads it                    -> gcloud auth application-default login
  client built from the key               SDK picks up those credentials by itself
```

Java sketch (illustrative, not from the course). The course gives no REST endpoint, token format or Java SDK, so every type name below is a placeholder.
```java
// illustrative, not from the course; all type names are placeholders
record VertexTarget(String region, String projectId) { }   // course: region="global", project_id

interface GoogleCredentialSource {
    // course: the SDK uses the gcloud credentials automatically.
    // How a Java app would obtain them is NOT in the course.
    String accessToken();
}
```

What does NOT change: the server-side-only rule, the stateless request model, and the three required request arguments.

### 3.2 Client construction and the first request (lesson 05)

The course's own wording
- Setup step 1: install `%pip install "anthropic[vertex]"` (API course: `pip install anthropic python-dotenv`).
- Step 2: `from anthropic import vertex`, then instantiate the client "with region="global" and project_id" (API course: store the key in .env as ANTHROPIC_API_KEY, load it with python-dotenv, create the client).
- Step 3: define a model version variable for reuse.
- Project ID = "unique identifier from Google Cloud console".
- Model naming: the Vertex notes say only "model = specific Claude model version string". The API notes give `claude-3-sonnet` as the example variable. The Vertex notes give no concrete model string, and the Model Garden step says only to search 'Anthropic' and click the model you want. Do not memorize any model ID from this course.
- Unchanged: `client.messages.create()` with model, max_tokens (a safety limit, not a target) and messages; user and assistant message shapes; `message.content[0].text` extracts the text.

Java sketch (illustrative, not from the course; placeholders only)
```java
// illustrative, not from the course
final class ClaudeOnVertex {
    private final VertexTarget target;          // region="global" + project id
    private final GoogleCredentialSource creds; // no API key field at all

    ClaudeOnVertex(VertexTarget target, GoogleCredentialSource creds) {
        this.target = target;
        this.creds = creds;
    }

    // Same three required arguments as the API course: model, max_tokens, messages.
    String createMessage(String modelVersionString, int maxTokens, java.util.List<String> messages) {
        throw new UnsupportedOperationException("transport not specified by the course");
    }
}
```

### 3.3 Embeddings: Google, not Voyage (lessons 48 and 50)

- Vertex (lesson 48): "Google's text-embedding-005 = specific embedding model available on Vertex AI". Implementation: "use Google GenAI SDK, create client, pass text through model to get embedding vectors".
- API notes (lesson 46 there): "Anthropic recommends Voyage AI for embedding generation. Requires separate account/API key. Free to start, easy integration via SDK."
- So on Vertex the embedding step uses a second Google SDK, not the Anthropic SDK and not Voyage AI, and no separate account/API key is mentioned.
- Same: what an embedding is (a long list of numbers in the range -1 to +1), semantic search, the RAG process. Everything downstream (chunking, normalization, vector store, cosine distance, BM25, reciprocal rank fusion, reranking, contextual retrieval) is taught the same.
- Lesson 50 (Implementing the RAG Flow) notes read the same as the API course, but the video is 4:57 vs 5:12; the notes do not say what differs (see 3.10).

```
  RAG on Vertex: which SDK does what
  ----------------------------------
  chunk text (your code)
     |
     v
  embed chunks  --> Google GenAI SDK + text-embedding-005   (Vertex-only)
     |                       [API course: Voyage AI, separate account/key]
     v
  vector store, cosine distance, BM25, RRF, rerank   (same as API course)
     |
     v
  prompt + retrieved chunks --> Claude via Anthropic SDK Vertex client
```

Java sketch (illustrative, not from the course)
```java
// illustrative, not from the course; interface names are placeholders
interface Embedder { float[] embed(String text); }  // Vertex course: backed by text-embedding-005
interface Llm      { String ask(String prompt); }   // Vertex course: Claude on Vertex
// Downstream retrieval code depends only on these two interfaces,
// which is why only the Embedder implementation changes between the two courses.
```

### 3.4 Prompt cache duration conflict (lesson 61)

- Vertex notes: "Cache Duration = 5 minutes temporary storage".
- API notes: "Cache duration = 1 hour maximum".
- Everything else in the rules note matches: manual cache breakpoint (not default), longhand text block with cache_control, cache covers everything up to and including the breakpoint, content before the breakpoint must be identical, order tools -> system prompt -> messages, up to 4 breakpoints, 1024-token minimum.
- Caution: the video is 6:41 in both courses, which hints that the two note files disagree about what is probably the same lesson. The sources do not say the number is Vertex-specific. For an exam on this course, answer with the number from the course you are being tested on; do not assume either is a platform rule.

### 3.5 Lessons that exist in the API course but not in the Vertex course

- API 04 Getting an API key: replaced by Vertex AI Setup (3.1). Nothing about python-dotenv, .env or ANTHROPIC_API_KEY is taught on the setup path in the Vertex course.
- API 40 Fine Grained Tool Calling (input_json_delta events, fine-grained mode, validation trade-off): no Vertex lesson or note. Read it in the API notes.
- API 58 Code Execution and the Files API: no Vertex lesson or note. Read it in the API notes.
- The Vertex notes do not say these features are unavailable on Vertex AI; they simply do not cover them. Do not infer availability either way.

### 3.6 Lessons that exist only in the Vertex course (page-level)

- 04 Vertex AI Setup: Vertex-only content (3.1).
- 55 Quiz on Retrieval Augmented Generation: 8 questions, text not captured.
- Pages 13, 41, 42, 53, 54 (Controlling Model Output, The Batch Tool, Tools for Structured Data, Reranking Results, Contextual Retrieval) and 74 (MCP Review) and 80-83 are not in the API course's lesson list under those names, but the API official notes contain notes for 13, 41, 42, 53, 54, 80-83 (so these are "same" or "unclear", not new teaching). MCP Review (74) is the reverse: the Vertex notes have it, the API notes do not.

### 3.7 MCP Python SDK spelling (lessons 72 and 73; minor, not Vertex related)

| Item | Vertex notes | API notes |
|---|---|---|
| Prompt decorator | `@prompt(name="format", description="rewrites document in markdown")` | `@mcpserver.prompt` decorator with name and description |
| Import / message type | `from mcp.server.fastmcp.prompts import BaseMessage`; `BaseMessage.user(prompt_text)`; return type `list[BaseMessage]` | `base.UserMessage` objects |
| Client list call | `list_prompts()` = `await self.session.list_prompts()`, return `result.props` | same call, return `result.prompts` |
| Client get call | `get_prompt(prompt_name, arguments)`, return `result.messages` | same |

The two courses spell the same MCP calls differently (likely different SDK versions at recording time, or a transcription slip for result.props). The notes do not say which is current; check the SDK you actually use.

### 3.8 Quiz and assessment question counts (page-level facts)

| Quiz | Vertex course | API course |
|---|---|---|
| Accessing Claude with the API | 7 (lesson 16) | 8 (lesson 15) |
| Prompt evaluation | 4 (lesson 24) | 6 (lesson 23) |
| Prompt engineering techniques | 6 (lesson 31) | 5 (lesson 30) |
| Tool use with Claude | 7 (lesson 45) | 7 (lesson 43) |
| Retrieval Augmented Generation | 8 (lesson 55) | none in lesson list |
| Features of Claude | 6 (lesson 63) | 7 (lesson 59) |
| Model Context Protocol | 7 (lesson 75) | 6 (lesson 71) |
| Agents and workflows | 7 (lesson 91) | 7 (lesson 83) |
| Final assessment | 24 (lesson 92) | 23 (lesson 84) |
| Satisfaction survey | 3 (lesson 11) | 3 (lesson 11) |

Question text and answers are not in the sources for either course, so only the counts can be compared.

### 3.9 Addenda: same teaching, extra detail in the Vertex wording

These do not change the lesson's status. Each is a detail the Vertex note states that the API note does not spell out. None is tied to Vertex.

- A-1 (02 Overview): Opus "can work independently for hours", "supports reasoning capability", "moderate latency"; Sonnet "fast text generation", precise code edits "without breaking functionality"; example mix: Haiku for user interactions, Sonnet for business logic, Opus for complex reasoning tasks.
- A-2 (08 System Prompts): "system parameter cannot be None" so include it only when a prompt exists (the API note says the same thing as excluding the key); best practice: make system prompts configurable rather than hard-coded.
- A-3 (10 Temperature): the course helper's temperature "defaults to 1.0 for creativity"; the API note states no default.
- A-4 (12 Streaming): event types listed as message_start, content_block_start, content_block_delta, content_block_stop, message_delta, message_stop (the API note lists four, with content_block_stop/message_stop together).
- A-5 (13 Controlling Model Output): names the parameter `stop_sequences` taking a list of strings; response continues "from end of pre-filled text".
- A-6 (14 Structured Data): example "generate event bridge rule as JSON"; clean up with text.strip() or JSON.loads().
- A-7 (22 Code Based Grading): pre-fill with "```code" because the exact format is not known beforehand.
- A-8 (25 Prompt Engineering): evaluator concurrency "start low like 3, reduce to 1 if rate limits hit" (the API note says adjust max_concurrent_tasks to rate limits).
- A-9 (37 Sending Tool Results): arguments read from response.content[1].input and passed with **kwargs.
- A-10 (41 Batch Tool): request rounds drop "from N+1 to 2".
- A-11 (44 Web Search): the search-query blocks are called "server tool use blocks" (the API note says "tool use blocks"); allowed_domains example "NIH.gov".
- A-12 (56 Extended Thinking): the request carries a thinking object with type="enabled" and budget_tokens (the API note names the helper arguments thinking and thinking_budget); same 1024 minimum and max_tokens-above-budget rule.
- A-13 (62 Prompt Caching in Action): example token counts: base message about 14, tool schemas about 1.7K, system prompt about 6.3K.

### 3.10 Source gaps (unclear items and open conflicts)

- Source gap: lessons 01, 07, 09, 15, 23, 30, 93 have no captured text in either course (video-only pages); quizzes 45 and 91 and the survey (11) have equal question counts but no text.
- Source gap: lesson 50 - notes show no difference, but the video is 15 seconds shorter (4:57 vs 5:12); the notes do not say what changed (possibly the embedding call).
- Source gap: lesson 74 (MCP Review) - the Vertex notes have it (tools = model-controlled, resources = app-controlled, prompts = user-controlled); the API notes have no MCP Review note, so sameness cannot be checked.
- Source gap: lessons 76-83 - the Vertex official notes contain no notes for Anthropic Apps, Claude Code Setup, Claude Code in Action, Enhancements with MCP Servers, Parallelizing Claude Code, Automated Debugging, Computer Use or How Computer Use Works, while the API notes do. Whether Vertex teaches these differently cannot be determined.
- Source gap: lesson 03 - the SDK language list omits JavaScript and plain HTTP; the notes do not say whether that is a real limit.
- Source gap: lesson 61 - the 5-minute vs 1-hour conflict is not explained by the sources (see 3.4).
- Source gap: lesson 66 - the MCP project setup still says "add API key to .env" while the Vertex flow has no API key; how that starter project authenticates to Vertex is not stated.
- Source gap: not stated anywhere in the Vertex sources: model IDs or version strings, regions other than region="global", IAM roles, quotas, billing or prices, per-model availability, and whether features such as extended thinking, web search, citations, PDF support or prompt caching behave differently on Vertex.

---

## 4. Platform-specific traps and Common Mistakes (drawn only from the Vertex course)

| Mistake | Fix |
|---|---|
| Calling Vertex directly from a browser or mobile client | Client calls your server; the server calls Vertex. Credentials must stay secret. |
| Following the API course's key steps (console.anthropic.com, Create Key, .env, python-dotenv) on the Vertex course | There is no API key in the Vertex flow. Do the Model Garden and gcloud steps instead. |
| Installing plain `anthropic` and building the default client (inference from the course's install command) | `%pip install "anthropic[vertex]"`, then `from anthropic import vertex` and create the client with region="global" and your project_id. |
| Leaving out region or project_id when creating the client | Pass region="global" and project_id; the project ID is the unique identifier from the Google Cloud console. |
| Searching Model Garden and not finding access | Search 'Anthropic', open the model you want, click 'Enable' if the button is shown; no button means you already have access. |
| Skipping the project/credential commands after logging in | Run gcloud config set project YOUR_PROJECT_ID and gcloud auth application-default login (login commands alone are listed separately: gcloud init, gcloud auth login). The SDK then uses the credentials automatically. |
| Assuming the RAG embedding step uses Voyage AI (API course) | In this course it is Google's text-embedding-005 through the Google GenAI SDK. |
| Reusing the API course's cache lifetime for Vertex answers | The Vertex note says 5 minutes; the API note says 1 hour maximum. Know which course the question comes from; the sources do not resolve it. |
| Expecting fine-grained tool calling or the Code Execution / Files API in this course | Neither is taught here; use the API notes and do not infer Vertex availability. |
| Expecting Claude Code, computer-use or Anthropic Apps notes from this course | The Vertex official notes have none for lessons 76-83; use the API notes. |
| Trusting "add API key to .env" in the MCP project setup as a Vertex instruction | The source does not reconcile it with the gcloud flow; follow the starter project's readme.md (the course says to check it) and do not invent a Vertex key step. |
| Copying MCP prompt code between the two courses unchanged | The SDK spellings differ (3.7); use the names your installed SDK exposes. |
| Assuming a model ID from memory | The Vertex course names no model string; pick the model you find in Model Garden. |

---

## 5. Short self-test (differences only)

1. Q: Where in the Google Cloud console do you find a Claude model, and what do you search for?
   A: Vertex AI dashboard (console.cloud.google.com/vertex-ai/dashboard), left nav 'Model Garden', search box 'Search models', enter 'Anthropic', then click the model you want.
2. Q: You open the model page and see no 'Enable' button. What does that mean?
   A: You already have access to the model.
3. Q: Which four commands does the course give for gcloud login and credentials?
   A: gcloud init; gcloud auth login; gcloud config set project YOUR_PROJECT_ID; gcloud auth application-default login.
4. Q: How does the Anthropic SDK authenticate to Vertex in this course?
   A: It automatically uses the credentials set up with gcloud; there is no API key and no .env file.
5. Q: Which package install does the course use, and how is the client created?
   A: `%pip install "anthropic[vertex]"`, then `from anthropic import vertex` and instantiate the client with region="global" and project_id.
6. Q: What is the project ID and where does it come from?
   A: The unique identifier of your Google Cloud project, taken from the Google Cloud console.
7. Q: Which request arguments are still required once the client exists?
   A: model, max_tokens and messages (same as the API course; the access-flow note lists no API key).
8. Q: Which embedding model and SDK does the Vertex RAG lesson use, and what replaces the API course's Voyage AI step?
   A: Google's text-embedding-005 via the Google GenAI SDK (create a client, pass the text through the model).
9. Q: What cache duration does the Vertex "Rules of Prompt Caching" note state, and how does the API note differ?
   A: 5 minutes; the API notes say 1 hour maximum (a conflict the sources do not explain).
10. Q: Name two API-course lessons that the Vertex course does not have.
    A: Fine Grained Tool Calling and Code Execution and the Files API (also the Getting an API key lesson, replaced by Vertex AI Setup).
11. Q: Which lessons have no notes in the Vertex official notes although the pages exist?
    A: 76-83 (Anthropic Apps, Claude Code Setup, Claude Code in Action, Enhancements with MCP Servers, Parallelizing Claude Code, Automated Debugging, Computer Use, How Computer Use Works).
12. Q: Does the Vertex course tell you which model ID to use?
    A: No. It says only "specific Claude model version string" and to pick the model you find in Model Garden.
