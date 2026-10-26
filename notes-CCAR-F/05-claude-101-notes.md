# Claude 101 - Study Notes

Source: Anthropic Academy course "Claude 101" (14 lessons, non-developer course). Notes follow course order. No code appears in this course, so there are no code samples.

---

## 1. Big Picture

- Claude is the intelligence; claude.ai and the other tools are different places to reach it. The course focuses on claude.ai (web, desktop, mobile).
- Work with Claude takes three shapes on the desktop app: turn by turn (Chat), handing work off (Cowork), building software (Code tab).
- Context is the lever: prompts, uploads, projects, skills, connectors and memory all give Claude more to work from.
- Projects store knowledge ("what"); Skills perform tasks ("how"). Artifacts are the outputs you create. Skills and projects complement each other.
- Connectors (powered by MCP) let Claude read and act in your tools. Enterprise Search is a pre-built org-wide project on top of connectors. Research is an agentic, multi-step, cited investigation across the web and connected integrations.
- Outside claude.ai: Claude Code, Claude Tag (Slack), Claude Design, Claude for Microsoft 365 (Excel, PowerPoint, Word, Outlook) and Claude in Chrome.
- Iteration beats one-shot prompting; the 4D Framework (Delegation, Description, Discernment, Diligence) frames good collaboration.

```
                         YOU (context + expertise + judgment)
                                      |
                                      v
   +--------------------------------------------------------------+
   |  CONVERSATION (Chat)  <-- prompt: stage / task / rules       |
   |    |  uploads, memory, "Instructions for Claude"             |
   |    |                                                         |
   |    +--> PROJECTS  : knowledge base + instructions + chats    |
   |    |       (stores the WHAT; RAG when large; shareable)      |
   |    |                                                         |
   |    +--> SKILLS    : instructions/scripts/resources           |
   |    |       (performs the HOW; built-in + custom)             |
   |    |                                                         |
   |    +--> CONNECTORS (MCP): web connectors + desktop extensions|
   |    |       |                                                 |
   |    |       +--> ENTERPRISE SEARCH ("Ask {Org}", Team/Ent.)   |
   |    |       +--> RESEARCH (needs web search; cited report)    |
   |    |                                                         |
   |    +--> ARTIFACTS : outputs (docs, decks, designs, apps)     |
   |            saved in Artifacts tab (paid plans); shareable    |
   +--------------------------------------------------------------+
                                      |
        DESKTOP APP:  Chat | Cowork (hand-off) | Code tab
        OTHER SURFACES: Claude Code, Claude Tag (Slack), Claude Design,
                        Claude for Microsoft 365, Claude in Chrome
```

---

## 2. Lesson Notes (course order)

### Lesson 1 - What is Claude? (about 5 min)

Key ideas
- Claude is an AI assistant designed as a "thinking partner", more than a chatbot.
- Guided by principles (Constitutional AI): avoid toxic or discriminatory outputs, avoid helping with illegal or unethical activity, behave as a safe and beneficial AI. Trained to align with human values and operate transparently.
- Handles conversational and text-processing tasks: summarization, search, creative and collaborative writing, Q&A, coding, and more, with reliability and predictability.
- Steerable and collaborative: takes direction on personality, tone and behavior. Customers report it is less likely to produce harmful outputs, easier to converse with, more steerable.
- Access: Claude apps are on all plan types - Free, Pro, Max, Team, Enterprise. Conversations, projects, memory and preferences sync across devices when signed in. Web, desktop and mobile.

Capabilities named
- Writing and content creation (iterate on structure and clarity until your voice comes through).
- Research and analysis: upload documents; large context window ingests 200K+ tokens (about 500 pages or more), up to 1M tokens on Pro, Max, Team and Enterprise plans when using supported models.
- Coding assistance: write, debug, explain code in multiple languages.
- Problem-solving and reasoning: can respond near-instantly or take time to reason first - a capability called Thinking (works through it step by step before answering).
- Learning new things: Learning mode guides your reasoning process rather than giving answers, to develop critical thinking.

Ways to access Claude (same intelligence, different interfaces)
- Claude.ai (plus mobile and desktop apps): primary way; conversations, writing, research, analysis, creating files. Focus of this course.
- Claude Code: agentic coding tool for developers, but usable for file manipulation on your desktop; edits files, runs commands, creates commits.
- Claude Tag: Claude in Slack - chat from the AI assistant header in any channel or conversation, or tag Claude in threads. With Slack connected, Claude searches channels, direct messages and shared files for context.
- Claude Design: turns ideas (or a sketch/screenshot) into interactive prototypes; works inside any conversation on paid plans and as a dedicated space at claude.ai/design.
- Claude for Microsoft 365: Claude in Excel, PowerPoint, Word and Outlook as a sidebar; carries context from one app to the next.

Reflection prompt: look at your calendar (or ask Claude to) and identify tasks Claude could support.

Source gap: the embedded exercise "ThinkingPartnerSorter" was captured with no content (only its URL), so its items and answers are unknown.

### Lesson 2 - Your first conversation with Claude (about 13 min)

Key ideas
- Claude brings AI intelligence; you bring context and expertise.
- Talk to Claude like a coworker: naturally, concisely, conversationally.
- Before a conversation consider: setting the stage, defining the task, specifying rules.
- Uploaded documents or background are considered in the response (a shortcut to your needs).
- Power comes from continued, frequent communication, not one-off prompts.
- Note on the video (Dec 2025): the "Use style" menu it shows has since been deprecated.

Prompt framework (three elements)
- Setting the stage: your role, objectives, relevant context.
- Defining the task: the action (write, analyze, build, or something else) plus details.
- Specifying rules: style or tone, format, attached examples.
- Worked example in the lesson: marketing lead at an indie streaming startup, Series A investor pitch deck; asks to research the independent film streaming market (trends, competitor positioning, growth opportunities), with current web research and citations, structured as a professional report of up to 5 pages with executive summary, market analysis, competitive landscape, growth opportunities.
- The framework is adapted from the 4D Framework for AI Fluency (Prof. Rick Dakan, Ringling College of Art and Design; Prof. Joseph Feller, University College Cork): Delegation, Description, Discernment, Diligence.

Adding context
- Uploads, connectors and custom preferences give Claude more context.
- Claude analyzes text and visual elements (images, charts, graphics) in PDFs and other documents.
- Supported file types named: PDF, DOCX, CSV, TXT, and common image formats like PNG and JPEG.
- Practical upload uses: summarize key points; describe/analyze an image; find trends in a spreadsheet; explain code or find bugs.
- Claude automatically attempts to parse the file; it appears as an attachment in chat.
- Pro-tip: Settings > Account > 'Instructions for Claude' sets preferences applied to every conversation.

Iterating (three options when the first response misses)
- Ask follow-up questions (more detail, different angle, clarification; e.g. "make it more concise").
- Provide feedback (what you liked and did not).
- Redirect or restart: steer back; worst case, restart in a new chat to refresh context.
- Pro tip: click the pencil icon on any of your messages to edit and resubmit instead of adding a new message.

Personalizing Claude (two features)
- Memory: automatically saves key context (role, preferences, past decisions, working style) so you do not repeat yourself; review, edit or delete anytime in Settings; syncs across devices.
- Skills: reusable sets of instructions teaching Claude how to approach specific tasks; applied automatically when relevant. Covered in Lesson 7.

Source gap: the embedded item is a YouTube video ("Getting started with Claude.ai"); only its title was captured, no transcript.

### Lesson 3 - Getting better results (about 12 min)

Common challenges table (as listed in the lesson)

```
Challenge                       What is happening                      Try this
------------------------------  -------------------------------------  -----------------------------------------
Response too generic            Not enough context about your          Add audience, role, constraints
                                situation                              (example: client email about a two-week
                                                                       integration delay, second delay, be
                                                                       professional but apologetic)
Too long (or too short)         Claude is guessing at length           Be explicit: "two-paragraph summary",
                                                                       "under 100 words", or "length isn't a
                                                                       concern"
Did not follow my format        Understood what, not how to present    Show, don't just tell: give an example or
                                                                       describe structure ("bullet points with
                                                                       bold headers")
Confident-sounding but wrong    Occasionally generates plausible but   Verify key facts for high-stakes work; ask
                                incorrect info, esp. specific facts    for sources or confidence level; enable
                                or niche topics                        web search to ground responses
Tone not right                  Defaults to helpful and professional   Describe tone in plain language; provide
                                                                       an example in the style you want
```

Iteration mindset
- The first prompt rarely produces a perfect result; treat it as the start of a conversation, not a one-shot request.
- Treat first drafts as starting points.
- Give specific feedback ("Cut the first two paragraphs and make the conclusion more action-oriented" beats "Make it shorter").
- Know when to start fresh: if a conversation is off track, a new chat with a clearer prompt can be faster than redirecting.

AI Fluency and the 4D Framework
- AI Fluency: ability to collaborate effectively with AI tools; developing judgment, not just knowing which buttons to click.
- Delegation: what work humans do, what AI does, how to distribute tasks; understand goals and AI capabilities.
- Description: communicating effectively with AI - define outputs, guide processes, specify behaviors.
- Discernment: critically evaluating AI outputs, processes, behaviors; assess quality, accuracy, appropriateness.
- Diligence: using AI responsibly and ethically; transparency, accountability for AI-assisted work.
- Link to earlier lesson: the stage/task/rules framework is rooted in Description; troubleshooting draws on Discernment and Diligence.

Evals (evaluations)
- Systematic ways to test how well Claude performs on tasks that matter to you; Discernment becomes essential.
- Why: your work is unique (Claude might excel at marketing copy but need more guidance for domain technical documentation). Evals help you see where Claude adds most value, where you need more context or examples, and build confidence for recurring tasks.
- Simple eval approach (steps as listed):
  1. Gather examples: 5-10 examples of a task you do regularly.
  2. Create test prompts that would generate similar outputs, including the context you would naturally have.
  3. Compare outputs to your examples: key information captured? tone and style appropriate? what is missing or could improve?
  4. Refine your approach: adjust prompts, add examples of what good looks like, or identify where human review is essential.
- Data analysis example: find a dataset you analyzed manually; prompt Claude to do the analysis; compare to your originals; note patterns and refine (for example, Claude gets the right numbers but misses the overall patterns).

Source gap: the embedded item is a YouTube video ("Data analysis with AI", from the AI Fluency for nonprofits course); only its title was captured.

### Lesson 4 - How you'll work with Claude on your desktop (about 11 min)

Key ideas
- The desktop app is the home base. Work sorts into three shapes; knowing which one you are in is the whole skill of the lesson.
  - Working with Claude, turn by turn: back-and-forth; thinking happens in the exchange. Lives in Chat.
  - Handing work off: describe an outcome; Claude plans, does it, returns the result; you review the plan and output. Lives in Cowork.
  - Building software with Claude Code: Claude works directly in a codebase. Lives in the Code tab. All three are in the Claude desktop app.
- The first two are where most knowledge workers spend their day; the third is the developer workspace.

Turn by turn (Chat)
- Reach for it when: the answer changes what you ask next; you want to stay in it (your judgment on every turn); it is quick.
- Try-it examples: screenshot an unfamiliar dashboard and ask what metrics mean; talk through a presentation by voice, push back on section three; gather product-launch ideas from Apple Notes and check connected tools for gaps.
- Desktop-native extras (Chat): Quick entry (double-tap Option key, Mac; compact always-on-top window); Screenshots and window sharing (Mac); Dictation (Mac); Desktop connectors for local tools and services.

Handing work off (Cowork)
- You delegate the whole piece of work (gather context, analyze, produce the finished thing).
- Reach for it when: multi-step task you would do in sequence; output is finished files delivered where you need them (a deck or doc alone does not need a hand-off - on paid plans make those as artifacts); work spans your tools; it should run on a schedule or while you do something else.
- You stay in control: Claude may ask questions to pin scope/format, shows the plan, you can watch progress and steer; when set to ask before acting it stops for approval on actions that matter (sending an email, sharing a file).
- Try-it examples: query all tools like a database (pricing decisions across notes, Slack, email, then update the Q3 deck); a folder of 50+ project documents summarized into a memo; a Monday-morning routine set up once as a scheduled task.
- What Cowork gives today:
  - Local folder access: reads a folder and saves finished work back to it. Concrete difference from Chat, which reads uploads but returns finished files as downloads.
  - Scheduled tasks: run on a cadence. Run remotely, so they run even when the computer is asleep or the app is closed; a task that needs files on your computer runs locally, only while the app is open.
  - Subagents: splits a big job across background workers in parallel, each with its own context; one finished deliverable.
  - Projects: workspace with its own files, instructions, memory, built around tasks you run.
  - Browser use: with Claude in Chrome, navigates websites and pulls findings into the task.
  - Computer use: operates your computer directly when no connector exists; asks permission before each app it touches; blocklist for off-limits items; in research preview on Pro and Max plans.
  - Plugins: ready-made bundles of skills, connectors and agents for a kind of work (sales, finance, legal); browse and add under Customize -> Plugins.
- Cowork is available to Pro, Max, Team and Enterprise users.

Building software (Code tab)
- Visual diffs, built-in terminal, and git tracking every version so you can roll back. Non-developers: it is a separate tab and the course does not need it (Claude Code in Action covers it).
- Where work happens: Local (select a folder; read project, local tools, run a dev server and preview in browser) or Cloud (connect a GitHub repository; cloud environment; sessions continue if you close the app).
- Autonomy settings: Manually approve (Claude proposes every change and waits), Accept edits (applies file edits automatically), Plan (creates a plan before making changes).
- Available on Pro, Max, Team and Enterprise; run multiple sessions across projects and filter by environment (Local or Cloud) and status from the sidebar.

Decision table (as given)

```
You are about to...                          Shape                  Where it lives today
-------------------------------------------  ---------------------  ------------------------------------------
Ask, brainstorm, draft, think through        Turn by turn           Chat (quick entry, dictation, screenshots)
Hand off multi-step task ending in a         Handing work off       Cowork (folder access, connectors,
finished deliverable, spans tools, or runs                          scheduled tasks, subagents)
on a schedule
Write, test, run, ship code in a codebase    Building software      Code tab (Local or Cloud)
```

Reflection prompts: which of your requests were really whole tasks fed in one question at a time; for the task you most want off your plate, write down the outcome you would describe, not the first question you would ask.

Source gap: the lesson mentions a separate "Introduction to Claude Cowork" course (and Cowork in the cloud, in beta on eligible plans); no details are given here.

### Lesson 5 - Introduction to projects (about 14 min)

Key ideas
- Projects are self-contained workspaces with their own memory, chat histories, knowledge bases and customized instructions.
- Project knowledge: upload documents Claude references across all chats in the project; no re-uploading.
- Project instructions guide behavior (tone, expertise level, response style) in every conversation in the project.
- Projects scale automatically: when the knowledge base approaches context limits, Claude switches to searching project knowledge and pulling in only what is relevant, expanding capacity by up to 10x while maintaining quality.
- For Claude for Work (Team and Enterprise) users, projects enable collaboration.

When to use a project (ongoing work, not a one-off question)
- Reference materials you will use repeatedly.
- Consistent requirements for how Claude should respond (formal language, cite sources, follow a template).
- Team collaboration needs on the same foundation.

Step-by-step workflow (as listed)
- Step 1: Set up your project
  - Hover over the left sidebar and click "Projects", or go to claude.ai/projects.
  - Click "+ New Project" in the upper right.
  - Give a descriptive name (e.g. "Q4 Marketing Campaign").
  - Add a brief description. Claude does not see this description directly; it helps you and teammates understand the purpose.
  - Choose visibility: private or share with your organization (Claude for Work users).
- Step 2: Add project instructions
  - Click "Instructions" to open the panel.
  - Good instructions include: context about the work; process instructions ("First consider a blog structure that will entice this audience, then write the draft"); tone and style preferences; specific requirements ("Always include a call-to-action").
  - Click "Save instructions". They apply to every chat in the project and work alongside user preferences and styles.
  - Instructions can automate workflows (e.g. "When I upload a meeting transcript, create a structured summary using this template"); "think of instructions as programming Claude's behavior for this project".
- Step 3: Build your knowledge base
  - Files menu is on the right side of the project's main page; click "+" to add content.
  - File types: PDF, DOCX, CSV, TXT, HTML, and more; can also connect Google Drive.
  - What to upload: reference documents (brand guidelines, style guides, templates); background materials (research reports, meeting notes, requirements docs); examples of work to emulate; technical documentation or specifications.
  - Pro tip: name files descriptively (Claude uses file names to retrieve the right information): "Q4-2024-Brand-Guidelines.pdf" not "document1.pdf".

Large knowledge bases (RAG)
- Retrieval Augmented Generation: Claude finds and uses the most relevant parts of uploaded documents without being told which file.
- Kicks in when knowledge approaches the context window limit; a visual indicator shows when a project is RAG-enabled; the experience should feel the same.

Working in a project: each conversation automatically has access to the knowledge base and follows the instructions.

Collaboration (Team and Enterprise only)
- Permission levels: Can view (see contents, access knowledge, chat; cannot change anything), Can edit (modify instructions, update knowledge, manage other members, contribute), Owner (project creators; control everything including who sees the project; share with specific people or the whole organization).
- Sharing steps: open the project; click "Share project" (right of the project name); add members by name or email, or paste a list of emails for bulk sharing (the project shows up in their "Shared with you" section); or share with "Everyone at [your organization]" to make it discoverable in the Team tab. Members get email notifications and find shared projects in their "Shared with me" tab.

Example projects named: Q4 product launch; Research support; Client account hub; Event planning workspace; Job description generator.

Best practices
- Start focused, then expand (specific use case first).
- Keep the knowledge base current (outdated documents lead to outdated responses).
- Write clear instructions (vague instructions give inconsistent results).
- Name documents descriptively and group related files; Claude uses filenames and proximity to understand relationships between documents.
- Reference documents by name in questions ("Based on our Q3 report, ...").

Source gap: the embedded item is a YouTube video ("Getting started with projects in Claude.ai"); only its title was captured. The lesson text uses both "Shared with you" and "Shared with me" for the recipient view.

### Lesson 6 - Creating with artifacts (about 12 min)

Key ideas
- Artifacts are the outputs you create with Claude: a document, deck, design, dashboard, prototype. They appear in a dedicated window alongside the conversation instead of a long block buried in chat.
- Claude creates one when you ask for something that stands on its own (edit, reuse, share). To be sure, say "Create this as an artifact."
- On paid plans an artifact is not tied to its conversation: everything is saved in the Artifacts tab (conversation = where you create; Artifacts tab = where outputs live). On the Free plan an artifact stays with the conversation that created it.

Dedicated deliverable types
- Claude Design: visual work (landing pages, one-pagers, product mockups, interface prototypes); bring your design system; edit on the canvas (drag, resize, align).
- Claude Slides: presentations; share notes/report/conversation and Claude outlines, writes and lays out every slide; edit any slide, add images, present inside Claude, export to PowerPoint or PDF.
- Claude Docs: living rich-text documents written together; Claude drafts in front of you, asks clarifying questions, explains choices in comments; simultaneous editing with colleagues; changes save as you go; can pull data from connected tools into charts and diagrams (a snapshot, not a live feed - ask Claude to refresh); export to Google Docs or .docx.
- They work together in one conversation ("turn this doc into a deck", "make a one-pager from this deck").
- Plan availability: Design, Slides and Docs are in beta, on paid plans (Pro, Max, Team, Enterprise). Pro and Max: on by default, can turn off in Settings > Capabilities. Team: on by default, an admin can turn off. Enterprise: off by default until an admin turns them on in Organization settings > Artifacts. Admin also controls whether artifacts are on for the organization.

Artifacts on every plan (including Free)
- Dashboards, trackers, flowcharts, interactive pages, working code - built as an artifact in the conversation.
- Artifacts vs file creation: file creation produces downloadable Word, Excel, PowerPoint and PDF files. An artifact opens and updates right in Claude and is shared by link; file creation hands you a file to download and open in other apps.

Creating your first artifact
- Describe what you want in any conversation (the composer's Output menu lets you pick design, slides or doc), or start from the Artifacts tab and pick a design, deck or doc.
- Example prompts: five-slide deck from meeting notes; one-page project brief as a shareable doc; landing page design with hero section and feature list; interactive expense dashboard (any plan).
- Claude uses existing context (shared files, conversation, project knowledge, connected tools). When it appears you can copy or download it and everything stays editable.

Three ways to change an artifact (mix freely; direct edit and commenting are part of design/deck/doc experiences)
- Edit it directly (type into a doc, edit a slide, drag and resize on a canvas; your edits and Claude's land side by side).
- Comment for Claude (comment on the exact element, slide or passage; in a doc @-mention Claude and it replies explaining what and why).
- Just ask (keep talking in the conversation; Claude shows every change).
- Direct editing, commenting and changing sharing happen on desktop or web; on mobile you can ask for an artifact and open it full screen in the Artifacts tab.

Sharing
- Private until shared. For designs, decks, docs: add people by name or email and choose view, comment or edit (docs offer view and edit), or share a link with everyone in your organization. Anyone you share with needs a Claude account to open the artifact.
- Pro and Max: keep to yourself or share with anyone with the link; can publish a design or deck as a public artifact; only the artifact becomes public, conversation stays private.
- Team and Enterprise: links stay inside the organization by default; sharing outside ("anyone with the link") only after an Owner or Primary Owner turns on External sharing in Organization settings > Artifacts.
- Free plan: copy, download, or publish so anyone with the link can view.
- Export: deck to .pptx or .pdf; design to .pptx, .pdf or .html; doc to Google Docs or .docx; any artifact can be copied or downloaded from the artifact window.

Tips
- Ask for the deliverable, not just the content ("Summarize our Q3 results" gives a chat reply; "turn our Q3 results into a one-page doc for the leadership team" gives an artifact).
- Be specific (monthly budget tracker with categories, pie chart, over-budget warning).
- Describe the end user (flowchart for new employees vs engineering team).
- Build on work already done; best artifacts come at the end of a conversation.
- Refresh data when needed: embedded charts do not update on their own.

Source gap: no embedded exercise or video is captured for this lesson. The end-of-course quiz (Lesson 14) says a published artifact can be viewed "even without a Claude account", which conflicts with this lesson's statement that anyone you share with needs a Claude account (sharing with named people vs publishing publicly may differ; the course does not reconcile this).

### Lesson 7 - Working with skills (about 16 min)

Key ideas
- Skills are folders of instructions, scripts and resources that Claude loads dynamically to improve performance on specialized tasks - "expertise packages" teaching repeatable task completion.
- Excel, PowerPoint, Word and PDF file creation is powered by Skills behind the scenes. Custom Skills can codify entire workflows (quarterly variance analysis methodology, brand voice review process, compliance checklist).

Types
- Anthropic Skills: created and maintained by Anthropic (document creation for Excel, Word, PowerPoint, PDF); Claude invokes them automatically.
- Custom Skills: created by you or your organization for specialized workflows (apply brand guidelines to presentations, structure meeting notes, run data analysis workflows).

Enabling Skills (steps as listed)
- Skills are available on all plans; need Code execution and file creation enabled (Skills need Claude's secure sandboxed computing environment).
  1. Navigate to Settings > Capabilities.
  2. Ensure "Code execution and file creation" is toggled on.
  3. Scroll to the Skills section.
  4. Toggle individual skills on or off.
- Enterprise plans: organization Owners must first enable both Code execution and Skills in Admin settings before members can access them.
- Team plans: enabled by default at the organization level.

Using Skills
- Claude picks skills automatically based on your request. Example prompts: Excel expense tracker with formulas; meeting notes to PowerPoint; PDF report from data; Excel financial model with scenario analysis.
- You see the skill mentioned in Claude's chain of thought; output is a downloadable file (save locally or to Google Drive).
- On paid plans where Claude Slides and Claude Docs are enabled, asking for a deck or document can create an artifact instead.

File execution
- Claude works with your actual files (in a contained environment) to create updated versions: upload .xlsx, .pptx, .docx or .pdf files and Claude creates slides, performs analyses, adds suggested edits. Download or open in Drive.
- When you upload a file in Chat, Claude creates a new version rather than editing your original in place.
- Need to give access to external data sources: toggle "Allow limited network access" on when prompted.

Security considerations (Skills can include executable code)
- Install custom Skills only from trusted sources.
- Anthropic's built-in Skills are tested and maintained by Anthropic.
- Custom Skills you upload are private to your individual account.
- Review the contents of an externally sourced custom Skill before use.

Creating a custom Skill through conversation (steps as listed)
  1. Start a new chat and tell Claude what you want to create.
  2. Answer Claude's questions (what should it do, what makes good output, examples of when you would use it).
  3. Upload reference materials (templates, style guides, brand assets, work examples).
  4. Save your skill: Claude generates a file with the properly structured skill; save it and it is ready.
- See your skills in the Customize tab in the left sidebar (view, and edit manually or by chatting with Claude). Custom skills appear alongside built-in ones and are invoked automatically; improve by asking Claude to edit the skill.

Skills vs Projects: "projects store knowledge, skills perform tasks"

```
                Projects                         Skills
Purpose         Store knowledge Claude           Define processes Claude executes
                references
Best for        Long-term context, reference     Repeatable workflows, multi-step tasks,
                materials, team collaboration    consistent methodology
Example         Customer hub, research buddy,    Process guidelines (brand or legal),
                feedback generator               blog drafting, PDF creation
Persistence     Knowledge available across all   Instructions applied when the skill is
                chats in the project             invoked
```
- They complement each other: a "customer call prep" skill might pull from customer profiles in a project's knowledge base. The project provides the what, the skill provides the how.

Source gap: the embedded item is a YouTube video ("Claude works with you on slides, spreadsheets, and contract redlines"); only its title was captured.

### Lesson 8 - Connecting your tools (about 16 min)

Key ideas
- Connectors turn Claude from an assistant into an informed collaborator with access to the tools, data and context you use daily.
- Connectors let Claude read information and perform actions on your behalf, depending on connector and permissions (search files, retrieve documents, analyze data, create content, update records, execute tasks).
- The Model Context Protocol (MCP) powers connectors - "like USB-C for AI": a universal standard, single consistent interface; open standard so developers can build connectors for any tool.
- Two types: web connectors (cloud services such as Google Drive, Notion, Slack, Asana) and desktop extensions (run locally via the Claude Desktop app; local files and native applications).

Finding connectors
- Directory at claude.ai/directory with two tabs: Web (Gmail, Notion, Slack, Asana, Linear, Stripe, and more) and Desktop extensions.
- The directory lists connectors, not individual applications, so one entry can cover several tools (the Atlassian Rovo connector reaches both Jira and Confluence - look for Atlassian). If a tool has no entry, add it as a custom connector.
- Also browse via the + button in the lower left of the chat window, then Connectors.

Setting up a web connector (steps as listed)
  1. Find the connector (claude.ai/directory, or + > Connectors in any chat).
  2. Click Connect.
  3. Authenticate: you are redirected to the service's login page; sign in with existing credentials.
  4. Grant permissions: review the specific permissions requested, then authorize.
  5. Test the connection: e.g. "Can you access my [tool name]?"

Desktop extensions (need the Claude Desktop app, not the web interface; macOS or Windows)
- Examples: local file access, browser control for automated web tasks, native application integration (e.g. Figma).
- Install: download and install the Claude Desktop app; open it and go to Settings > Extensions; browse and click Install; follow extension-specific setup.

Using connectors (example categories and prompts)
- Project management (Asana, Linear, Jira): priorities due this week; create a task; summarize project status.
- Communication (Slack, Gmail): find an email thread; draft a reply to a channel message; what the team decided.
- Documentation (Notion, Google Drive, Confluence): search brand voice guidelines; summarize meeting notes; style guide questions.
- Business tools (Stripe, PayPal, HubSpot): revenue trends; opportunity status; transactions over $1,000.

Security and permissions
- Scoped access: permissions are specific to what the connector needs; toggle individual permissions on/off in each application's menu.
- Claude sees what you see: only data you have access to (connecting work email does not expose your CEO's inbox).
- Revocable any time: disconnect via Claude settings or the third-party service's security settings. Custom connectors can be found or built; install only from trusted sources (same caution as with Skills).

Source gap: the interactive piece is described in Section 3. The page also describes an unnamed activity ("turn on a source and watch the request grow") whose per-source sentences were not captured.

### Lesson 9 - Enterprise search (about 17 min)

Plan availability
- Team and Enterprise plans only; must be enabled by a workspace admin. Free, Pro and Max users can skip this lesson.

Key ideas
- Adds a dedicated "Ask {Your Org Name}" option in the sidebar.
- Designed for finding and synthesizing knowledge buried across your company's tools and data sources.
- "A pre-built project for your entire organization" - the company knowledge base is already loaded.
- Unlike regular chats with connectors enabled, it is designed specifically for information gathering, using custom instructions configured by the Anthropic team.
- Searches across connected tools (SharePoint documents, Slack conversations, Gmail threads, Google Drive files), synthesizes one response, and always cites sources.

Question categories named
- Getting up to speed ("What happened yesterday while I was out?", current blockers on a project).
- Policy and process (remote work policy, expense reports, time off).
- Research and analysis (why customers choose competitors, Q4 roadmap discussions, onboarding process info).
- Onboarding new team members (how the authentication system works, who to ask about billing, deployment tools).
- Performance and project tracking (discussions and documents for a campaign, key decisions from leadership meetings, team contributions to an initiative).

Two-step setup: first an admin configures for the organization, then individual users authenticate with personal accounts.

Admin (Owner) steps as listed
  1. Click "Ask Your Org" in the left sidebar.
  2. Click "Set up for your org" (or "Disable" to turn the feature off).
  3. Connect the organization's tools: must choose a connector for Documents (Google Drive or SharePoint) and Chat (Slack or Microsoft Teams). Email is recommended but optional.
  4. Click "+ Add more" for additional tools.
  5. Customize the project name; it appears as "Ask [Name]" in everyone's sidebar.
  6. Add a description, then click "Finish set up."
- The project is enabled by default for all Team and Enterprise organizations, but an Owner must complete initial setup first. After setup it is available to all members.

User steps as listed
  1. Click the "Ask {Org Name}" project (starred in the sidebar).
  2. Follow the guided onboarding flow to connect recommended services.
  3. Authenticate with each service to search (Slack, Google, Microsoft 365, etc.).
  4. Start asking questions.
- More connectors means more comprehensive results; add later via "Connect" in the project's Instructions section.

Safety
- Shows only what you already have permission to access in the original tool; conversations remain private; connected data is not indexed or stored separately.

### Lesson 10 - Research for deep dives (about 12 min)

Key ideas
- Research makes Claude operate agentically: multiple searches that build on each other, deciding what to investigate next; explores angles automatically and works through open questions.
- It takes longer than a usual search - a few minutes or more - because Claude can send out many searches at once, sometimes across hundreds of sources, and pull findings into one answer.
- Works with Thinking: Claude plans its approach, breaking a complex request into pieces before gathering.
- Citations: every claim links back to its source for easy verification.
- Sources: the web and connected integrations (e.g. Google Workspace: Gmail, Google Calendar, Google Drive).

When to use what

```
Use Research when you need                      Consider instead
----------------------------------------------  -----------------------------------------
Comprehensive multi-source reports              WEB SEARCH: quick specific fact (stock
In-depth analysis across web + integrations     price, address); only one or two sources;
Investigations that would take hours manually   speed over comprehensiveness
Comparative analysis (competitors, vendors)     THINKING: deep reasoning with no external
Reports with verifiable citations               info (math, code debugging, logic)
                                                ENTERPRISE SEARCH: answers from internal
                                                knowledge (docs, Slack, email, meeting
                                                notes), policies, past decisions, not the
                                                public web
```
- Ideal tasks: market analysis and competitive research; planning complex projects (offsites, launches); synthesizing email, calendar and documents; technical documentation from multiple sources; briefings needing current, verified information.

How Research works (4 steps as listed)
  1. Claude plans its approach (breaks down the request, identifies needed information, plans angles).
  2. Claude conducts multiple searches that build on each other.
  3. Claude synthesizes findings from multiple sources into a comprehensive, organized report.
  4. Claude provides citations; every claim links to its source.

Using Research (steps as listed)
  1. Click the + button at the bottom left of the chat.
  2. Select Research (highlighted once active).
  3. Enter your prompt and submit.
  4. Claude works in the background with progress indicators.
- Important: web search must be enabled for Research to function (can turn on from the same + menu).

Tips for effective Research prompts (run takes minutes, so invest in the prompt)
- Be specific about goals ("Analyze the electric vehicle battery market - key players, technology trends, supply chain challenges that might affect investment decisions" vs "Tell me about the EV market").
- Specify sections or structure (e.g. venue comparison: location and accessibility, meeting space and amenities, catering, pricing).
- Include constraints (budget, timelines, geography).
- Ask Claude to help refine your prompt before enabling the feature.

Connected integrations
- With Google Workspace or others connected, Claude pulls context from emails, calendar and documents alongside web research.
- Steer with phrases like "Pull relevant context from my Google Drive" or "Include insights from my recent emails on this topic."
- Example asks: summarize Project X from emails and Slack then research best practices; review next week's calendar and research each company you meet; compare internal pricing documents to competitor positioning.

### Lesson 11 - Claude in action: use cases by role (about 2 min)

Key ideas (a pointer lesson to the Use Case Gallery, each with step-by-step instructions)
- General professional: generate project status reports; analyze patterns in user feedback; package brand guidelines in a skill.
- Sales: build a battle card library; prepare for sales deals; create sales reports.
- Marketing: analyze campaign performance; adapt content across platforms.
- Finance: build financial models; draft investment memos; understand and extend an inherited spreadsheet.
- HR: create new hire onboarding guides.
- Legal: track discovery timelines and analyze patterns.
- Research: plan your literature review; verify statistics from raw data.
- Goal: describe 2-3 use cases you can try right away and know where to find more (Use Case Gallery).

### Lesson 12 - Other ways to work with Claude (about 17 min)

Claude Code
- Agentic coding tool that works in your terminal, IDE, browser, or Slack; understands your codebase, executes commands, handles whole development workflows via natural language.
- Use when: build features by describing them (Claude writes code, runs tests, creates commits); debug by pasting error messages; navigate an unfamiliar codebase; automate tedious tasks (lint errors, merge conflicts, release notes); you prefer the terminal alongside your IDE.

Claude Tag
- Claude in Slack: help in channels and threads, or bring Slack context into Claude conversations - tag Claude in any thread.
- Use when: draft replies, summarize long threads; prep for meetings by pulling conversations and shared documents; onboard to a new team via channel history; hand off coding tasks from a bug report (tag Claude and it can spin up a Claude Code session using the surrounding context); quick answers during a conversation.

Claude Design
- Turns ideas, sketches or screenshots into an interactive prototype as an artifact; edit directly, share, or hand to Claude Code to build. Works inside any conversation, in the Artifacts tab, and as a dedicated space at claude.ai/design.
- Use when: written brief/sketch/screenshot to working UI prototype without code; exploring and comparing design variations; iterating on layout, copy or interactions (canvas, comment, or ask); prototype uses your team's design system.
- Availability: beta in conversations on paid plans (Pro, Max, Team, Enterprise); Pro and Max on by default; Team on by default (admin can turn off); Enterprise: admin turns on in Organization settings > Artifacts. The standalone claude.ai/design space has its own separate settings.

Claude for Excel (sidebar)
- Analyze, understand, modify spreadsheets through conversation. Use when: understanding formulas across tabs of a multi-tab workbook; updating assumptions while preserving formula dependencies; debugging #REF!, #VALUE!, circular references; creating or populating spreadsheets with proper formula structure; building pivot tables or charts.

Claude for PowerPoint (sidebar)
- Draft, edit, restructure presentations while keeping your template and brand styling. Use when: turning an outline/notes into a first-draft deck; tightening slide copy, adding speaker notes, adjusting tone; reordering, splitting, merging slides; consistent formatting; layout or chart suggestions.

Claude for Word (sidebar)
- Draft, revise, restructure the open document; works with tracked changes and comments; pulls context from connected sources. Use when: outline to structured draft in the team template; revising a section in place; responding to reviewer comments and tracked changes; grounding the draft in connected source material.

Claude for Outlook (sidebar)
- Triage mail, draft replies with context from related threads and your calendar, summarize long chains or produce next steps. Currently in beta and installed separately from the other Microsoft 365 add-ins.

Claude in Chrome
- Browser extension adding Claude as a sidebar in Google Chrome; observes your work and acts in the browser.
- Use when: summarize articles/papers/pages; draft email responses or manage inbox; automate repetitive forms; test website features or navigate multi-step workflows; keep context across tabs (good for niche internal tools, CRMs, dashboards).
- Important note: generally available; on by default on Pro, Max and Team; on Enterprise off by default until an org admin turns it on; not available on Free. Anthropic recommends low-risk tasks on trusted websites. Asks permission before high-risk actions (purchasing, sharing personal data); certain site categories (financial services, adult content) blocked by default.

Summary table (as given)

```
Tool                      Best for                                   Where it runs
------------------------  -----------------------------------------  ------------------------------------
Claude.ai                 General tasks, research, writing,          Web, desktop, mobile apps
                          analysis, file creation
Claude Code               Software development, codebase             Terminal/command line, IDE, or browser
                          navigation, git workflows
Claude Cowork             Complex multi-step tasks: research         Desktop (plus web and mobile, in beta,
                          briefs, document creation, file            on eligible plans)
                          organization, data analysis
Claude Tag                Team collaboration, meeting prep, quick    Slack workspace
                          answers in context
Claude Design             UI prototypes, design exploration,         Any conversation with Claude (paid
                          design-system-aware mockups                plans), plus claude.ai/design
Claude for Microsoft 365  Editing in place, carrying context         Excel, PowerPoint, Word, Outlook
                          across documents                           sidebars
Claude in Chrome          Web research, email management,            Chrome browser sidebar
                          browser automation
```

Source gap: four YouTube videos are embedded ("Claude Code on the web", "Tag Claude in, right where you already work", "Claude in Excel: Sample Use Case", "Claude for Chrome brings AI where you're already working"); only titles were captured. The lesson's "What you'll learn" lists Claude Code, Tag, Design, Microsoft 365 and Chrome; Cowork appears only in the summary table.

### Lesson 13 - What's next (recap)

- Recap of the course: Claude as helpful, harmless, honest thinking partner; web/desktop/mobile with sync; prompts = stage, task, rules.
- Iteration is key; fix generic or wrong-tone answers with more specific context; AI Fluency = Delegation, Description, Discernment, Diligence.
- Projects = dedicated workspaces (persistent knowledge, custom instructions, team collaboration). Artifacts (designs, decks, living documents, code, diagrams, interactive tools) are saved in the Artifacts tab on paid plans (designs, decks and living documents are on paid plans). Skills = instruction packages (built-in document creation and custom).
- Connectors link tools (Google Workspace, Slack, Notion, and more); Enterprise Search = dedicated project over organization knowledge; Research = systematic multi-source investigation.
- Claude applies across roles; beyond claude.ai: Claude Code, Claude Tag in Slack, Claude for Microsoft 365, Claude in Chrome.
- Resources named: AI Fluency courses; AI Capabilities and Limitations; Use Case Gallery; Anthropic Help Center; Prompting documentation; Claude Code in Action; Introduction to Claude Cowork; Connector Directory.
- Advice: start simple - pick one recurring task this week, try it, iterate. Claude is a collaborator, not a replacement; bring your expertise, context and judgment.

### Lesson 14 - Certificate of completion

- Page content is a captured result of a 10-question quiz (the learner scored 9 of 10, 90%, passed) plus survey questions. Quiz content is summarized in Section 3.

---

## 3. Exercises and Interactive Activities

1. ThinkingPartnerSorter (Lesson 1). Source gap: captured with no content; what it tests and the reasoning are unknown.

2. ConnectorReachBuilder (Lesson 8). Starting request: "Draft a short status update on the budget project for my manager." Three toggles: Cloud storage, Email, Team chat (all start NOT CONNECTED). Each toggle adds a sentence to the request that points at outside information.
   - Tests: understanding that connections give your request somewhere to point; they are not a reason for Claude to search unprompted.
   - Reasoning given: "Same request underneath the whole time. What changes is what you're able to ask it to draw on." With nothing connected, the request is complete from your words alone ("One sentence - that's a complete request").
   - Source gap: the sentence each source adds was not captured.

3. ResearchOrNot (Lesson 10), two parts.
   - Part 1: route 5 sample questions to Research, Quick web search, Thinking, or Enterprise search. Only Question 1 was captured: "Compare the three payroll providers we're considering - pricing, implementation time, and support quality - and give me sources I can check." Fits the lesson's Research criteria (comparative analysis of vendors, verifiable citations, multiple sources).
   - Part 2: compare two versions of a Research prompt and pick the stronger one (stronger = specific goals, structure, constraints, per the lesson's tips).
   - Source gap: Questions 2-5, the correct routings and Part 2's prompt pairs were not captured.

4. Embedded videos (no transcripts captured): "Getting started with Claude.ai" (L2), "Data analysis with AI" (L3), "Getting started with projects in Claude.ai" (L5), "Claude works with you on slides, spreadsheets, and contract redlines" (L7), plus four videos in L12 (Claude Code on the web; Tag Claude in; Claude in Excel sample use case; Claude for Chrome).

5. End-of-course quiz (Lesson 14), 10 questions. Correct answers as captured:
   - Q1 Claude's capabilities: an AI assistant for writing, research, coding, problem-solving, and more (not a smart-home voice assistant, customer-service-only chatbot, or search engine).
   - Q2 Projects vs skills: projects store knowledge, skills perform tasks.
   - Q3 Data accessible through connectors: only data you have permission to access.
   - Q4 Who completes Enterprise Search initial setup: an organization Owner (admin).
   - Q5 Project knowledge near context limits: Claude searches project knowledge and retrieves only what is relevant, expanding capacity by up to 10x.
   - Q6 Published artifact: share with anyone via a link; they can view and interact with it, even without a Claude account.
   - Q7 Three elements of an effective prompt: setting the stage, defining the task, specifying rules.
   - Q8 Response too generic: add more details about audience, role or constraints.
   - Q9 Best for navigating an unfamiliar codebase and automating development tasks: Claude Code.
   - Q10 Good candidate for Research: marked Incorrect for the learner. Options were: conducting comprehensive market analysis; reformatting a PDF file; brainstorming product codenames; redlining legal documents. Per Lesson 10, comprehensive market analysis fits Research.
   - Source gap: for Q10 the page does not show which option the learner chose or which is marked correct; the answer above is inferred from Lesson 10. Also note Q6's "even without a Claude account" conflicts with Lesson 6 (anyone you share with needs a Claude account).
   - Questions 11-13 are satisfaction/feedback survey items, not knowledge questions.

---

## 4. Common Mistakes

| Mistake | Fix |
|---|---|
| Vague prompt gives generic output | Add audience, role, constraints; use stage / task / rules |
| Not stating length | Be explicit ("two-paragraph summary", "under 100 words") |
| Format ignored | Show an example of the format or describe the structure explicitly |
| Trusting confident-sounding facts | Verify key facts for high-stakes work; ask for sources or confidence; enable web search |
| Treating the first reply as final | Iterate: follow-ups, specific feedback, redirect; start a new chat if off track |
| Vague feedback ("make it shorter") | Give specific feedback ("cut the first two paragraphs...") |
| Re-uploading or re-explaining the same files every chat | Create a project and put them in its knowledge base |
| Putting everything in one giant project | Start focused, then expand |
| Stale project knowledge | Review and update periodically |
| Files named "document1.pdf" | Use descriptive names (e.g. "Q4-2024-Brand-Guidelines.pdf") |
| Using a project to define a repeatable process | Projects store knowledge; use a skill for the process (steps, order, methodology) |
| Using a skill to hold reference material | Put knowledge in a project; the skill can reference it |
| Skills do not work | Turn on Code execution and file creation (Settings > Capabilities); on Enterprise an Owner must enable it first |
| Installing unvetted custom skills or connectors | Install only from trusted sources; review contents of external skills |
| Expecting an uploaded file to be edited in place | Claude creates a new version rather than editing the original |
| Expecting connectors to reveal everything | Claude sees only what you can access |
| Expecting a connected source to be searched on its own | Connections give the request somewhere to point; you still ask for it |
| Expecting a doc's embedded chart to update live | It is a snapshot; ask Claude to refresh from connected tools |
| Asking for content when you need a deliverable | Ask for the deliverable ("turn this into a one-page doc"); say "Create this as an artifact" |
| Running Research without web search | Web search must be enabled for Research |
| Using Research for quick facts | Use web search for quick, specific facts or one or two sources |
| Using Research for pure reasoning | Use Thinking for math, debugging, logic with no external info |
| Using Research for internal company questions | Use Enterprise Search for internal knowledge |
| Expecting Enterprise Search on Free, Pro or Max, or before admin setup | It is Team and Enterprise only; an Owner must complete setup first |
| Feeding a multi-step task one question at a time | Hand it off (Cowork) by describing the outcome |
| Using Claude in Chrome for high-risk tasks | Use it for low-risk tasks on trusted websites |

---

## 5. Key Terms

| Term | Meaning |
|---|---|
| Claude | The AI assistant/intelligence; a thinking partner, more than a chatbot |
| Constitutional AI | Approach guiding Claude to avoid harmful outputs and align with human values, transparently |
| Context window | How much material Claude can consider; 200K+ tokens (about 500 pages), up to 1M tokens on Pro, Max, Team, Enterprise with supported models |
| Thinking | Capability to reason step by step before answering |
| Learning mode | Experience that guides your reasoning rather than giving answers |
| Prompt framework | Setting the stage, defining the task, specifying rules |
| Memory | Auto-saved context (role, preferences, decisions, style) across chats; editable in Settings |
| Instructions for Claude | Settings > Account preferences applied to every conversation |
| 4D Framework for AI Fluency | Delegation, Description, Discernment, Diligence |
| AI Fluency | Ability to collaborate effectively with AI, with good judgment |
| Eval | Systematic test of Claude's performance on tasks that matter to you |
| Chat | Desktop-app home of turn-by-turn work |
| Cowork | Desktop-app home of handed-off, multi-step work |
| Code tab | Desktop-app home of software building (Local or Cloud) |
| Quick entry | Double-tap Option (Mac) compact always-on-top Claude window |
| Scheduled task | Task set once that runs on a cadence; remote runs even when the computer is asleep |
| Subagents | Parallel background workers, each with its own context |
| Computer use | Claude operates your computer directly; permission per app; research preview on Pro and Max |
| Plugin | Ready-made bundle of skills, connectors and agents for a role |
| Project | Self-contained workspace: memory, chats, knowledge base, instructions |
| Project instructions | Behavior guidance applied to every chat in the project |
| Project knowledge | Uploaded documents Claude references across the project's chats |
| RAG | Retrieval Augmented Generation; retrieves only relevant parts when knowledge nears the context limit (up to 10x capacity) |
| Can view / Can edit / Owner | Project permission levels |
| Artifact | An output (doc, deck, design, dashboard, prototype) shown in a window beside the chat |
| Artifacts tab | Where paid-plan artifacts are saved |
| Claude Design / Slides / Docs | Beta artifact experiences for visual work, presentations, living documents (paid plans) |
| File creation | Produces downloadable Word, Excel, PowerPoint, PDF files (different from artifacts) |
| Skill | Folder of instructions, scripts, resources loaded dynamically for specialized tasks |
| Anthropic Skills | Built-in, Anthropic-maintained (Excel, Word, PowerPoint, PDF) |
| Custom Skills | Skills you or your organization create; private to your account |
| Code execution and file creation | Capability (Settings > Capabilities) that Skills require; secure sandbox |
| Connector | Link that lets Claude read from and act in your tools |
| MCP (Model Context Protocol) | Open standard powering connectors; "USB-C for AI" |
| Web connector | Connector to cloud services (Google Drive, Notion, Slack, Asana) |
| Desktop extension | Connector running locally via the Claude Desktop app |
| Connector directory | claude.ai/directory; Web and Desktop extensions tabs |
| Custom connector | Connector you add for a tool lacking a directory entry |
| Enterprise Search | "Ask {Org Name}" pre-built org project for searching connected tools; Team and Enterprise |
| Research | Agentic multi-step investigation with citations; needs web search |
| Claude Code | Agentic coding tool (terminal, IDE, browser, Slack) |
| Claude Tag | Claude in Slack |
| Claude for Microsoft 365 | Claude sidebar in Excel, PowerPoint, Word, Outlook |
| Claude in Chrome | Chrome sidebar extension that observes and acts in the browser |
| Use Case Gallery | Step-by-step guides by role |

---

## 6. Exam-style Self-test

1. Q: Name the three elements of an effective prompt.
   A: Setting the stage (role, objectives, context), defining the task (the action), specifying rules (style, tone, examples).

2. Q: What are the four competencies of the 4D Framework for AI Fluency?
   A: Delegation, Description, Discernment, Diligence.

3. Q: Claude's response is too generic. What does the course say to do?
   A: Add details about your audience, role or constraints; the prompt lacked context.

4. Q: Describe the simple eval approach.
   A: Gather 5-10 examples of a regular task; create test prompts with natural context; compare Claude's outputs to your examples; refine prompts, add examples, or identify where human review is essential.

5. Q: Which desktop-app tab handles turn-by-turn work, which handles hand-offs, and which handles coding?
   A: Chat; Cowork; the Code tab.

6. Q: Where do scheduled tasks run, and what is the exception?
   A: Remotely, so they run even when the computer is asleep or the app is closed; a task that needs files on your computer runs locally, only while the app is open.

7. Q: What is the difference between a project and a skill?
   A: Projects store knowledge Claude references; skills define processes Claude executes ("projects store knowledge, skills perform tasks"). They complement each other.

8. Q: What happens when a project's knowledge base nears the context limit?
   A: Claude uses RAG: it searches project knowledge and retrieves only what is relevant, expanding capacity by up to 10x with quality maintained.

9. Q: List the three project permission levels.
   A: Can view, Can edit, Owner.

10. Q: Where are paid-plan artifacts saved, and what happens on the Free plan?
    A: In the Artifacts tab; on Free, an artifact stays with the conversation that created it.

11. Q: How does an artifact differ from Claude's file creation?
    A: An artifact opens and updates in Claude and is shared by link; file creation hands you a downloadable Word, Excel, PowerPoint or PDF file.

12. Q: What do Skills need to be enabled, and who must act first on Enterprise?
    A: Code execution and file creation (Settings > Capabilities). On Enterprise, organization Owners must first enable Code execution and Skills in Admin settings.

13. Q: What powers connectors, and what are the two types?
    A: The Model Context Protocol (MCP). Web connectors and desktop extensions.

14. Q: What data can Claude reach through a connector?
    A: Only data you have access to; permissions are scoped, can be toggled, and are revocable.

15. Q: Who must complete Enterprise Search setup first, and what must they connect?
    A: An organization Owner; a connector for Documents and one for Chat (email is recommended but optional).

16. Q: When should you pick Research over web search, Thinking, or Enterprise Search?
    A: Research for comprehensive multi-source, cited reports (web plus integrations). Web search for quick facts; Thinking for pure reasoning without external info; Enterprise Search for internal organizational knowledge.

17. Q: What must be on for Research to work, and how long does it take?
    A: Web search must be enabled; a run takes a few minutes or more.

18. Q: Which Claude product is best for navigating an unfamiliar codebase and automating development tasks, and which brings Claude into Slack?
    A: Claude Code; Claude Tag.
