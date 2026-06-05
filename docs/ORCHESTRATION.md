# sessiondiff Orchestration Plan

Local-first CLI for comparing coding-agent session logs.

## Stewardship Loop

1. Inspect the README, package metadata, and release workflows for drift.
2. Make one focused change that improves installability, verification, or user trust.
3. Run the smallest meaningful verification commands listed in the README or package scripts.
4. Open a focused PR with the exact command output and any remaining limitation.

## Release Readiness

- Treat v0.1.0 as pre-production and avoid claims that the tool is complete.
- Prefer fixture-backed tests or smoke checks before expanding public API promises.
- Keep release notes tied to observable behavior, docs, metadata, and verification evidence.
