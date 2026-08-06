import test from "node:test";
import assert from "node:assert/strict";
import { compareSessions, summarizeSession } from "../src/session.js";
import { renderCompareJson, renderCompareMarkdown, renderSummaryJson, renderSummaryMarkdown } from "../src/render.js";

test("renders summarized session output as JSON and markdown", () => {
  const summary = summarizeSession("$ npm test\nok build passed", "run.log");
  assert.equal(JSON.parse(renderSummaryJson(summary)).source, "run.log");
  assert.match(renderSummaryMarkdown(summary), /Session Summary: run\.log/);
  assert.match(renderSummaryMarkdown(summary), /npm test/);
});

test("summarizes approvals and blockers", () => {
  const summary = summarizeSession("Asked for approval before deploy\nBlocked: missing token\n", "run.log");

  assert.equal(summary.approvals.length, 1);
  assert.equal(summary.blockers.length, 1);
  assert.match(renderSummaryMarkdown(summary), /## Approvals/);
  assert.match(renderSummaryMarkdown(summary), /## Blockers/);
});

test("renders changed verdicts alongside equal-cardinality substitutions", () => {
  const diff = compareSessions("$ npm test", "$ npm run build");
  const json = JSON.parse(renderCompareJson(diff)) as {
    verdict: { status: string };
    changes: { commands: { added: Array<{ command: string }>; removed: Array<{ command: string }> } };
  };
  const markdown = renderCompareMarkdown(diff);

  assert.equal(json.verdict.status, "changed");
  assert.deepEqual(json.changes.commands.added.map(({ command }) => command), ["npm run build"]);
  assert.deepEqual(json.changes.commands.removed.map(({ command }) => command), ["npm test"]);
  assert.match(markdown, /- Status: changed/);
  assert.match(markdown, /- Added: npm run build/);
  assert.match(markdown, /- Removed: npm test/);
});
