# sessiondiff

sessiondiff compares coding-agent session logs and renders the commands,
files, commits, tests, and final claims that changed between two runs.

## Status

This repository is early-stage. Confirm the current support, release, and
security posture before using it in production.

## Install From A Checkout

```sh
npm install
npm run build
```

## Use

Summarize one captured session log:

```sh
node dist/src/cli.js summarize tests/fixtures/tool-blocks.log --format markdown
```

Compare two session logs and write JSON for automation:

```sh
node dist/src/cli.js compare tests/fixtures/before.log tests/fixtures/after.jsonl --format json > sessiondiff.json
```

The package bin exposes the same commands after install:

```sh
sessiondiff compare <before.log> <after.log> --format markdown
sessiondiff summarize <run.log> --format json
```

See [supported inputs](docs/supported-inputs.md) for the current parser
contract and the privacy boundaries to review before sharing generated reports.

## Agent Skill

See [SKILL.md](SKILL.md) for the reusable agent workflow, side-effect
boundaries, approval requirements, and validation steps for transcript
comparison.

## Verify

Run the release-candidate checks before opening a PR or publishing a package:

```sh
npm run check
npm test
npm run smoke
npm run release:readiness
npm run package:smoke
npm run release:check
```

`npm run release:readiness` validates repository metadata, package contents,
package smoke coverage, and CI placeholder cleanup. `npm run release:check`
runs the TypeScript check, compiled tests, fixture smoke commands, and npm pack
dry-run.

You can also run the local validation helper:

```sh
bash scripts/validate.sh
```

## Release readiness

Use [docs/release-readiness.md](docs/release-readiness.md) before opening release PRs or tagging a release.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance. Review
session logs for secrets or private customer data before sharing fixtures,
reports, or generated diffs.

## License

MIT
