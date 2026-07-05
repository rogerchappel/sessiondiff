# sessiondiff

Use this skill when you need to compare two coding-agent runs, audit whether a rerun improved, or summarize a single transcript before a handoff.

## Inputs

- Two local transcript files for `compare`, or one transcript for `summarize`.
- Supported shapes: plain terminal logs, JSONL records, and simple fenced tool-call blocks.
- Keep private data local; the CLI performs no network calls or telemetry.

## Side-Effect Boundaries

- Reads only the transcript paths you pass.
- Writes only to stdout unless your shell redirects output.
- Does not execute commands found inside transcripts.
- Does not approve, retry, publish, or contact external services.

## Approval Requirements

No approval is needed for local transcript summarization. Ask for explicit human approval before sharing generated summaries outside the local workspace when transcripts may contain private paths, credentials, customer data, or unreleased work.

## Examples

```bash
sessiondiff summarize ./runs/latest.log --format markdown
sessiondiff compare ./runs/attempt-1.log ./runs/attempt-2.jsonl --format json
```

## Validation Workflow

1. Run `npm test`.
2. Run `npm run check`.
3. Run `npm run build`.
4. Run `npm run smoke`.
5. Inspect the verdict and blocker sections before using the diff as release or PR evidence.

