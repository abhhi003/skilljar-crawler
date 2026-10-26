# CCAR-F practice exam

A practice exam for Claude Certified Architect – Foundations (CCAR-F). The questions come from the course content in `../out-CCAR-F/`.

## Use

Open `index.html` in a browser. It is a static page with no server or install. Attempts are kept in the browser's localStorage under the `ccarf.` prefix, separate from the CCDV-F quiz.

- **Sets (SET-A, SET-B, …):** full mock exams. No question appears in more than one set. Questions that share a production scenario are grouped together, as on the real exam. You can turn the 120-minute timer off on the home page.
- **Study mode:** shows the answer and explanation after each question.
- **Review:** after you submit, you get a score per domain and every question with your answer, the correct one, the explanation, and the source. You can filter to incorrect, flagged, or unanswered questions, or to one domain.
- **Answer key:** shows every question in a set with its answer, without taking the test.
- **Domain drill:** untimed questions picked at random from the whole bank. It can also be limited to questions you got wrong before.

## Exam pattern used

These figures come from third-party summaries of Anthropic's CCAR-F exam guide. Check them against the official Partner Certifications page.

- 60 questions, 120 minutes. Pass mark is a scaled 720/1000; here it is approximated as 72% correct.
- Mix of single-answer (4 options) and multiple-response (5 options, "Select TWO") items. Multiple-response items score only if every pick is right.
- Domain weights: Agentic Architecture & Orchestration 27, Claude Code Configuration & Workflows 20, Prompt Engineering & Structured Output 20, Tool Design & MCP Integration 18, Context Management & Reliability 15.
- Scenarios: the real exam picks 4 of these 6 at random: Customer Support Resolution Agent, Code Generation with Claude Code, Multi-Agent Research System, Developer Productivity with Claude, Claude Code for Continuous Integration, Structured Data Extraction. Here, questions that fit a scenario are tagged with it. Each set mixes all 6 rather than picking 4, so you can practise every scenario.

Sources: [DEV Community domains, weights and scenarios](https://dev.to/poorna_reddy/claude-certified-architect-foundations-ccar-f-exam-domains-weights-and-scenarios-2ofm), [timolabs exam guide](https://www.timolabs.dev/certifications/architect-foundations), [claudecertificationguide.com](https://claudecertificationguide.com/architect-foundations).

## Question sources

The Anthropic API, Vertex, and Bedrock courses teach the same curriculum, and their lesson pages are video players. The questions are therefore written from each course's `_official-course-notes.md` and split by topic, not by course, to avoid duplicates:

| File | Topic block |
|---|---|
| `data/m1.json` | API foundations, prompting, evals |
| `data/m2.json` | Tool use, RAG, Claude features (caching, citations, thinking, files) |
| `data/m3.json` | MCP (including the Introduction to MCP course), agents and workflows, computer use |
| `data/m4.json` | Claude Code in Action, plus the Claude Code sections of the API courses |
| `data/m5.json` | AI Fluency and Claude 101 |

## Editing the bank

Exam settings are in `exam.json`. After editing it or any `data/*.json`, rebuild:

```
node build.js
```

The build checks every question (including domain and scenario names), shuffles the option order once, and deals the sets to match the domain weights. The seed is fixed, so sets keep the same contents between builds as long as the bank does not change.
