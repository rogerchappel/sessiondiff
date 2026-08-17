# Release readiness

Use this checklist before cutting a release or asking for a release review.

## Local verification

```sh
npm install
npm run check
npm run test
npm run smoke
npm run package:smoke
npm run release:check
```

## Package contents

Run `npm run package:smoke` when available and review the dry-run file list for only the built runtime, README, license, and other intentional release assets.

## Publication flow

The pull-request release dry run packs once, captures npm's reported tarball filename, and passes that exact file to `npm publish --dry-run`. On a version tag, the release workflow uses the same flow with trusted publishing and provenance, then attaches the already-published tarball to the GitHub release. Do not replace the captured filename with a glob or run `npm pack` again between publication and upload.

## Notes

- Keep README examples aligned with the fixture-backed smoke command.
- Do not publish until CI is green on the release branch.
- Update CHANGELOG.md with user-facing changes before tagging.
- Configure the npm package for trusted publishing from `.github/workflows/release.yml`; no long-lived npm token is required.
