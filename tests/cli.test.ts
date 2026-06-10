import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("prints CLI help", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "--help"]);

  assert.match(stdout, /sessiondiff compare <before\.log> <after\.log>/);
  assert.match(stdout, /sessiondiff summarize <run\.log>/);
});

test("summarizes a fixture session as JSON", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "summarize",
    "tests/fixtures/tool-blocks.log",
    "--format",
    "json"
  ]);
  const summary = JSON.parse(stdout) as {
    source: string;
    stats: { toolBlocks: number };
    commands: Array<{ command: string }>;
  };

  assert.equal(summary.source, "tool-blocks.log");
  assert.equal(summary.stats.toolBlocks, 1);
  assert.ok(summary.commands.some((command) => command.command === "npm run build"));
});

test("compares fixture sessions as markdown", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/src/cli.js",
    "compare",
    "tests/fixtures/before.log",
    "tests/fixtures/after.jsonl",
    "--format",
    "markdown"
  ]);

  assert.match(stdout, /Session Diff: before\.log -> after\.jsonl/);
  assert.match(stdout, /## Commands/);
});

test("fixture files remain available for smoke checks", async () => {
  const fixture = await readFile("tests/fixtures/before.log", "utf8");

  assert.match(fixture, /npm test/);
});
