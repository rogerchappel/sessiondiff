import type { SessionDiff, SessionSummary } from "./index.js";

export function renderSummaryJson(summary: SessionSummary): string {
  return `${JSON.stringify(summary, null, 2)}\n`;
}

export function renderCompareJson(diff: SessionDiff): string {
  return `${JSON.stringify(diff, null, 2)}\n`;
}

export function renderSummaryMarkdown(summary: SessionSummary): string {
  return [
    `# Session Summary: ${summary.source}`,
    "",
    renderStats(summary),
    renderList("Commands", summary.commands.map((command) => `${command.command} (${command.source}:${command.line})`)),
    renderList("Files", summary.files),
    renderList("Commits", summary.commits),
    renderList("Tests and Checks", summary.tests.map((test) => `${test.status}: ${test.text} (line ${test.line})`)),
    renderList("Final Claims", summary.finalClaims),
    ""
  ].join("\n");
}

export function renderCompareMarkdown(diff: SessionDiff): string {
  return [
    `# Session Diff: ${diff.before.source} -> ${diff.after.source}`,
    "",
    "## Before",
    renderStats(diff.before),
    "",
    "## After",
    renderStats(diff.after),
    renderDiffList("Commands", diff.changes.commands.added.map((command) => command.command), diff.changes.commands.removed.map((command) => command.command)),
    renderDiffList("Files", diff.changes.files.added, diff.changes.files.removed),
    renderDiffList("Commits", diff.changes.commits.added, diff.changes.commits.removed),
    renderDiffList("Tests and Checks", diff.changes.tests.added.map((test) => `${test.status}: ${test.text}`), diff.changes.tests.removed.map((test) => `${test.status}: ${test.text}`)),
    renderDiffList("Final Claims", diff.changes.finalClaims.added, diff.changes.finalClaims.removed),
    ""
  ].join("\n");
}

function renderStats(summary: SessionSummary): string {
  return [
    "## Stats",
    "",
    `- Lines: ${summary.stats.lines}`,
    `- JSONL records: ${summary.stats.jsonlRecords}`,
    `- Tool blocks: ${summary.stats.toolBlocks}`
  ].join("\n");
}

function renderList(title: string, values: string[]): string {
  if (values.length === 0) {
    return `\n## ${title}\n\nNone found.`;
  }
  return `\n## ${title}\n\n${values.map((value) => `- ${value}`).join("\n")}`;
}

function renderDiffList(title: string, added: string[], removed: string[]): string {
  const lines = [`\n## ${title}`, ""];
  if (added.length === 0 && removed.length === 0) {
    lines.push("No changes found.");
    return lines.join("\n");
  }
  for (const value of added) {
    lines.push(`- Added: ${value}`);
  }
  for (const value of removed) {
    lines.push(`- Removed: ${value}`);
  }
  return lines.join("\n");
}
