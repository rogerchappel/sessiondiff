# sessiondiff PRD

Status: in-progress

## Summary

`sessiondiff` compares two coding-agent session logs and highlights changes in
commands, edited files, claims, and verification outcomes. It is a quiet local
CLI for understanding whether a rerun got better, worse, or merely different.

## Source Attribution

Inspired by the growth of terminal coding agents and parallel-agent workflows
described in recent 2026 coding-agent comparisons. This project reframes that
need as deterministic local transcript comparison rather than hosted agent
orchestration.

## Problem

Agent runs are noisy. Teams need a small, local way to compare transcripts from
Codex, Claude Code, OpenCode, or custom runners without leaking data to a
service.

## Target Users

- Developers running repeated agent attempts on the same task.
- Maintainers reviewing agent-generated work.
- Tool authors building eval fixtures from real transcripts.

## V1 Scope

- `sessiondiff compare before.log after.log`
- Parse plain text, JSONL, and simple tool-call blocks.
- Extract command invocations, file paths, commit hashes, test results, and
  final claims with conservative heuristics.
- Output human markdown and machine JSON.
- `sessiondiff summarize run.log` for a single run inventory.
- Fixture-backed tests for common transcript shapes.

## Non-Goals

- Vendor-specific private API integrations.
- Semantic LLM judging.
- Uploading or telemetry.

## Success Criteria

- A developer can compare two fixture transcripts and see added/removed
  commands, files, and verification claims.
- JSON output is stable enough for CI snapshots.
- README explains supported inputs and privacy boundaries.

