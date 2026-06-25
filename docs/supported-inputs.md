# Supported inputs

`sessiondiff` is designed for local transcript files from coding-agent and
automation runs. It uses conservative text parsing rather than vendor APIs, so
the safest input is a log you can inspect in a text editor before sharing or
committing any generated report.

## Current input shapes

- Plain text terminal logs with shell commands, file paths, and verification
  output.
- JSONL transcript exports where each line is an object with text-like content.
- Simple tool-call blocks that include command, file, or test evidence.

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
