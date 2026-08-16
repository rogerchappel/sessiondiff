import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packagePath = path.join(root, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const scripts = packageJson.scripts ?? {};
const failures = [];

function requireField(condition, message) {
  if (!condition) failures.push(message);
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function validateArtifactFlow(file, workflow, { githubRelease = false } = {}) {
  const label = `.github/workflows/${file}`;
  requireField(countMatches(workflow, /\bnpm pack\b/g) === 1, `${label} must pack exactly once`);
  requireField(/id:\s*package[\s\S]*GITHUB_OUTPUT/.test(workflow), `${label} must capture the packed archive as the package step output`);
  requireField(/npm publish\s+["']?\$\{\{\s*steps\.package\.outputs\.archive\s*\}\}/.test(workflow), `${label} must publish the captured archive`);
  if (githubRelease) {
    requireField(/gh release create[\s\S]*\$\{\{\s*steps\.package\.outputs\.archive\s*\}\}/.test(workflow), `${label} must attach the captured archive to the GitHub release`);
  } else {
    requireField(/npm publish[^\n]*--dry-run/.test(workflow), `${label} must dry-run npm publication`);
  }
}

requireField(packageJson.repository, 'package.json must declare repository metadata');
requireField(Array.isArray(packageJson.files) && packageJson.files.length > 0, 'package.json must declare a non-empty files allowlist');
requireField(scripts['package:smoke'], 'package.json scripts must include package:smoke');
requireField(scripts['release:check'], 'package.json scripts must include release:check');

const workflowDir = path.join(root, '.github', 'workflows');
if (fs.existsSync(workflowDir)) {
  const workflowFiles = fs.readdirSync(workflowDir).filter((file) => /\.ya?ml$/.test(file));
  requireField(workflowFiles.length > 0, 'repository must include at least one workflow file');

  for (const file of workflowFiles) {
    const workflow = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    requireField(!/TODO|FIXME|template becomes an app|customization TODO/i.test(workflow), `.github/workflows/${file} still contains placeholder text`);
  }

  const combined = workflowFiles.map((file) => fs.readFileSync(path.join(workflowDir, file), 'utf8')).join('\n');
  requireField(/release:check/.test(combined), 'CI workflows must run npm run release:check');

  const releasePath = path.join(workflowDir, 'release.yml');
  const dryRunPath = path.join(workflowDir, 'release-dry-run.yml');
  requireField(fs.existsSync(releasePath), '.github/workflows/release.yml must exist');
  requireField(fs.existsSync(dryRunPath), '.github/workflows/release-dry-run.yml must exist');
  if (fs.existsSync(releasePath)) validateArtifactFlow('release.yml', fs.readFileSync(releasePath, 'utf8'), { githubRelease: true });
  if (fs.existsSync(dryRunPath)) validateArtifactFlow('release-dry-run.yml', fs.readFileSync(dryRunPath, 'utf8'));
}

if (failures.length > 0) {
  console.error('Release readiness validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Release readiness validation passed.');
