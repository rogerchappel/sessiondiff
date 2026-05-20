#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  compareSessions,
  renderCompareJson,
  renderCompareMarkdown,
  renderSummaryJson,
  renderSummaryMarkdown,
  summarizeSession,
  type OutputFormat
} from "./index.js";

interface ParsedArgs {
  command?: string;
  files: string[];
  format: OutputFormat;
}

async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  if (!args.command || args.command === "help" || args.command === "--help" || args.command === "-h") {
    process.stdout.write(helpText());
    return;
  }

  if (args.command === "summarize") {
    if (args.files.length !== 1) {
      throw new Error("summarize requires exactly one log path");
    }
    const [file] = args.files;
    const summary = summarizeSession(await readFile(file, "utf8"), basename(file));
    process.stdout.write(args.format === "json" ? renderSummaryJson(summary) : renderSummaryMarkdown(summary));
    return;
  }

  if (args.command === "compare") {
    if (args.files.length !== 2) {
      throw new Error("compare requires exactly two log paths");
    }
    const [beforeFile, afterFile] = args.files;
    const diff = compareSessions(
      await readFile(beforeFile, "utf8"),
      await readFile(afterFile, "utf8"),
      basename(beforeFile),
      basename(afterFile)
    );
    process.stdout.write(args.format === "json" ? renderCompareJson(diff) : renderCompareMarkdown(diff));
    return;
  }

  throw new Error(`unknown command: ${args.command}`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const files: string[] = [];
  let format: OutputFormat = "markdown";

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--format" || arg === "-f") {
      const value = rest[index + 1];
      if (value !== "markdown" && value !== "json") {
        throw new Error("--format must be markdown or json");
      }
      format = value;
      index += 1;
    } else if (arg.startsWith("--format=")) {
      const value = arg.slice("--format=".length);
      if (value !== "markdown" && value !== "json") {
        throw new Error("--format must be markdown or json");
      }
      format = value;
    } else {
      files.push(arg);
    }
  }

  return { command, files, format };
}

function helpText(): string {
  return `sessiondiff

Local-first comparison for coding-agent session logs.

Usage:
  sessiondiff compare <before.log> <after.log> [--format markdown|json]
  sessiondiff summarize <run.log> [--format markdown|json]

Formats:
  markdown  Human-readable output (default)
  json      Stable machine-readable output
`;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`sessiondiff: ${message}\n`);
  process.exitCode = 1;
});
