# CCDF practice exam

A practice exam for Claude Certified Developer – Foundations (CCDV-F). The questions come from the course text in `../out/`.

## Use

Open `index.html` in a browser. It is a static page with no server or install. Attempts, history, and any unfinished attempt are kept in the browser's localStorage, so use the same browser each time.

- **Sets (SET-A, SET-B, …):** full mock exams. No question appears in more than one set, so each set is a fresh test. You can turn the 120-minute timer off on the home page.
- **Study mode:** shows the answer and explanation after each question, before you move on.
- **Review:** after you submit, you get a score per domain and every question with your answer, the correct one, the explanation, and the source lesson. You can filter to incorrect, flagged, or unanswered questions, or to one domain.
- **Answer key:** shows every question in a set with its answer, without taking the test.
- **Domain drill:** untimed questions picked at random from the whole bank. It can also be limited to questions you got wrong before.

## Exam pattern used

These figures come from third-party summaries of Anthropic's CCDV-F exam guide. Check them against the official guide on the Partner Academy.

- 53 questions, 120 minutes. Pass mark is a scaled 720/1000; here it is approximated as 72% correct.
- Mix of single-answer (4 options) and multiple-response (5 options, "Select TWO") items. Multiple-response items score only if every pick is right.
- Domain weights: Applications and Integration 33.1, Model Selection and Optimization 16.8, Agents and Workflows 14.7, Prompt and Context Engineering 11.0, Tools and MCPs 10.6, Security and Safety 8.1, Claude Code 3.1, Eval, Testing, and Debugging 2.6.

Sources: [DEV Community domain breakdown](https://dev.to/poorna_reddy/claude-certified-developer-foundations-ccdv-f-exam-domains-weights-and-topics-26n), [certificationpractice.com quick facts](https://certificationpractice.com/exam-overviews/anthropic-claude-certified-developer-foundations-quick-facts), [findskill.ai format overview](https://findskill.ai/blog/claude-certified-developer-exam-cost-format-domains/).

## Editing the bank

Exam settings (title, set size, timer, pass mark, domain weights, localStorage prefix) are in `exam.json`. Questions are in `data/m1.json` … `data/m5.json`, one file per course module. After editing either, rebuild:

```
node build.js
```

The build checks every question, shuffles the option order once, and deals the sets to match the domain weights. The seed is fixed, so sets keep the same contents between builds as long as the bank does not change. Questions left over after dealing are used only by the domain drill.
