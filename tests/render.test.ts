import test from "node:test";
import assert from "node:assert/strict";
import { summarizeSession } from "../src/session.js";
import { renderSummaryJson, renderSummaryMarkdown } from "../src/render.js";

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
