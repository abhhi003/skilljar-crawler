# Consolidated Notes - Claude Certified Architect Foundations Prep

The Anthropic API, Claude on Google Cloud, Claude with Amazon Bedrock and Introduction to MCP
courses teach the same curriculum (the MCP course's lessons are the MCP section of the other
three). These files replace reading four sets of notes with one core file plus two short
platform delta files.

## Reading order

1. 01-core-claude-api-and-mcp.md      platform-neutral core: API course notes with the MCP course merged in
2. 02-delta-google-vertex.md          only what Claude on Google Cloud teaches differently
3. 03-delta-amazon-bedrock.md         only what Claude with Amazon Bedrock teaches differently

Read the core file first. Use a delta file only if you are studying that platform.

## Not covered here (separate, unrelated courses)

AI Fluency, Claude Code in Action and Claude 101 share almost nothing with the files above. Their
notes stay in the parent folder:

  ../01-ai-fluency-framework-foundations-notes.md
  ../04-claude-code-in-action-notes.md
  ../05-claude-101-notes.md

## Originals

The per-course notes these files were built from are unchanged in the parent folder
(02-, 03-, 06-, 07-...-notes.md). The raw exports and the site's own course notes are under
out-CCAR-F/. When a consolidated file and an original disagree, check the official notes in
out-CCAR-F/<course>/_official-course-notes.md.

## How "differs" was decided (delta files)

A difference is a fact, step, parameter, limit or availability stated in one course and either
absent from the other or stated differently. Rewording, a different example or a different lesson
order is not a difference. Every lesson of the delta course appears in a table marked same,
differs, platform-only or unclear, so nothing is skipped silently.

## Known limits of the source material

- Quiz and exercise questions and answer keys were not captured; self-tests are built from the
  taught content, not the real quizzes.
- The notes come from the site's condensed course notes for LLMs plus the lesson pages, not from
  video transcripts. Detail that only appears in the videos is missing.
- Model IDs, regions, quotas, IAM roles and prices are included only where the course states them.

## Open conflicts to verify against the course itself

Unverified. The MCP-related ones are marked "Source conflict:" in the core file; the cache lifetime
and image limit appear as "differs" rows in the two delta files.

- Prompt cache lifetime: API notes say 1 hour maximum with 4 breakpoints; Bedrock and Google Cloud
  notes say 5 minutes and give no breakpoint limit.
- Images per request: API notes say 100; Bedrock notes say 20.
- list_prompts() result attribute: `result.props` (MCP and Bedrock notes) vs `result.prompts`
  (API notes).
- MCP prompt decorator and helper: `@prompt` / `base.user_message` vs `@mcpserver.prompt` /
  `base.UserMessage`.
- Templated resource URI: `docs://documents/{doc_id}` vs `documents/{doc_id}`.
- Pydantic URI type: `AnyUrl` vs `AnyURL`.
