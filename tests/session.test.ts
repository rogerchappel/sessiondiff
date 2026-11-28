import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compareSessions, summarizeSession } from "../src/index.js";

const fixture = (name: string) => readFile(`tests/fixtures/${name}`, "utf8");

test("summarizes mixed plain text, JSONL, and tool-block evidence", async () => {
  const text = await fixture("tool-blocks.log");
  const summary = summarizeSession(text, "tool-blocks.log");

  assert.equal(summary.source, "tool-blocks.log");
  assert.equal(summary.stats.toolBlocks, 1);
  assert.ok(summary.commands.some(({ command }) => command === "npm run build"));
});

test("summarizes JSONL fixture commands and test outcomes", async () => {
  const summary = summarizeSession(await fixture("after.jsonl"));

  assert.equal(summary.stats.jsonlRecords, 2);
  assert.ok(summary.commands.some(({ command, source }) => command === "npm run smoke" && source === "jsonl"));
  assert.ok(summary.tests.some(({ status }) => status === "pass"));
});

test("compares sessions and classifies improved and regressed verification", async () => {
  const before = await fixture("before.log");
  const improved = await fixture("after.jsonl");
  const regressed = await fixture("regressed.log");

  const improvement = compareSessions(before, improved, "before", "after");
  assert.equal(improvement.before.source, "before");
  assert.equal(improvement.after.source, "after");
  assert.equal(improvement.verdict.status, "improved");
  assert.ok(improvement.changes.commands.added.some(({ command }) => command === "npm run smoke"));
  assert.ok(improvement.changes.tests.added.some(({ status }) => status === "pass"));

  const regression = compareSessions(before, regressed);
  assert.equal(regression.verdict.status, "regressed");
  assert.ok(regression.changes.tests.added.some(({ status }) => status === "fail"));
  assert.ok(regression.changes.blockers.added.some(({ text }) => text.includes("missing API token")));
});

test("deduplicates repeated evidence in summaries", () => {
  const summary = summarizeSession("$ npm test\n$ npm test\nTest passed\nTest passed");

  assert.equal(summary.commands.length, 1);
  assert.equal(summary.commands[0]?.command, "npm test");
  assert.equal(summary.tests.length, 2);
});
