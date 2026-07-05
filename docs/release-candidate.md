# Release Candidate Notes

## Classification

ship

## Candidate Scope

- Adds reusable `SKILL.md` packaging for agent-run comparison.
- Captures approval and blocker signals from plain text and JSONL transcript records.
- Emits a conservative diff verdict for improved, regressed, changed, or unchanged runs.
- Keeps all analysis local and fixture-backed.

## Verification Plan

```bash
npm test
npm run check
npm run build
npm run smoke
npm run release:readiness
bash scripts/validate.sh
```

## Release Risks

- Heuristic transcript extraction is intentionally conservative and may miss vendor-specific fields.
- Verdicts are evidence summaries, not semantic guarantees.
- Users should review generated output before sharing transcript-derived artifacts.
