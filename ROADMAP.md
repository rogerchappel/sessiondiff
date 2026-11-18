# Roadmap

This roadmap describes intended direction, not a binding delivery promise.
Priorities below are grounded in the current local transcript comparison workflow;
maintainers should revise them as real user needs emerge.

## Now

- Keep the supported transcript inputs and their extraction behavior explicit:
  plain-text logs, JSONL records, and delimited tool-call blocks should continue
  to produce stable command, file, commit, test, approval, blocker, and final-claim
  summaries (`src/session.ts`; `tests/session.test.ts`).
- Preserve useful comparison output when one session has no detected signals;
  keep JSON and Markdown summary/diff output readable and covered by renderer tests
  (`src/render.ts`; `tests/render.test.ts`).
- Maintain the local CLI contract for summarizing and comparing session files,
  including machine-readable output and actionable errors (`src/cli.ts`;
  `tests/cli.test.ts`).

## Next

- Review extraction edge cases against ordinary, anonymized transcript examples
  before expanding heuristics; add a regression fixture and focused test for each
  confirmed behavior gap (`tests/fixtures/`; `tests/session.test.ts`).
- Improve the documented CLI examples only when they match the actual options and
  output formats (`README.md`, `docs/`).
- Keep release readiness checks aligned with the build, tests, CLI smoke test, and
  package contents (`package.json`; `tests/release-readiness.test.ts`).

## Later

- Consider additional session formats or comparison signals only when there is a
  concrete user need and a representative fixture to validate the behavior.
- Revisit packaging or integrations if local CLI use demonstrates a limitation;
  retain the local-first workflow unless evidence supports a change.

## Not Planned

- Unrelated platform rewrites without a clear migration path.
- Mandatory dependencies on a single ecosystem unless the project requires it.
- Public release dates before maintainers are ready to commit to them.
- Automatic upload or remote collection of session logs; inputs remain local.

## Roadmap Review

Before each major or meaningful minor release:

- Move completed user-visible work into `CHANGELOG.md`.
- Remove priorities that no longer match the implementation or user needs.
- Promote only the next reviewable set of work into `Now`.
