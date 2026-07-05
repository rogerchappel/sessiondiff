import type { DiffVerdict, ExtractedCommand, SessionDiff, SessionSignal, SessionSummary, TestResult, ValueDiff } from "./index.js";

const commitPattern = /\b[0-9a-f]{7,40}\b/gi;
const pathPattern =
  /(?:(?:\.{1,2}|~)?\/)?(?:[\w@.-]+\/)+(?:[\w@.-]+)(?::\d+)?|\b[\w@.-]+\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|lock|sh|py|go|rs|java|rb|php|css|scss|html)\b/g;
const shellPromptPattern = /^\s*(?:[$>]|\+\s|(?:bash|zsh|sh)\s*[-$])\s*(.+)$/i;
const toolStartPattern = /^\s*(?:tool[_ -]?call|function[_ -]?call|<tool>|```(?:tool|json|sh|bash)?)[:\s]*(.*)$/i;
const toolEndPattern = /^\s*(?:<\/tool>|```)\s*$/;
const finalClaimPattern =
  /\b(?:final|summary|done|completed|implemented|fixed|changed|verification|verified|tests?|smoke|build)\b/i;
const testPattern =
  /\b(?:pass(?:ed|es)?|fail(?:ed|ure)?|error|ok|not ok|tests?|test suite|build|typecheck|lint|smoke|validated?|verification)\b/i;
const approvalPattern =
  /\b(?:approval|approved|permission|confirmed|consent|human\s+confirmed|asked\s+before|requires\s+approval)\b/i;
const blockerPattern =
  /\b(?:blocked|blocker|cannot\s+continue|stuck|needs\s+(?:user|human)|missing\s+(?:credential|token|file|input)|permission\s+denied)\b/i;
const commandFieldNames = new Set(["command", "cmd", "shell", "input", "args"]);

export function summarizeSession(text: string, source = "session"): SessionSummary {
  const lines = text.split(/\r?\n/);
  const summary: SessionSummary = {
    source,
    stats: {
      lines: text.length === 0 ? 0 : lines.length,
      jsonlRecords: 0,
      toolBlocks: 0
    },
    commands: [],
    files: [],
    commits: [],
    tests: [],
    approvals: [],
    blockers: [],
    finalClaims: []
  };

  const files = new Set<string>();
  const commits = new Set<string>();
  let inToolBlock = false;
  let toolBlockStart = 0;
  let toolBlockLines: string[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const jsonValue = parseJsonLine(line);
    if (jsonValue !== undefined) {
      summary.stats.jsonlRecords += 1;
      ingestJsonValue(jsonValue, lineNumber, summary, files, commits);
    }

    if (inToolBlock) {
      if (toolEndPattern.test(line)) {
        summary.stats.toolBlocks += 1;
        ingestToolBlock(toolBlockLines.join("\n"), toolBlockStart, summary, files, commits);
        inToolBlock = false;
        toolBlockLines = [];
      } else {
        toolBlockLines.push(line);
      }
    } else if (toolStartPattern.test(line)) {
      inToolBlock = true;
      toolBlockStart = lineNumber;
      const firstLine = line.replace(toolStartPattern, "$1").trim();
      toolBlockLines = firstLine ? [firstLine] : [];
    }

    ingestPlainLine(line, lineNumber, summary, files, commits);
  });

  if (inToolBlock) {
    summary.stats.toolBlocks += 1;
    ingestToolBlock(toolBlockLines.join("\n"), toolBlockStart, summary, files, commits);
  }

  summary.files = [...files].sort();
  summary.commits = [...commits].sort();
  summary.commands = dedupeCommands(summary.commands);
  summary.tests = dedupeBy(summary.tests, testKey);
  summary.approvals = dedupeBy(summary.approvals, signalKey);
  summary.blockers = dedupeBy(summary.blockers, signalKey);
  summary.finalClaims = unique(summary.finalClaims);

  return summary;
}

export function compareSessions(beforeText: string, afterText: string, beforeSource = "before", afterSource = "after"): SessionDiff {
  const before = summarizeSession(beforeText, beforeSource);
  const after = summarizeSession(afterText, afterSource);

  return {
    before,
    after,
    changes: {
      commands: diffBy(before.commands, after.commands, commandKey),
      files: diffBy(before.files, after.files, (value) => value),
      commits: diffBy(before.commits, after.commits, (value) => value),
      tests: diffBy(before.tests, after.tests, testKey),
      approvals: diffBy(before.approvals, after.approvals, signalKey),
      blockers: diffBy(before.blockers, after.blockers, signalKey),
      finalClaims: diffBy(before.finalClaims, after.finalClaims, (value) => value)
    },
    verdict: classifyDiff(before, after)
  };
}

function ingestPlainLine(
  line: string,
  lineNumber: number,
  summary: SessionSummary,
  files: Set<string>,
  commits: Set<string>
): void {
  const promptMatch = line.match(shellPromptPattern);
  if (promptMatch?.[1]) {
    addCommand(summary, promptMatch[1], "shell", lineNumber);
  }

  addMatches(line, pathPattern, files);
  addMatches(line, commitPattern, commits, (value) => value.toLowerCase());

  if (testPattern.test(line)) {
    summary.tests.push({
      text: compact(line),
      status: inferTestStatus(line),
      line: lineNumber
    });
  }

  if (approvalPattern.test(line)) {
    summary.approvals.push(toSignal(line, lineNumber));
  }

  if (blockerPattern.test(line)) {
    summary.blockers.push(toSignal(line, lineNumber));
  }

  if (finalClaimPattern.test(line) && line.trim().length > 0) {
    summary.finalClaims.push(compact(line));
  }
}

function ingestToolBlock(
  block: string,
  lineNumber: number,
  summary: SessionSummary,
  files: Set<string>,
  commits: Set<string>
): void {
  const jsonValue = parseJsonLine(block);
  if (jsonValue !== undefined) {
    ingestJsonValue(jsonValue, lineNumber, summary, files, commits);
    return;
  }

  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (/^(?:cmd|command|shell|input)\s*[:=]/i.test(trimmed)) {
      addCommand(summary, trimmed.replace(/^(?:cmd|command|shell|input)\s*[:=]\s*/i, ""), "tool", lineNumber);
    }
    addMatches(trimmed, pathPattern, files);
    addMatches(trimmed, commitPattern, commits, (value) => value.toLowerCase());
  }
}

function ingestJsonValue(
  value: unknown,
  lineNumber: number,
  summary: SessionSummary,
  files: Set<string>,
  commits: Set<string>
): void {
  if (typeof value === "string") {
    ingestPlainLine(value, lineNumber, summary, files, commits);
    return;
  }
  if (!isRecord(value)) {
    return;
  }

  for (const [key, raw] of Object.entries(value)) {
    const lowerKey = key.toLowerCase();
    if (commandFieldNames.has(lowerKey)) {
      const command = extractCommandValue(raw);
      if (command) {
        addCommand(summary, command, "jsonl", lineNumber);
      }
    }

    if (typeof raw === "string") {
      addMatches(raw, pathPattern, files);
      addMatches(raw, commitPattern, commits, (commit) => commit.toLowerCase());
      if (testPattern.test(raw)) {
        summary.tests.push({ text: compact(raw), status: inferTestStatus(raw), line: lineNumber });
      }
      if (approvalPattern.test(raw)) {
        summary.approvals.push(toSignal(raw, lineNumber));
      }
      if (blockerPattern.test(raw)) {
        summary.blockers.push(toSignal(raw, lineNumber));
      }
      if (finalClaimPattern.test(raw)) {
        summary.finalClaims.push(compact(raw));
      }
    } else if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === "string") {
          addMatches(item, pathPattern, files);
          addMatches(item, commitPattern, commits, (commit) => commit.toLowerCase());
        }
      }
    } else if (isRecord(raw)) {
      ingestJsonValue(raw, lineNumber, summary, files, commits);
    }
  }
}

function parseJsonLine(line: string): unknown {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

function extractCommandValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter((part): part is string => typeof part === "string").join(" ");
  }
  if (isRecord(value)) {
    for (const key of commandFieldNames) {
      const nested = value[key];
      if (typeof nested === "string") {
        return nested;
      }
    }
  }
  return undefined;
}

function addCommand(summary: SessionSummary, command: string, source: ExtractedCommand["source"], line: number): void {
  const cleaned = compact(command.replace(/^["']|["']$/g, ""));
  if (cleaned.length > 0) {
    summary.commands.push({ command: cleaned, source, line });
  }
}

function addMatches(
  text: string,
  pattern: RegExp,
  values: Set<string>,
  transform: (value: string) => string = (value) => value
): void {
  for (const match of text.matchAll(pattern)) {
    const value = transform(match[0].replace(/[),.;\]]+$/g, ""));
    if (value.length > 1 && !value.startsWith("http")) {
      values.add(value);
    }
  }
}

function inferTestStatus(text: string): TestResult["status"] {
  const normalized = text.toLowerCase();
  if (/\b(?:fail|failed|failure|error|not ok)\b/.test(normalized)) {
    return "fail";
  }
  if (/\b(?:pass|passed|passes|ok|success|validated|verified)\b/.test(normalized)) {
    return "pass";
  }
  return "unknown";
}

function classifyDiff(before: SessionSummary, after: SessionSummary): DiffVerdict {
  const reasons: string[] = [];
  const beforeFailed = before.tests.filter((test) => test.status === "fail").length;
  const afterFailed = after.tests.filter((test) => test.status === "fail").length;
  const beforePassed = before.tests.filter((test) => test.status === "pass").length;
  const afterPassed = after.tests.filter((test) => test.status === "pass").length;

  if (afterFailed > beforeFailed) {
    reasons.push(`more failing checks (${beforeFailed} -> ${afterFailed})`);
  }
  if (afterFailed < beforeFailed) {
    reasons.push(`fewer failing checks (${beforeFailed} -> ${afterFailed})`);
  }
  if (afterPassed > beforePassed) {
    reasons.push(`more passing checks (${beforePassed} -> ${afterPassed})`);
  }
  if (after.blockers.length > before.blockers.length) {
    reasons.push(`more blockers (${before.blockers.length} -> ${after.blockers.length})`);
  }
  if (after.blockers.length < before.blockers.length) {
    reasons.push(`fewer blockers (${before.blockers.length} -> ${after.blockers.length})`);
  }

  if (reasons.length === 0) {
    const changed =
      before.commands.length !== after.commands.length ||
      before.files.length !== after.files.length ||
      before.finalClaims.length !== after.finalClaims.length;
    return { status: changed ? "changed" : "unchanged", reasons: changed ? ["inventory changed without a clear pass/fail signal"] : [] };
  }

  if (afterFailed > beforeFailed || after.blockers.length > before.blockers.length) {
    return { status: "regressed", reasons };
  }
  if (afterFailed < beforeFailed || afterPassed > beforePassed || after.blockers.length < before.blockers.length) {
    return { status: "improved", reasons };
  }
  return { status: "changed", reasons };
}

function toSignal(text: string, line: number): SessionSignal {
  return { text: compact(text), line };
}

function compact(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function dedupeCommands(commands: ExtractedCommand[]): ExtractedCommand[] {
  return dedupeBy(commands, commandKey);
}

function dedupeBy<T>(values: T[], keyFor: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = keyFor(value);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function diffBy<T>(before: T[], after: T[], keyFor: (value: T) => string): ValueDiff<T> {
  const beforeKeys = new Set(before.map(keyFor));
  const afterKeys = new Set(after.map(keyFor));

  return {
    added: after.filter((value) => !beforeKeys.has(keyFor(value))),
    removed: before.filter((value) => !afterKeys.has(keyFor(value))),
    unchanged: after.filter((value) => beforeKeys.has(keyFor(value)))
  };
}

function commandKey(command: ExtractedCommand): string {
  return command.command;
}

function testKey(test: TestResult): string {
  return `${test.status}:${test.text}`;
}

function signalKey(signal: SessionSignal): string {
  return signal.text;
}
