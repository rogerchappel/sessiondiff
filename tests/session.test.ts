import assert from "node:assert/strict";
import test from "node:test";

import { compareSessions, summarizeSession } from "../src/session.js";

test("ingests each JSONL record exactly once", () => {
  const summary = summarizeSession('{"message":"Tests failed with one blocker"}');

  assert.equal(summary.stats.jsonlRecords, 1);
  assert.deepEqual(summary.tests, [{ text: "Tests failed with one blocker", status: "fail", line: 1 }]);
  assert.deepEqual(summary.blockers, [{ text: "Tests failed with one blocker", line: 1 }]);
  assert.deepEqual(summary.finalClaims, ["Tests failed with one blocker"]);
});

test("recursively ingests evidence in nested JSONL arrays exactly once", () => {
  const summary = summarizeSession(JSON.stringify({
    events: [
      { command: "npm test", output: "Tests passed in src/session.ts at commit abc1234" },
      "Approved for release",
      [{ message: "Final result completed" }, { command: "npm test" }]
    ]
  }));

  assert.equal(summary.stats.jsonlRecords, 1);
  assert.deepEqual(summary.commands.map(({ command }) => command), ["npm test"]);
  assert.deepEqual(summary.tests, [
    { text: "npm test", status: "unknown", line: 1 },
    { text: "Tests passed in src/session.ts at commit abc1234", status: "pass", line: 1 }
  ]);
  assert.deepEqual(summary.files, ["src/session.ts"]);
  assert.deepEqual(summary.commits, ["abc1234"]);
  assert.deepEqual(summary.approvals, [{ text: "Approved for release", line: 1 }]);
  assert.deepEqual(summary.finalClaims, [
    "Final result completed",
    "Tests passed in src/session.ts at commit abc1234",
    "npm test"
  ]);
});

test("does not treat ordinary fenced prose or code as a tool block", () => {
  const prose = summarizeSession("```\nordinary prose\n```");
  const code = summarizeSession("```ts\nconst answer = 42;\n```");

  assert.equal(prose.stats.toolBlocks, 0);
  assert.equal(code.stats.toolBlocks, 0);
});

test("continues to parse explicit tool-call blocks", () => {
  const summary = summarizeSession("```tool\ncommand: npm run build\n```");

  assert.equal(summary.stats.toolBlocks, 1);
  assert.ok(summary.commands.some(({ command, source }) => command === "npm run build" && source === "tool"));
});

test("keeps mixed JSONL and explicit tool evidence stable in comparisons", () => {
  const before = '{"message":"Tests failed with one blocker"}';
  const after = '{"message":"Tests passed"}\n```tool\ncommand: npm test\n```';
  const diff = compareSessions(before, after);

  assert.equal(diff.before.tests.length, 1);
  assert.equal(diff.before.blockers.length, 1);
  assert.equal(diff.after.tests.length, 1);
  assert.equal(diff.after.blockers.length, 0);
  assert.equal(diff.after.stats.jsonlRecords, 1);
  assert.equal(diff.after.stats.toolBlocks, 1);
  assert.equal(diff.verdict.status, "improved");
  assert.deepEqual(diff.verdict.reasons, [
    "fewer failing checks (1 -> 0)",
    "more passing checks (0 -> 1)",
    "fewer blockers (1 -> 0)"
  ]);
});
