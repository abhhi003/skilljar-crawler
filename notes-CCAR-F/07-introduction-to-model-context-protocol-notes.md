# Introduction to Model Context Protocol - Study Notes

Source: Anthropic Academy course "Introduction to Model Context Protocol" (site slug: introduction-to-model-context-protocol; 14 lessons). The site's own full-course notes (10 note blocks) are the primary source. The numbered lesson pages are video pages with only player noise, so they were used only to confirm lesson order and titles.

Conventions used in these notes
- Facts come from the official course notes. Anything not found there is flagged "Source gap:".
- The course builds its MCP server and client in Python (MCP Python SDK). Python names, decorators, method names and CLI steps are quoted exactly in blocks labelled "as the course shows it".
- Java snippets are plain Java (records, interfaces, java.net.http.HttpClient) and every one is labelled "illustrative, not from the course". No MCP SDK class or method names for Java are used or implied.
- The course never shows the raw JSON-RPC wire format. It names message TYPES only (list tools request/result, call tool request/result, read resource request/result). Wire method names and field names are therefore left as placeholders in the Java sketches.

Lesson order (confirmed from the lesson files)
01 Welcome to the course | 02 Introducing MCP | 03 MCP clients | 04 Project setup | 05 Defining tools with MCP | 06 The server inspector | 07 Course satisfaction survey | 08 Implementing a client | 09 Defining resources | 10 Accessing resources | 11 Defining prompts | 12 Prompts in the client | 13 Final assessment on MCP | 14 MCP review

---

## 1. Big Picture

- MCP = Model Context Protocol. It is a communication layer that gives Claude context and tools without developers writing tedious integration code.
- Core architecture: an MCP client connects to an MCP server. The MCP server contains tools, resources and prompts as internal components.
- Problem solved: the traditional approach makes YOU author tool schemas and tool functions for every service (the course's example is GitHub API tools). That becomes a maintenance burden for complex services with many features.
- MCP solution: tool definition and execution move from your server to a dedicated MCP server. The MCP server is the interface to an outside service and wraps its functionality in pre-built tools. Someone else writes and maintains the tools.
- The MCP client is only an intermediary. It does not execute tools; the MCP server does.
- Transport agnostic: client and server can talk over stdin/stdout, HTTP, WebSockets, etc. The common setup is both on one machine using stdin/stdout.
- Three server primitives, each with a different controller:
  - tools: model-controlled (Claude decides when to run them) - serve the model
  - resources: app-controlled (application code decides when to fetch) - serve the app
  - prompts: user-controlled (button click or slash command) - serve the user
- MCP and tool use are complementary, not identical. MCP is about WHO does the work of creating the tools.

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

---

## 2. What MCP Is (lesson 02: Introducing MCP)

Key ideas
- MCP is the layer that supplies Claude with context and tools without hand-written glue per service.
- Without MCP you manually write a tool schema AND a function implementation for each service feature. With MCP those are packaged inside an MCP server by whoever built it.
- Who authors MCP servers? Anyone, but service providers often create the official implementations.
- Versus calling the API directly: MCP saves developer time by supplying pre-built tool schemas and functions rather than you authoring them.
- Relationship to tool use: complementary. MCP does not replace tool use; it changes who writes the tools.
- Core value: outsource tool creation to MCP server implementations instead of custom tool development per integration.

Rules and traps
- Trap: "MCP replaces tool use." The course says they are complementary; the focus is who authors and maintains the tool schemas and functions (not the application developer, when a provider ships the server).

Source gap: lesson 01 (Welcome to the course) is a video with no official-notes block; nothing is recorded for it.

---

## 3. MCP Clients (lesson 03)

Key ideas
- MCP client = the communication interface between your server and the MCP server. It provides access to the server's tools.
- Transport agnostic (stdin/stdout, HTTP, WebSockets, ...). Common: same machine, stdin/stdout.
- Communication = message exchange defined by the MCP spec. Key message types named by the course:
  - list tools request / list tools result: client asks for available tools, server returns the list
  - call tool request / call tool result: client asks the server to run a tool with arguments, server returns the execution result
- The client facilitates; it does not run tools. The MCP server runs them.

Typical flow (course wording)
1. User query arrives at your server.
2. Your server asks the MCP client for tools.
3. MCP client sends a list tools request to the MCP server; the tool list comes back.
4. Your server sends the query plus the tools to Claude.
5. Claude requests a tool execution.
6. Your server asks the MCP client to run the tool.
7. MCP client sends a call tool request to the MCP server.
8. MCP server executes the tool (example: a GitHub API call).
9. Results flow back through the chain; Claude formulates the final response; the user gets the answer.

Rules and traps
- Trap: thinking the client executes the tool. It only relays call tool request/result.
- "Transport agnostic" means the same MCP messages work over different transports; the transport is a deployment choice.

Source gap: the course notes do not give the JSON-RPC wire shape of these messages (method names, field names). Only the message type names above are stated.

---

## 4. Project Setup (lesson 04)

Key ideas
- The learning project is a CLI-based chatbot that implements BOTH an MCP client and an MCP server, purely for education.
- Structure: a custom MCP client connects to a custom MCP server, both inside the same project.
- Document system: fake documents held in memory only, no persistence.
- Server tools: two - read document contents, update document contents.
- Real-world note: normally a project implements either a client OR a server, not both.

CLI steps (as the course shows it)
```
1. Download CLI_project.zip and extract it
2. Configure .env with your API key
3. Install dependencies
4. Run the project:
     uv run main.py        (with UV)
     python main.py        (without UV)
5. Verify: a chat prompt appears and answers a basic query,
   e.g. "what's one plus one"
```

Rules and traps
- Trap: assuming this is a typical production layout. It is not; it combines client and server only to teach both halves.
- Documents are in-memory: restarting loses any edits.

Source gap: the specific dependency-install command and the .env variable name are not in the official notes.

---

## 5. Defining Tools with MCP (lesson 05)

Key ideas
- The MCP Python SDK lets you declare a tool with a decorator plus a typed function, instead of hand-writing JSON schemas.
- Syntax: `@mcp.tool` decorator + function with typed parameters + `Field` descriptions.
- Parameter definition: `Field()` with a `description`, imported from `pydantic`.
- Documents live in an in-memory dictionary: `doc_id` keys, content values.
- SDK benefits: auto-generates the JSON schema from the decorated function, one-line server creation, no manual schema writing.
- Implementation pattern: decorator -> function definition -> parameter typing -> validation -> core logic.
- Error handling: validate that the document exists before operating; raise `ValueError` for a missing document.

The two tools (as the course states them)
- `read_doc_contents`: takes `doc_id` (string); returns the document content from the `docs` dictionary; raises `ValueError` if the doc is not found.
- `edit_document`: takes `doc_id`, `old_string`, `new_string`; performs a find/replace on the document content; includes an existence check.

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

Source gap: the exact decorator arguments, description strings, and the one-line server-creation call are not in the official notes, so the body above is a skeleton, not the course's verbatim code.

Rules and traps
- Always validate existence first, then do the operation; raise ValueError for a missing doc.
- Describe every parameter with `Field(description=...)`; the SDK builds the schema from the signature and these descriptions.
- Trap: writing JSON schemas by hand. The SDK generates them.

---

## 6. The Server Inspector (lesson 06)

Key ideas
- MCP Inspector = an in-browser debugger for testing MCP servers without connecting to a real application.
- Interface: left sidebar with a Connect button; top navigation bar with Resources / Prompts / Tools sections; the Tools section lists available tools; clicking a tool opens a right panel for manual testing.
- Features: live development testing, simulated tool invocation, parameter input fields, success/failure feedback.
- Status: in active development. The UI may change; core functionality stays similar.
- Essential for server development and debugging before production.

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

Rules and traps
- Activate the Python environment before running `mcp dev`.
- Trap: expecting an identical UI to the course video; the course warns the Inspector UI may change.
- Use the Inspector to test the server in isolation; it needs no client or Claude.

Source gap: the port number, the exact URL printed, and the document IDs used in the demo are not in the official notes.

---

## 7. Implementing a Client (lesson 08; lesson 07 is a survey)

Key ideas
- MCP client (course code) = a wrapper class around a client session, handling connection and resource cleanup.
- Client session = the actual connection to the MCP server, from the MCP Python SDK. It must be cleaned up on close.
- Resource cleanup is handled by the connect / cleanup / async enter / async exit functions.
- Purpose: expose server functionality to the rest of your codebase; it is the interface between application code and the server.
- Common practice: wrap the session in a larger class rather than use it directly, for better resource management.

Key functions (as the course shows it)
```python
# list_tools
result = await self.session.list_tools()
return result.tools

# call_tool
return await self.session.call_tool(tool_name, tool_input)
```
(The course states the two bodies as `await self.session.list_tools()` returning `result.tools`, and `await self.session.call_tool(tool_name, tool_input)`. The enclosing function signatures are implied by the names `list_tools()` and `call_tool()`.)

Implementation flow (course wording)
1. The application requests the tool list for Claude.
2. The client calls `list_tools()` to get the server's tools.
3. Claude selects a tool and supplies parameters.
4. The client calls `call_tool()` to execute it on the server.
5. Results go back to Claude.

Testing and integration
- Test by running the MCP client file (`client.py`) directly with a testing harness to verify the connection and the tool listing.
- Then run the CLI and ask Claude something like "what is contents of report.pdf document" to see it use the tool.

Rules and traps
- Trap: forgetting cleanup. The session needs proper shutdown, which is why the wrapper class has connect/cleanup and async enter/exit.
- Trap: using the raw session everywhere. Wrap it.

Illustrative, not from the course: the wrapper idea (own the connection, expose two operations, close it deterministically) in Java using try-with-resources. The class and method bodies are placeholders, not an MCP SDK.

```java
// Illustrative, not from the course. Not an MCP SDK.
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

Source gap: lesson 07 (Course satisfaction survey) is a survey, not captured and not in the official notes; it carries no technical content to record.

---

## 8. Defining Resources (lesson 09)

Key ideas
- Resources = an MCP server feature that exposes data to clients for READ operations.
- Two types:
  - Direct / static: a fixed URI, e.g. `docs://documents`
  - Templated: a parameterized URI with wildcards, e.g. `documents/{doc_id}`
- Resource flow:
  1. client sends a read resource request with a URI
  2. server matches the URI to a resource function
  3. server executes the function and returns the result
  4. client receives the data in a read resource result message
- Implementation: `@mcp.resource` decorator; define the URI (a route-like address); set the MIME type (`application/json`, `text/plain`, etc.).
- Templated resources: the URI parameters become keyword arguments of the function.
- The Python MCP SDK auto-serializes return values to strings.
- Common pattern: one resource per distinct read operation (list items vs fetch a single item).
- MIME types are hints to the client about the returned data format, so it can deserialize correctly.

As the course shows it (names only)
```python
# @mcp.resource(<uri>, <mime type>)   decorator, URI, MIME type (argument syntax not in notes)
# static   : docs://documents          (list of items)
# templated: documents/{doc_id}        (doc_id passed as a keyword argument)
```

Rules and traps
- Trap: confusing resources with tools. Resources are for reading data, controlled by the application; tools are model-controlled actions.
- Set the MIME type correctly. It tells the client how to parse the text (the client in lesson 10 branches on `application/json`).
- Templated URI parameter names must match the function's keyword argument names (the course says URI parameters become keyword arguments).
- One resource per distinct read: do not cram "list all" and "get one" into one resource.

Source gap: the exact `@mcp.resource(...)` argument syntax (the keyword name for the MIME type is not stated) and the full URI strings are only partly given in the notes; the line above is a names-only sketch.

---

## 9. Accessing Resources (lesson 10)

Key ideas
- The client needs a `read_resource` function that takes a URI and requests it from the server.
- Uses `await self.session.read_resource(AnyUrl(uri))`.
- Takes `result.contents[0]`, the first resource in the returned contents list.
- Parses by MIME type: check `resource.mime_type`.
  - `"application/json"`: return `json.loads(resource.text)`
  - otherwise: return `resource.text` as plain text
- Dependencies: the `json` module and `pydantic.AnyUrl` (for typing the URI).
- Integration: other app components call the client functions. In the CLI, the user selects documents with arrow keys + space; the selected resource contents are automatically included in the LLM prompt.
- Benefit: no tool call is needed for Claude to read document contents during chat.

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

Rules and traps
- Trap: reading `result.contents` as the data itself. Take the first element, `contents[0]`, then read `.text`.
- Trap: ignoring `mime_type`. JSON must be deserialized; everything else is returned as text.
- The point of resources in this app: the APPLICATION fetches data and injects it into the prompt, instead of making Claude spend a tool call.

Illustrative, not from the course: sending a read-resource style request over HTTP with java.net.http.HttpClient. The course's example uses stdin/stdout, and it does not state the JSON-RPC method names or endpoint, so the method name and URL below are placeholders you would replace from the MCP spec.

```java
import java.net.URI;
import java.net.http.*;

// Illustrative, not from the course. Placeholders in <angle brackets>:
// the course uses stdin/stdout and does not state method names or an endpoint.
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

---

## 10. Defining Prompts (lesson 11)

Key ideas
- Prompts = pre-written, tested instructions that MCP servers expose to clients for specialized tasks.
- The server defines high-quality prompts tailored to its domain. Clients reach them via slash commands (e.g. `/format`). The alternative is users writing their own prompts by hand.
- Implementation pattern: a prompt decorator with a name and description; the function receives arguments (e.g. a document ID); it returns a list of messages (user/assistant format); the messages go straight to Claude.
- Key benefit: server authors create optimized, tested prompts instead of leaving prompt quality to end users. The purpose is to encapsulate prompt-engineering domain expertise inside specialized MCP servers.
- Workflow: user types `/format` -> selects a document -> server returns the specialized prompt -> client sends it to Claude -> Claude uses tools to read, reformat and save the document.

As the course shows it
```python
@prompt(name="format", description="rewrites document in markdown")
def format_document(doc_id: str) -> list[messages]:
    return [base.user_message(prompt_text)]
```
(`prompt_text` is the prompt string with `doc_id` interpolated in. Note the course notes write the decorator as `@prompt`, while the tool and resource decorators are written `@mcp.tool` and `@mcp.resource`; the notes do not explain the difference.)

Rules and traps
- A prompt function returns a LIST of messages, not a bare string. The example returns `[base.user_message(prompt_text)]`.
- Prompts are user-triggered (slash command), not model-triggered. Do not confuse with tools.
- The prompt text is interpolated with the arguments (document ID) so Claude knows which document to work on; Claude then uses the server's tools to fetch and update it.

Source gap: the full text of the `/format` prompt (`prompt_text`) and where `base` comes from (its import) are not in the official notes.

Illustrative, not from the course: the "parameterized, tested template that returns messages" idea in plain Java.

```java
import java.util.List;

// Illustrative, not from the course.
// A prompt = server-owned template + arguments -> list of role/content messages.
record Message(String role, String content) { }

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

---

## 11. Prompts in the Client (lesson 12)

Key ideas
- Two client functions:
  - list prompts: `await self.session.list_prompts()`, returning `result.props` (as the course notes write it)
  - get prompt: `await self.session.get_prompt(prompt_name, arguments)`, returning `result.messages`
- Prompt workflow: the client requests a prompt by name -> passes arguments as keyword parameters -> the MCP server interpolates the arguments into the prompt template -> returns formatted messages for the AI model.
- Arguments flow: client arguments -> prompt function keyword arguments -> interpolated into the prompt text (e.g. the document ID gets inserted into the template).
- Return format: a messages array that forms the conversation input for the model.
- CLI usage: `/format` -> select a document -> prompt with the document ID goes to Claude -> Claude uses tools to fetch the document -> returns the formatted result.
- Concept: prompts are server-defined templates that clients invoke with parameters, giving reusable AI instructions with dynamic content.

As the course shows it
```python
# list prompts
result = await self.session.list_prompts()
return result.props          # attribute name exactly as written in the course notes

# get prompt
result = await self.session.get_prompt(prompt_name, arguments)
return result.messages
```

Rules and traps
- `get_prompt` needs BOTH the prompt name and the arguments; the arguments must match the prompt function's keyword parameters (e.g. the document ID).
- Return `result.messages` for the model; they are the conversation input.
- Trap: in the course notes the list-prompts return is written `result.props`. Source gap: this may be a transcription slip for a different attribute name, but the notes state `result.props`, so that is what is recorded; check the SDK before relying on it.

---

## 12. MCP Review (lesson 14)

Key ideas
- Three server primitives: tools, resources, prompts.
- Tools: MODEL-controlled. Claude decides when to execute them. They add capabilities to Claude (example: JavaScript execution for calculations). They serve the model.
- Resources: APP-controlled. Application code decides when to fetch data. They get data into the app, for UI display or prompt augmentation (examples: autocomplete options, document listings from Google Drive). They serve the app.
- Prompts: USER-controlled. Triggered by user actions such as button clicks or slash commands. They provide predefined workflows (example: the chat starter buttons in the Claude interface). They serve users.
- Control pattern decides purpose:
  - need Claude capabilities -> implement tools
  - need app data -> use resources
  - need user workflows -> create prompts
- Real examples from the course: Claude's chat starter buttons use prompts; Google Drive document selection uses resources; code execution uses tools.

```
 PRIMITIVE   WHO DECIDES WHEN       SERVES   COURSE EXAMPLE
 ---------   --------------------   ------   ------------------------------------
 tools       the model (Claude)     model    JavaScript execution for calculations;
                                             read_doc_contents / edit_document
 resources   the app (your code)    app      Google Drive doc listing; document
                                             selection injected into the prompt
 prompts     the user               user     chat starter buttons; /format
```

Rules and traps
- Trap: picking the primitive by implementation convenience instead of by who controls it. Ask: model, app, or user?
- Trap: using a tool just to read data the app could fetch itself. The course's lesson 10 uses a resource so Claude does not need a tool call to read document contents.
- Trap: using a tool for something the user explicitly triggers (a button or slash command). That is a prompt.

---

## 13. Exercises and Final Assessment

- Lesson 07 (Course satisfaction survey): a feedback survey. Not captured. Tests nothing technical.
- Lesson 13 (Final assessment on MCP): a graded assessment on the course. Not captured: question text, question count and passing score are unknown.
- The only practice in the sources is the hands-on project itself (build the document tools, test them in the Inspector, build the client's `list_tools` / `call_tool`, then resources, then prompts). The final assessment can be expected to cover this material, but that is an inference, not a source statement.

Source gap: lesson 07 (survey) and lesson 13 (final assessment) were not captured and have no official-notes block; the questions are not available. The self-test in section 16 is built only from the official course notes.

---

## 14. Common Mistakes

| Mistake | Fix |
|---|---|
| Treating MCP as a replacement for tool use | They are complementary; MCP is about who authors the tool schemas and functions (the MCP server author, often the service provider) |
| Thinking the MCP client runs the tool | The client only relays list tools and call tool requests; the MCP server executes the tool |
| Hand-writing JSON schemas in the Python SDK | Use `@mcp.tool` with typed parameters and `Field(description=...)`; the SDK generates the schema |
| Using the raw client session directly and skipping cleanup | Wrap it in a client class with connect/cleanup and async enter/exit |
| Reading `result.contents` as the data | Take `result.contents[0]`, then use `.text` / `.mime_type` |
| Ignoring the MIME type on a resource read | If `application/json`, `json.loads(resource.text)`; otherwise return `resource.text` |
| Using a tool to let Claude read documents the app can supply | Use a resource and inject the contents into the prompt; no tool call needed |
| Returning a bare string from a prompt function | Return a list of messages, e.g. `[base.user_message(prompt_text)]` |
| Choosing tools / resources / prompts without considering the controller | Model-controlled -> tools; app-controlled -> resources; user-controlled -> prompts |

---

## 15. Key Terms

| Term | Meaning |
|---|---|
| MCP | Model Context Protocol; a communication layer giving Claude context and tools without developers writing tedious integration code |
| MCP client | The communication interface between your server and the MCP server; provides access to the server's tools; does not execute tools |
| MCP server | Interface to an outside service; wraps its functionality in pre-built tools; contains tools, resources and prompts |
| Transport agnostic | Client and server can communicate over several transports (stdin/stdout, HTTP, WebSockets, etc.) |
| list tools request / result | Client asks the server for available tools; server returns the list |
| call tool request / result | Client asks the server to run a tool with arguments; server returns the execution result |
| Tool | Model-controlled primitive; Claude decides when to run it; adds capabilities to Claude |
| Resource | App-controlled primitive; exposes data for read operations; gets data into the app (UI, prompt augmentation) |
| Prompt | User-controlled primitive; pre-written, tested instructions triggered by user actions (slash command, button) |
| Templated resource | A resource with a parameterized URI, e.g. `documents/{doc_id}`; URI params become function keyword arguments |
| MIME type | Hint on a resource telling the client the data format (`application/json`, `text/plain`) so it deserializes properly |
| `@mcp.tool` | Python SDK decorator that declares a tool; the SDK auto-generates its JSON schema |
| `@mcp.resource` | Python SDK decorator that declares a resource with a URI and MIME type |
| `@prompt` | Decorator (as the course notes write it) that declares a prompt with a name and description |
| `Field` | Imported from `pydantic`; carries a parameter `description` for a tool argument |
| MCP Inspector | In-browser debugger started with `mcp dev [server_file.py]`; tests tools manually without a real app |
| Client session | The SDK's actual connection to the MCP server; needs cleanup on close |

---

## 16. Exam-style Self-test

Q1. What problem does MCP solve compared with the traditional approach?
A1. In the traditional approach the developer authors tool schemas and functions for each service integration (e.g. GitHub API tools), which is a maintenance burden. MCP shifts tool definition and execution to a dedicated MCP server so the developer does not write or maintain them.

Q3. How do MCP and tool use relate?
A3. They are complementary, not identical. MCP focuses on who does the work of creating the tools.

Q4. Does the MCP client execute tools?
A4. No. It is an intermediary that sends requests to the MCP server, which actually runs the tools.

Q6. Name the two key message types a client uses for tools.
A6. List tools request/result (get the available tools) and call tool request/result (run a tool with arguments and get the result).

Q7. Which decorator and helper do you use to declare a tool in the Python SDK, and what does the SDK generate for you?
A7. `@mcp.tool` on a function with typed parameters and `Field` descriptions (from pydantic). The SDK auto-generates the JSON schema.

Q8. What two tools does the course's server define, and what parameters do they take?
A8. `read_doc_contents(doc_id)` and `edit_document(doc_id, old_string, new_string)`. Both raise `ValueError` if the document does not exist.

Q9. How do you launch the MCP Inspector, and how do you test a tool in it?
A9. With the Python environment activated, run `mcp dev [server_file.py]`, open the printed localhost address, click Connect, go to Tools, select a tool, enter parameters, click Run Tool, check the result.

Q10. Why does the course wrap the client session in a class?
A10. The session is the actual connection to the server and needs resource cleanup on close. A wrapper with connect/cleanup and async enter/exit manages that and exposes server functionality to the rest of the codebase.

Q12. Name the two kinds of resource and give the course's URI examples.
A12. Direct/static (e.g. `docs://documents`) and templated (e.g. `documents/{doc_id}`, where URI parameters become function keyword arguments).

Q13. What is the purpose of a resource's MIME type, and how does the client use it?
A13. It hints at the returned data format. The client checks `resource.mime_type`: `application/json` gives `json.loads(resource.text)`; anything else returns `resource.text`.

Q14. Which line reads a resource in the client, and which element of the result do you use?
A14. `await self.session.read_resource(AnyUrl(uri))`, then `result.contents[0]`.

Q16. What is an MCP prompt, and what does a prompt function return?
A16. A pre-written, tested instruction exposed by the server for specialized tasks, reachable via slash commands such as `/format`. The function takes arguments (e.g. a document ID) and returns a list of messages, such as `[base.user_message(prompt_text)]`.

Q17. Which two client calls handle prompts, and what do they return?
A17. `list_prompts()` (`await self.session.list_prompts()`, returned as `result.props` in the course notes) and `get_prompt(prompt_name, arguments)` (`await self.session.get_prompt(...)`, returning `result.messages`).

Q18. Match each primitive to its controller and the need it serves.
A18. Tools: model-controlled, add capabilities to Claude (e.g. JavaScript execution). Resources: app-controlled, get data into the app (e.g. Google Drive document selection). Prompts: user-controlled, predefined workflows (e.g. chat starter buttons, slash commands).
