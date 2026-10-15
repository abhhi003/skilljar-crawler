# Complete a partial eval for a summarization feature

## Complete a partial eval for a summarization feature

CheckpointEvals & Judges·9 min

 

### Complete a partial eval for a summarization feature

 

This eval has two gaps. For the dataset, identify the specific output each input case should produce. For the judge prompt, match each score band to what it means. Drag each answer card from the bank onto its row below.

 

dataset.json

 

[ { "input": "Long support thread about a delayed refund, 14 messages.", "expected_behavior": "A 2-sentence summary naming the issue (delayed refund) and the current status (escalated)." }, { "input": "Meeting transcript where three action items are assigned.", "expected_behavior": "" }, { "input": "Bug report with repro steps and one unrelated aside.", "expected_behavior": "" } ]

 

judge_prompt.txt

 

You are grading a summary against its expected behavior. Summary: {output} Expected behavior: {expected_behavior} Return JSON with "strengths", "weaknesses", "reasoning", and "score". Score scale: 1 to 3, 4 to 7, 8 to 10 (see below to complete the definitions).

 

A summary that lists all three action items with their ownersA summary of the bug and its repro steps that omits the unrelated asideMisses required contentPartial: some required content present, some missingComplete and faithful to the expected behavior

Expected output for the meeting-transcript case

Drop answer here

Expected output for the bug-report case

Drop answer here

Judge score band 1 to 3

Drop answer here

Judge score band 4 to 7

Drop answer here

Judge score band 8 to 10

Drop answer here
