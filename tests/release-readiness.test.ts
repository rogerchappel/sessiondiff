import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import test from "node:test";

const execFileAsync = promisify(execFile);
const validator = path.resolve("scripts/validate-release-readiness.mjs");

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "sessiondiff-release-"));
  await cp("package.json", path.join(root, "package.json"));
  await cp(".github", path.join(root, ".github"), { recursive: true });
  return root;
}

async function expectFailure(mutate: (root: string) => Promise<void>, expected: RegExp) {
  const root = await fixture();
  try {
    await mutate(root);
    await assert.rejects(execFileAsync(process.execPath, [validator], { cwd: root }), expected);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("release readiness accepts the captured single-artifact publication flow", async () => {
  const root = await fixture();
  try {
    const { stdout } = await execFileAsync(process.execPath, [validator], { cwd: root });
    assert.match(stdout, /passed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release readiness rejects omitted npm publication", async () => {
  await expectFailure(async (root) => {
    const file = path.join(root, ".github/workflows/release.yml");
    const workflow = await readFile(file, "utf8");
    await writeFile(file, workflow.replace(/^      - name: Publish package to npm\n        run: npm publish.*\n/m, ""));
  }, /must publish the captured archive/);
});

test("release readiness rejects repacking", async () => {
  await expectFailure(async (root) => {
    const file = path.join(root, ".github/workflows/release.yml");
    const workflow = await readFile(file, "utf8");
    await writeFile(file, workflow.replace("      - name: Generate release notes", "      - run: npm pack\n      - name: Generate release notes"));
  }, /must pack exactly once/);
});

test("release readiness rejects different npm and GitHub artifacts", async () => {
  await expectFailure(async (root) => {
    const file = path.join(root, ".github/workflows/release.yml");
    const workflow = await readFile(file, "utf8");
    await writeFile(file, workflow.replace('"${{ steps.package.outputs.archive }}"\n', '"other.tgz"\n'));
  }, /must attach the captured archive/);
});
