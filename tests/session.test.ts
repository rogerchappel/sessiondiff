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

test("treats zero-result failure summaries as passing evidence", () => {
  const summary = summarizeSession([
    "Tests: 10 passed, 0 failed",
    "Build completed with 0 errors",
    "Suites: failures: 0, passed: 4"
  ].join("\n"));

  assert.deepEqual(summary.tests.map(({ status }) => status), ["pass", "pass", "pass"]);
});

test("does not regress when a passing summary adds a zero failure count", () => {
  const diff = compareSessions("Tests: 10 passed", "Tests: 10 passed, 0 failed");

  assert.notEqual(diff.verdict.status, "regressed");
  assert.equal(diff.after.tests[0]?.status, "pass");
});

test("keeps nonzero and explicit failures ahead of passing evidence", () => {
  const summary = summarizeSession([
    "Tests: 10 passed, 1 failed",
    "Tests passed, but lint failed",
    "Build: 0 errors; integration test failure"
  ].join("\n"));

  assert.deepEqual(summary.tests.map(({ status }) => status), ["fail", "fail", "fail"]);
});

test("recognizes numeric passing and failing summaries in plain text", () => {
  const summary = summarizeSession([
    "1 failing",
    "10 passing, 1 failing",
    "10 passing, 0 failing"
  ].join("\n"));

  assert.deepEqual(summary.tests.map(({ status }) => status), ["fail", "fail", "pass"]);
});

test("recognizes numeric passing and failing summaries in nested JSONL strings", () => {
  const summary = summarizeSession(JSON.stringify({
    result: { reports: ["24 passing", { output: "24 passing, failing: 0" }, "2 failing, 24 passing"] }
  }));

  assert.deepEqual(summary.tests.map(({ status }) => status), ["pass", "pass", "fail"]);
});

test("treats a new nonzero failing count as a regression", () => {
  const diff = compareSessions("10 passing, 0 failing", "10 passing, 1 failing");

  assert.equal(diff.verdict.status, "regressed");
  assert.deepEqual(diff.verdict.reasons, [
    "more failing checks (0 -> 1)",
    "fewer passing checks (1 -> 0)"
  ]);
});

test("treats clearing a numeric failing count as an improvement", () => {
  const diff = compareSessions("10 passing, 1 failing", "10 passing, 0 failing");

  assert.equal(diff.verdict.status, "improved");
  assert.deepEqual(diff.verdict.reasons, [
    "fewer failing checks (1 -> 0)",
    "more passing checks (0 -> 1)"
  ]);
});

test("treats losing a passing check as a regression", () => {
  const diff = compareSessions("Tests passed", "Tests pending");

  assert.equal(diff.verdict.status, "regressed");
  assert.deepEqual(diff.verdict.reasons, ["fewer passing checks (1 -> 0)"]);
});

test("preserves failure and blocker regression precedence over improvements", () => {
  const diff = compareSessions("Tests failed", "Tests passed\nBlocked: missing input");

  assert.equal(diff.verdict.status, "regressed");
  assert.deepEqual(diff.verdict.reasons, [
    "fewer failing checks (1 -> 0)",
    "more passing checks (0 -> 1)",
    "more blockers (0 -> 1)"
  ]);
});

test("reports signal-only inventory changes instead of unchanged", () => {
  const diff = compareSessions("No signal", "Approval required");

  assert.equal(diff.verdict.status, "changed");
  assert.deepEqual(diff.verdict.reasons, ["inventory changed without a clear pass/fail signal"]);
});

test("reports equal-cardinality command substitutions instead of unchanged", () => {
  const diff = compareSessions("$ npm test", "$ npm run build");

  assert.equal(diff.verdict.status, "changed");
  assert.deepEqual(diff.verdict.reasons, ["inventory changed without a clear pass/fail signal"]);
  assert.deepEqual(diff.changes.commands.added.map(({ command }) => command), ["npm run build"]);
  assert.deepEqual(diff.changes.commands.removed.map(({ command }) => command), ["npm test"]);
});

test("reports equal-cardinality file substitutions instead of unchanged", () => {
  const diff = compareSessions("changed src/a.ts", "changed src/b.ts");

  assert.equal(diff.verdict.status, "changed");
  assert.deepEqual(diff.changes.files.added, ["src/b.ts"]);
  assert.deepEqual(diff.changes.files.removed, ["src/a.ts"]);
});

test("reports equal-cardinality commit substitutions instead of unchanged", () => {
  const diff = compareSessions("commit abcdef1", "commit bcdefa2");

  assert.equal(diff.verdict.status, "changed");
  assert.deepEqual(diff.changes.commits.added, ["bcdefa2"]);
  assert.deepEqual(diff.changes.commits.removed, ["abcdef1"]);
});

test("keeps identical keyed inventories unchanged", () => {
  const diff = compareSessions("$ npm test\nchanged src/a.ts", "$ npm test\nchanged src/a.ts");

  assert.equal(diff.verdict.status, "unchanged");
  assert.deepEqual(diff.verdict.reasons, []);
});
