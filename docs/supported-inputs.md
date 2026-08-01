# Supported inputs

`sessiondiff` is designed for local transcript files from coding-agent and
automation runs. It uses conservative text parsing rather than vendor APIs, so
the safest input is a log you can inspect in a text editor before sharing or
committing any generated report.

## Current input shapes

- Plain text terminal logs with shell commands, file paths, and verification
  output.
- JSONL transcript exports where each line is an object with text-like content.
  Object fields and array items are traversed recursively, including arrays that
  mix strings, objects, and further arrays. Command, test, file, commit, and
  signal evidence in those containers is included; duplicate commands, files,
  and commits are reported once. Each line must still be a JSON object: a
  top-level array is treated as plain text, and non-text scalar values do not
  contribute evidence.
- Explicit tool-call blocks that start with `tool_call`, `function_call`,
  `<tool>`, or a `` ```tool `` fence and include command, file, or test
  evidence. Ordinary Markdown and language-tagged code fences are treated as
  plain text, not tool calls.

The fixture smoke currently exercises a plain text run, a JSONL run, and a log
with tool-block sections. Use those fixtures as the best description of the
v0.1.0 parser contract:

```sh
node dist/src/cli.js summarize tests/fixtures/tool-blocks.log --format markdown
node dist/src/cli.js compare tests/fixtures/before.log tests/fixtures/after.jsonl --format json
```

## Boundaries

- The CLI does not call hosted model, agent, or transcript APIs.
- It does not decrypt, normalize, or authenticate proprietary session formats.
- Secret redaction is not guaranteed. Review logs before sharing generated
  summaries or comparison reports.
- Parser heuristics may change before a stable 1.0 release, so pin package
  versions if generated JSON is consumed by automation.
