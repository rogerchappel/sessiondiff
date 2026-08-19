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

Input paths are positional. The CLI accepts `--format markdown|json`,
`--format=markdown|json`, and `-f markdown|json`; unknown options are rejected
instead of being interpreted as paths.

Comparison verdicts use the same keyed added and removed inventories rendered
in JSON and Markdown. Replacing a command, file, commit, test, approval,
blocker, or final claim is therefore reported as `changed` even when the before
and after inventories contain the same number of entries. Test pass/fail and
blocker changes continue to take precedence as `improved` or `regressed`.
Common numeric summaries such as `10 passing`, `1 failing`, `0 failed`,
`failures: 0`, and `0 errors` contribute pass/fail evidence in plain text and
nested JSONL strings. A nonzero failing count or another explicit failure on
the same line takes precedence over passing evidence, while a zero failing
count with a positive passing count is considered passing. These heuristics
recognize summary phrases, not arbitrary framework-specific result tables or
structured numeric fields.

Approval and blocker phrases are also checked for common local negations.
Phrases such as `not blocked`, `no blocker`, `no approval required`, and
`approval is not required` do not create active signals in plain text or nested
JSONL strings. Positive phrases elsewhere in the same input, such as `Blocked:
missing input` or `Approval required`, remain detectable.

## Boundaries

- The CLI does not call hosted model, agent, or transcript APIs.
- It does not decrypt, normalize, or authenticate proprietary session formats.
- Secret redaction is not guaranteed. Review logs before sharing generated
  summaries or comparison reports.
- Parser heuristics may change before a stable 1.0 release, so pin package
  versions if generated JSON is consumed by automation.
