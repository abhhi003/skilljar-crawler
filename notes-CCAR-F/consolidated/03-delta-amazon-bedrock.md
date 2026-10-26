# Delta: Claude with Amazon Bedrock vs the Anthropic API - Study Notes

## 1. How to use this file

- Read the core Anthropic API notes first (course 02). This file only records what the Bedrock course (course 06) teaches differently, adds, or leaves out.
- Section 2 lists every Bedrock lesson and says whether it matches the API course. Skip every row marked "same".
- Section 3 explains each difference with the course's own wording. Section 4 collects traps, Section 5 is a self-test on the differences only.
- Java snippets are labelled "illustrative, not from the course". The course itself uses Python and Boto3. Class and method names in the Java sketches are placeholders, not AWS SDK names.

Sources compared: the official course notes for course 06 (Bedrock) against course 02 (Anthropic API), matched by lesson content, not only by title.

## 2. Same-as-API checklist (all 63 Bedrock lessons)

Legend: same = teaching and facts match the API notes. differs = a fact, step, parameter, limit or availability is stated in the Bedrock notes and is absent from, or stated differently in, the API notes. Bedrock-only = a lesson that exists only in the Bedrock course. unclear = the notes on one side are too thin to decide.

"differs (general)" means the extra detail is not platform-specific (it would hold on the API too, but the API notes do not state it).

| # | Bedrock lesson (API counterpart) | Same as API? | Note |
|---|---|---|---|
| 1 | Accessing the API | differs | Bedrock framing: "AWS Bedrock API is not the Anthropic API"; request carries a model ID; no API key, SDK list or max_tokens in the notes. See 3.1 |
| 2 | Making a Request | differs | Boto3 client with a region, model ID or inference profile ID, converse call, content is a list of parts. See 3.2 |
| 3 | Multi-Turn Conversations | differs (general) | Same stateless idea. Bedrock notes add: never two consecutive messages with the same role. See 3.12 |
| 4 | System Prompts | differs | `system` keyword in the converse call, passed as a list of dicts with a text field, at least 1 character. See 3.4 |
| 5 | Temperature | differs | Passed in `inference_config`; Bedrock notes also state default 1.0. See 3.5 |
| 6 | Streaming (Response Streaming) | differs | "Converse Stream" function, `stream` key, different event access path. See 3.6 |
| 7 | Controlling Model Output | differs | Pre-fill is the same; stop sequences go in `inference_config`. See 3.5 |
| 8 | Structured Data | same | Same prefill plus stop-sequence technique |
| 9 | Prompt Evaluation | same | Same three paths, same trap warning |
| 10 | A Typical Eval Workflow | same | Same iterative loop |
| 11 | Generating Test Datasets | differs | Dataset generation uses an inference profile for the Haiku model. See 3.3 |
| 12 | Running the Eval | same | Same three functions, same roughly 31 second runtime with Haiku |
| 13 | Model Based Grading | same | Same grader types |
| 14 | Code Based Grading | same | Same validators and (model_score + syntax_score) / 2 |
| 15 | Prompt Engineering | same | Same meal-plan setup |
| 16 | Being Clear and Direct | same | Same, score 2.32 to 3.92 |
| 17 | Being Specific | same | Same, score 3.92 to 7.86 |
| 18 | Structure with XML Tags | same | Same |
| 19 | Providing Examples | same | Same |
| 20 | Introducing Tool Use | same | Same five-step flow. Bedrock adds only a study tip about code order |
| 21 | Tool Functions (API: Project Overview + Tool Functions) | same | Same three tools and best practices; API's Project Overview is folded in here. See 3.15 |
| 22 | JSON Schema for Tools (API: Tool Schemas) | differs | Different schema-creation recipe, no ToolParam. See 3.8 |
| 23 | Handling Tool Use Responses (API: Handling Message Blocks) | differs | "Parts" not "blocks"; tool choice options listed here. See 3.7 |
| 24 | Running Tool Functions (API: part of Implementing Multiple Turns) | differs | Tool result part uses `status` and a list content. See 3.9 |
| 25 | Sending Tool Results | same | Same: full history plus schemas again. Field names differ, see 3.9 |
| 26 | Multi-Turn Conversations with Tools | same | Same stop_reason loop |
| 27 | Adding Multiple Tools (API: Using Multiple Tools) | same | Same schema plus dispatcher steps |
| 28 | Batch Tool Use (API: The Batch Tool) | same | Same invocations design |
| 29 | Structured Data with Tools (API: Tools for Structured Data) | differs | tool_choice shape differs. See 3.7 |
| 30 | Flexible Tool Extraction | Bedrock-only | Extra lesson, no counterpart in the API notes. See 3.16 |
| 31 | The Text Editor Tool (API: The Text Edit Tool) | differs | Exact tool name strings per model. See 3.10 |
| 32 | Introducing RAG | same | Same |
| 33 | Text Chunking Strategies | same | Same three strategies |
| 34 | Text Embeddings | differs | Bedrock names Titan embed text V2 and 1024 elements; API names Voyage AI. See 3.11 |
| 35 | The Full RAG Flow | same | Same pipeline, same cosine similarity and distance |
| 36 | Implementing the Rag Flow | same | Same, distances 0.71 and 0.72 |
| 37 | BM25 Lexical Search | same | Same |
| 38 | A Multi-Search RAG Pipeline (API: Multi-Index) | same | Same RRF formula |
| 39 | Reranking Results | same | Same |
| 40 | Contextual Retrieval | same | Same |
| 41 | Extended Thinking | unclear | Parameter names agree; Bedrock notes are thin. See Source gap below |
| 42 | Image Support | differs | Limit stated as 20 images per request vs 100 in API notes. See 3.13 |
| 43 | Prompt Caching | same | Same concept |
| 44 | Rules of Prompt Caching | differs | cache point part, 5 minutes, no 4-breakpoint limit stated. See 3.14 |
| 45 | Prompt Caching in Action | differs | cache_point with type="default", different usage field names. See 3.14 |
| 46 | Introducing MCP | same | Same |
| 47 | MCP Clients | same | Same |
| 48 | Project Setup (MCP) | differs | Environment variables are bedrock region plus model ID, not an API key. See 3.17 |
| 49 | Defining Tools with MCP | same | Same |
| 50 | The Server Inspector | same | Same `mcp dev` |
| 51 | Implementing a Client | differs | Extra schema conversion `to_bedrock_tools()`. See 3.17 |
| 52 | Defining Resources | same | Same |
| 53 | Accessing Resources | same | Same |
| 54 | Defining Prompts | same | Same |
| 55 | Prompts in the Client | same | Same (see 3.19 for a likely typo) |
| 56 | MCP Review | Bedrock-only | Extra lesson: tools, resources, prompts control patterns. See 3.16 |
| 57 | Claude Code in Action | differs (general) | Bedrock notes add the `/clear` command. See 3.12 |
| 58 | Enhancements with MCP Servers | same | Same `claude mcp add` |
| 59 | Parallelizing Claude Code | differs (general) | Bedrock notes add `/project:command-name` syntax. See 3.12 |
| 60 | Automated Debugging | same | Same GitHub Action plus CloudWatch flow |
| 61 | Computer Use | same | Same |
| 62 | How Computer Use Works | differs | Setup adds a local AWS profile. See 3.17 |
| 63 | Qualities of Agents | Bedrock-only | Extra lesson, no counterpart title in the API notes. See 3.16 |

Tally: same 37, differs 22, Bedrock-only 3, unclear 1 (total 63).

Source gap: Extended Thinking (#41). The Bedrock notes name a "thinking parameter (boolean)" and "thinking_budget parameter (minimum 1024 tokens)", matching the API notes, but do not say where they sit in the converse request, and do not repeat the API rule that max tokens must exceed the budget. Bedrock calls the response piece a "reasoning content part"; the API notes call it a "thinking block". Treat as unverified difference.

## 3. Differences in detail

### 3.0 The big picture

```
Anthropic API course                     Bedrock course
--------------------                     --------------
Anthropic SDK client                     Boto3 client -> "Bedrock runtime service" + region
API key + model name                     Model ID (use inference profile ID)
client.messages.create(...)              client.converse(modelId=..., messages=[...])
content: "text"  or  blocks              content: [{"text": "..."}]   (list of parts)
system="string"                          system = list of {text: ...}
temperature=, stop_sequences= top level  inside inference_config
cache_control {type: ephemeral}          cache_point with type="default"
```

### 3.1 Accessing the API (service and docs)

- The course states the "Critical distinction": "AWS Bedrock API is not the Anthropic API. Same Claude models (Sonnet, Haiku) but different services, different SDKs, different documentation. Must use AWS Bedrock-specific resources."
- Flow in the course: user submits text, server receives request, "Bedrock client makes API call to AWS Bedrock", request includes user message plus model ID, model returns an assistant message, server sends it to the browser.
- Key components named: user message, model ID, assistant message.
- The Bedrock notes do NOT mention an API key, the Anthropic SDK language list, max_tokens, or the four generation stages (tokenization, embedding, contextualization, generation) that the API notes cover.
- Authentication: the only auth-related line in the Bedrock notes is the Computer Use setup ("local AWS profile"; see 3.17).

Source gap: the Bedrock notes say nothing about how credentials, IAM permissions or model access are granted. Do not assume.

### 3.2 Making a Request (client construction, model ID, message shape)

Three requirements stated by the course:

1. "Boto3 client" connecting to the "Bedrock runtime service" (specify a region, the example is US West 2).
2. "Model ID" identifying the model.
3. "User message" as a specially formatted object.

Model ID, as the course states it:

- "Not all models hosted in every region."
- "Wrong region = cryptic error messages."
- "Inference profiles = route requests to regions where model actually exists."
- "Use inference profile ID instead of direct model ID for guaranteed routing."
- "Found in AWS console under cross region inference not model catalog."

Message shapes:

```
API course                           Bedrock course
{"role":"user","content":"text"}     {"role":"user","content":[{"text":"your input"}]}
```

- "Content is list because messages can contain multiple parts (text + images)."
- Request call as written: `client.converse(modelId="profile_id", messages=[user_message])`.
- Reading the reply: `response["output"]["message"]["content"][0]["text"]` (API course: `message.content[0].text`).

Illustrative, not from the course (Java, placeholder types only):

```java
// Illustrative, not from the course. Shows only the nesting the course describes:
// a message has a role and a LIST of parts, each part holding "text".
Map<String, Object> userMessage = Map.of(
    "role", "user",
    "content", List.of(Map.of("text", "your input")));
// Sending it needs a Bedrock runtime client, a region, and an inference profile ID.
// The course does not show Java; the client type and call name are placeholders:
// response = bedrockRuntimePlaceholder.converse(inferenceProfileId, List.of(userMessage));
```

Source gap: the course names no concrete model ID or inference profile ID string, and does not say whether max tokens is required or where it is set.

### 3.3 Generating Test Datasets (model naming in evals)

- Same eval design as the API course. The Bedrock-only detail: dataset generation "uses inference profile for Haiku model (speed optimization)", i.e. models in evals are also referenced through inference profile IDs.

### 3.4 System Prompts

- Passed "to converse function using system keyword parameter".
- Format: "system prompt must have at least 1 character, passed as list with dictionary containing text field."
- Best practice stated: make the parameter optional in chat helpers and default it to none "to avoid empty string errors".
- API course contrast: plain string via `system=`, and when absent the key is excluded from params entirely.

### 3.5 Temperature, stop sequences and other inference parameters

- Temperature: "Pass temperature parameter in inference_config when calling converse function."
- Stop sequences: "Add stop_sequences parameter to chat function, pass to inference_config." Multiple sequences allowed; the stop string itself is excluded from the output.
- Default temperature stated as 1.0 (the API notes do not state a default).
- Pre-filling is the same technique: append a manual assistant message to the list, then concatenate the pre-fill text with the returned text.

```
client.converse(
    modelId=...,
    messages=[...],
    system=[{text: ...}],
    inference_config={temperature: ..., stop_sequences: [...]}   # names as the course writes them
)
```

(The block above is a layout sketch of the course's wording, not exact syntax.)

### 3.6 Streaming

- Function: "Converse Stream function" instead of `stream=True` or `messages.stream()`.
- The response "contains 'stream' key = event stream object/generator"; iterate it for events.
- Events listed: message start, content block delta, content block stop, message stop, metadata (last event). The API notes instead list message_start, content_block_start, content_block_delta, content_block_stop/message_stop.
- Text chunk path: `event['content_block_delta']['delta']['text']`, and only content block delta events matter.
- Course code pattern: `for event in response['stream']: if 'content_block_delta' in event: chunk = ...; total_text += chunk`.
- Not in the Bedrock notes: `text_stream` and `get_final_message()` helpers; the course tells you to collect chunks yourself.

Source gap: the exact Python function name for streaming is written only as "Converse Stream" / "converse stream" in the notes. Do not assume a snake_case name.

### 3.7 How tools and tool_choice are passed, and the response vocabulary

- Vocabulary: the Bedrock course says message "parts" (text part, tool_use part), where the API course says "blocks".
- The response is "a dictionary with stop_reason key"; `stop_reason = "tool_use"` signals a tool call. (Same value as the API course.)
- tool_use part fields: `tool_use_id`, `name`, `input`.
- Helper changes: `chat()` returns text and parts; `add_assistant_message()` / `add_user_message()` accept a string or a list of parts; the "content parameter replaces text parameter".
- Tool choice, as the Bedrock course lists it:

```
auto                       -> Claude decides (default)
any                        -> forces Claude to use any available tool
{tool: {name: "tool_name"}} -> forces a specific tool
```

  API course form for contrast: `tool_choice = {"type": "tool", "name": "your_tool_name"}`. Only the specific-tool form appears in the API notes; auto and any are not described there.
- In the Structured Data with Tools lesson, Bedrock says tool_choice options are "auto", "any", or specific tool name, and to extract the data from the tool call arguments, then end the conversation. The API notes read it from `response.content[0].input`; Bedrock gives no equivalent access path.
- The Bedrock notes do not state which request field carries the tool list beyond "include schema in request".

Source gap: no top-level request field name for the tool list or the wrapper key around each schema is given in the Bedrock notes. Use placeholders.

### 3.8 Tool schemas (JSON Schema for Tools)

- Structure per Bedrock: "name/description at top, JSON object defining function parameters". The API notes call the parameter schema `input_schema`; the Bedrock notes never name that key.
- Creation recipe in Bedrock: (1) dict of arguments with sample values, (2) convert to JSON (Python True becomes JSON true), (3) use an online "JSON to JSON schema converter", (4) remove the `$schema` statement, (5) add a description to each property. Optionally use Claude to write descriptions from the function code.
- API recipe: paste the function into Claude.ai with the prompt about best practices and the attached Anthropic tool-use docs, copy the schema.
- API course also wraps schemas in `ToolParam` from `anthropic.types`; there is no equivalent in the Bedrock notes.
- Same in both: 3 to 4 sentence overall description (what, when, what it returns).

### 3.9 Tool results (field names)

```
API course tool_result block                 Bedrock course tool result part
{type: "tool_result",                        {tool_result: {tool_use_id,
 tool_use_id: ...,                                          content: [text output],
 content: "<JSON string>",                                  status: success | error}}
 is_error: true | false}
```

- Bedrock: error flag is `status` with success/error, and content is a list holding the text output. API: `is_error` boolean and content is a JSON string.
- Extraction: Bedrock filters parts for "dictionaries containing 'tool_use' key"; API filters blocks with `type="tool_use"`.
- Same in both: wrap execution in try/except and report errors back so Claude can retry; unique tool use IDs pair requests with results; send full history plus tool schemas again; results go in a user message.

Illustrative, not from the course (Java, placeholder shapes only):

```java
// Illustrative, not from the course. Mirrors the Bedrock wording for a tool result part.
Map<String, Object> toolResultPart = Map.of(
    "tool_result", Map.of(
        "tool_use_id", toolUseId,
        "content", List.of(Map.of("text", jsonOutput)),
        "status", "success"));   // "error" when the tool function threw
```

### 3.10 Text editor tool names

- Bedrock: "Required Tool Names: Claude 3-7: 'str_replace_editor'; Claude 3-5: 'str_replace_based_edit_tool'. Must use exact string IDs for AWS Bedrock."
- The JSON schema is "provided by Claude automatically"; you write the implementation of all five commands: view, str_replace, create, insert, undo_edit.
- API course: send a minimal stub (name plus a type string whose date varies by model version, 3.5 vs 3.7). The Bedrock notes do not mention a type string.

### 3.11 Embeddings

- Bedrock: "Multiple embedding models available (e.g., Titan embed text V2)"; output is "typically 1024 elements, values -1 to +1"; "Simple API call to embedding service".
- API course: "Anthropic recommends Voyage AI", requiring a separate account and API key.
- Everything else in the RAG lessons (chunking, cosine math, BM25, RRF, reranking, contextual retrieval) is the same.

### 3.12 General details only Bedrock states (not platform-specific)

- Multi-turn: "Never have consecutive messages with same role"; pattern must be user, assistant, user, assistant.
- Claude Code in Action: `/clear` resets conversation history (also listed: `claude`, `init`, `# [note]`).
- Parallelizing Claude Code: custom commands accessed with `/project:command-name` syntax; `$ARGUMENTS` placeholder (the latter also appears in the API notes).
- Temperature default of 1.0 (see 3.5).

### 3.13 Image limits

- Bedrock: "Max 20 images per request across all messages", with images as parts in user messages, one image part per image.
- API notes: "Max 100 images per request", with image blocks that carry base64 data or a URL.
- Same in both: token cost depends on pixel dimensions; strong prompting (step by step, one-shot/multi-shot with alternating image and text) is required.
- The Bedrock notes give no image part field layout.

### 3.14 Prompt caching

How caching is expressed:

```
API course                                   Bedrock course
text block carries cache_control             a "cache point" is its own special message part:
  {type: "ephemeral"}                           cache_point with type="default"
breakpoint on last tool in list              cache_point "concatenated to tools list"
system prompt wrapped in text block          cache_point added to system prompt parts
  with cache_control
```

- Bedrock: "Cache Point = special message part that marks where caching should occur - caches all content before the cache point"; content after it is never cached.
- Duration: Bedrock says 5 minutes ("Cache expires after 5 minutes of inactivity"); the API notes say "Cache duration = 1 hour maximum". The two courses disagree as written; answer from the course you are being asked about.
- Minimum 1024 tokens before the cache point (same in both).
- Usage fields: Bedrock `cache_write_input_tokens` and `cache_read_input_tokens`; API `cache_creation_input_tokens` and `cache_read_input_tokens`. The Bedrock notes say to include the `usage` field in the response to monitor caching.
- Bedrock: first request is a cache write, later identical ones are cache reads; changing content above the cache_point invalidates, text changes below it do not.
- Not in the Bedrock notes: the 4-breakpoint maximum, the shorthand/longhand text format rule, and the tools then system then messages processing order.

Illustrative, not from the course (Java, placeholder shapes only):

```java
// Illustrative, not from the course. A cache point is just one more part in the list,
// placed AFTER the content you want cached (system prompt parts or the tools list).
List<Map<String, Object>> systemParts = List.of(
    Map.of("text", longSystemPrompt),                         // must be >= 1024 tokens before the point
    Map.of("cache_point", Map.of("type", "default")));        // shape as the course words it
```

### 3.15 Missing lessons that exist in the API course

These API lessons have no counterpart in the Bedrock notes. Absence from the Bedrock notes does not prove the feature is unavailable on Bedrock; the course is silent.

- Overview of Claude Models (Opus, Sonnet, Haiku selection framework)
- Project Overview (reminder project; its content is folded into Bedrock's Tool Functions lesson)
- Fine Grained Tool Calling (`fine_grained: true`, input_json_delta events)
- The Web Search Tool
- PDF Support
- Citations
- Code Execution and the Files API
- Anthropic Apps
- Claude Code Setup
- Agents and Workflows, Parallelization Workflows, Chaining Workflows, Routing Workflows, Agents and Tools, Environment Inspection, Workflows vs Agents

Source gap: for each missing lesson the Bedrock notes give no availability statement either way.

### 3.16 Extra lessons that exist only in the Bedrock course

- Flexible Tool Extraction: define one tool named "toJSON" taking a flexible object, state the exact properties and types in the prompt text, and tell Claude to call toJSON with that structure. Escape curly braces in F-strings. Trade-off stated: "Slightly lower quality results compared to dedicated schemas". Recommendation: flexible for general extraction, dedicated schemas for critical data.
- MCP Review: Tools are model-controlled (serve the model), Resources are app-controlled (serve the app), Prompts are user-controlled (serve users). Claude.ai examples: buttons below the chat input are prompts, Google Drive document listing is resources, automatic code execution is tools.
- Qualities of Agents: agent is a language model with tool access run repeatedly until the goal is achieved; tool-centric, information gathering focus, context dependency, small focused toolset, "High-value, low-risk tasks", evals are necessary; core loop is tool execution, environment inspection, goal progress, repeat. (Overlaps partly with the API's Agents and Tools and Environment Inspection lessons.)

### 3.17 MCP and Computer Use, platform touches

- MCP Project Setup: starter code needs "environment variables (bedrock region + model ID from previous notebooks)"; API course adds an API key to `.env`.
- MCP Implementing a Client: "MCP tool definitions differ from Bedrock expectations, requires conversion via to_bedrock_tools() function". The API notes have no conversion step.
- How Computer Use Works: setup is "Docker + local AWS profile + simple Docker command" (API: Docker plus a simple command).

### 3.18 Authentication, setup and feature availability summary

| Topic | What B states | Gap |
|---|---|---|
| Package install | not stated | Source gap |
| Credentials | only "local AWS profile" in Computer Use | Source gap |
| Region | required on the Boto3 client | no list of regions |
| Model naming | inference profile ID, found under "cross region inference" | no example IDs |
| Pricing, quotas, IAM | not stated | Source gap |

### 3.19 Possible transcription slip

- In "Prompts in the Client", the Bedrock notes write `list_prompts()` returning `result.props`; the API notes write `result.prompts`. Treat as a slip in the notes; the behaviour taught is the same.

## 4. Platform-specific traps and Common Mistakes

| Mistake | Fix |
|---|---|
| Reading Anthropic API docs or SDK examples for a Bedrock problem | Use Bedrock-specific resources: different service, SDK and documentation |
| Passing a direct model ID and getting cryptic errors | Use the inference profile ID, found under "cross region inference" not "model catalog" |
| Assuming a model is available in any region | Not all models are hosted in every region; the wrong region gives cryptic errors, so rely on the inference profile for routing |
| Sending message content as a plain string | Content must be a list of parts: `[{"text": "..."}]` |
| Reading the reply with the API path `message.content[0].text` | Use `response["output"]["message"]["content"][0]["text"]` |
| Passing the system prompt as a plain string or as an empty string | Pass a list of dicts with a text field, at least 1 character; default the helper parameter to none |
| Putting temperature or stop_sequences as top-level arguments | They go in `inference_config` |
| Looking for `text_stream` or a final-message helper while streaming | Iterate `response['stream']`, use only content block delta events, and accumulate chunks yourself |
| Sending two consecutive messages with the same role | Keep strictly alternating user and assistant |
| Forgetting to concatenate the pre-fill text with the returned text | Claude continues from the end of the pre-fill; stitch both together |
| Expecting `is_error` on a tool result | Bedrock course shape uses `status` (success or error) with a content list |
| Skipping tool schemas on the follow-up request after tool results | Always resend the schemas with full history, or Claude is confused |
| Processing tool requests when stop_reason is not "tool_use" | Only run tools when stop_reason is "tool_use"; otherwise you add empty tool result messages |
| Using the wrong text editor tool name | Claude 3-7 uses "str_replace_editor"; Claude 3-5 uses "str_replace_based_edit_tool"; exact strings are required for Bedrock |
| Sending more than 20 images in one request | Course limit is 20 images across all messages |
| Placing a cache_point after fewer than 1024 tokens | Minimum 1024 tokens before the cache point or nothing is cached |
| Changing content above the cache_point and expecting a hit | Any change above it invalidates the cache and triggers a new cache write |
| Expecting the cache to live beyond 5 minutes of inactivity | Bedrock course says it expires after 5 minutes of inactivity |
| Putting cache_point in the wrong place | Add it to system prompt parts and concatenate it to the tools list |
| Passing MCP tool definitions straight to Bedrock | Convert them with `to_bedrock_tools()` first |
| Building the MCP chatbot without the Bedrock config | Set the bedrock region and model ID environment variables first |
| Typo in the model identifier in production | The Automated Debugging example found an "invalid model identifier" error in the logs caused by a model ID typo; check configuration between environments |

## 5. Short self-test (differences only)

1. Q: Which three things does the course say a Bedrock request needs?
   A: A Boto3 client for the Bedrock runtime service (with a region), a model ID, and a user message.

2. Q: Why should you use an inference profile ID instead of a direct model ID, and where do you find it?
   A: Not all models are hosted in every region, and a wrong region gives cryptic errors; inference profiles route requests to regions where the model exists. Find it in the AWS console under "cross region inference", not "model catalog".

3. Q: How does a Bedrock user message differ in shape from the API course's message?
   A: Content is a list of parts: `{"role": "user", "content": [{"text": "your input"}]}`, rather than a plain string.

4. Q: What are the requirements for the system prompt, and where do temperature and stop sequences go?
   A: System prompt: `system` keyword, a list of dicts with a text field, at least 1 character. Temperature and stop sequences go in `inference_config`.

5. Q: How do you extract streamed text on Bedrock?
   A: Use Converse Stream, iterate `response['stream']`, and for events containing 'content_block_delta' read `event['content_block_delta']['delta']['text']`.

6. Q: What are the three tool choice options listed in the Bedrock course?
   A: auto (default), any (forces use of any available tool), and `{tool: {name: "tool_name"}}` (forces a specific tool).

7. Q: How is a tool result part shaped in the Bedrock course, and what is the error flag?
   A: `{tool_result: {tool_use_id, content: [text output], status: success/error}}`; the flag is `status`, not `is_error`.

8. Q: How is a cache point expressed on Bedrock, and how long does the cache last?
   A: As a special message part, `cache_point` with `type="default"`, added to system prompt parts and concatenated to the tools list; the cache expires after 5 minutes of inactivity, with a 1024 token minimum before the point.

9. Q: Which usage fields show cache activity?
   A: `cache_write_input_tokens` and `cache_read_input_tokens` in the response `usage` field.

10. Q: What is the per-request image limit in the Bedrock course, and what does the API course state?
    A: Bedrock: max 20 images per request across all messages. API course: max 100.

11. Q: What extra step does the MCP client need before sending MCP tools to Bedrock?
    A: Convert MCP tool definitions with `to_bedrock_tools()`.

12. Q: Which embedding model does the Bedrock course name, and what does the API course recommend?
    A: Bedrock: Titan embed text V2 (about 1024 elements). API: Voyage AI, with a separate account and API key.
