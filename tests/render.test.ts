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
