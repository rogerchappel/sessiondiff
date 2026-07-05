export type OutputFormat = "markdown" | "json";

export interface SessionSummary {
  source: string;
  stats: SummaryStats;
  commands: ExtractedCommand[];
  files: string[];
  commits: string[];
  tests: TestResult[];
  approvals: SessionSignal[];
  blockers: SessionSignal[];
  finalClaims: string[];
}

export interface SummaryStats {
  lines: number;
  jsonlRecords: number;
  toolBlocks: number;
}

export interface ExtractedCommand {
  command: string;
  source: "shell" | "tool" | "jsonl";
  line: number;
}

export interface TestResult {
  text: string;
  status: "pass" | "fail" | "unknown";
  line: number;
}

export interface SessionSignal {
  text: string;
  line: number;
}

export interface SessionDiff {
  before: SessionSummary;
  after: SessionSummary;
  changes: {
    commands: ValueDiff<ExtractedCommand>;
    files: ValueDiff<string>;
    commits: ValueDiff<string>;
    tests: ValueDiff<TestResult>;
    approvals: ValueDiff<SessionSignal>;
    blockers: ValueDiff<SessionSignal>;
    finalClaims: ValueDiff<string>;
  };
  verdict: DiffVerdict;
}

export interface ValueDiff<T> {
  added: T[];
  removed: T[];
  unchanged: T[];
}

export interface DiffVerdict {
  status: "improved" | "regressed" | "changed" | "unchanged";
  reasons: string[];
}

export { compareSessions, summarizeSession } from "./session.js";
export { renderCompareJson, renderCompareMarkdown, renderSummaryJson, renderSummaryMarkdown } from "./render.js";
