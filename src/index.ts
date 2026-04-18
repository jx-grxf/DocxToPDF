#!/usr/bin/env node

import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { accent, clearScreen, drawBox, error, muted, success, warn } from "./ansi.js";
import { assertRuntime, convertJobs } from "./converter.js";
import { buildConversionJobs } from "./jobs.js";
import { askBoolean, askText } from "./prompt.js";
import { searchDocxFiles } from "./search.js";
import { selectDocxFiles } from "./selector.js";
import { createTuiLoadingBall } from "./tui-loading-ball-snippet.js";
import type { ConversionOptions } from "./types.js";

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  clearScreen();
  process.stdout.write(`${drawBox("Docx Word PDF", "Calm TUI. System-wide DOCX search. Word as the PDF engine.")}\n\n`);

  await assertRuntime({ ocr: false });

  const searchLoader = createTuiLoadingBall("Searching the system for DOCX files…");
  searchLoader.start();
  const files = await searchDocxFiles();
  searchLoader.stop(`${files.length} DOCX file(s) found`);

  if (files.length === 0) {
    process.stdout.write(`${warn("No DOCX files found.")}\n`);
    return;
  }

  const selectedFiles = await selectDocxFiles(files);
  if (selectedFiles.length === 0) {
    process.stdout.write(`${warn("No files selected.")}\n`);
    return;
  }

  process.stdout.write(`${drawBox("Prepare export", `${selectedFiles.length} document(s) selected`)}\n\n`);
  const outputDirectory = resolve(
    expandHome(await askText("Output folder", join(homedir(), "Desktop", "Docx Word PDF")))
  );
  const ocr = await askBoolean("Add OCR after Word export", false);
  const overwrite = await askBoolean("Overwrite existing PDFs", false);
  const options: ConversionOptions = { outputDirectory, overwrite, ocr };

  await assertRuntime(options);
  const jobs = await buildConversionJobs(selectedFiles, outputDirectory, overwrite);

  process.stdout.write(
    `\n${muted("Word exports to PDF in one session (faster for many files; dialogs are suppressed where possible).")}\n`
  );
  const batchLoader = createTuiLoadingBall(`${jobs.length} document(s): Word export…`);
  batchLoader.start();
  const results = await convertJobs(jobs, options);
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    batchLoader.stop(`${jobs.length} PDF(s) created`);
  } else {
    batchLoader.fail(`${failed.length} of ${jobs.length} failed`);
  }

  process.stdout.write("\n");
  if (failed.length === 0) {
    process.stdout.write(`${success("All PDFs were created.")}\n`);
    process.stdout.write(`${muted(outputDirectory)}\n`);
    return;
  }

  process.stdout.write(`${error(`${failed.length} file(s) failed.`)}\n`);
  for (const failure of failed) {
    process.stdout.write(`${error("●")} ${failure.job.source.name}: ${failure.message}\n`);
  }
  process.stdout.write(
    `${muted("If Word hangs: open Word once, then allow Automation and file access for your terminal in System Settings.")}\n`
  );
}

function printHelp(): void {
  process.stdout.write(`${drawBox("Docx Word PDF", "System-wide DOCX search and PDF export with Microsoft Word.")}\n\n`);
  process.stdout.write(`${accent("Run:")} npm run dev\n`);
  process.stdout.write(`${muted("Keys: ↑/↓, Space, type to filter, ⌃A all visible, ⌃N none, Enter, q")}\n`);
}

function expandHome(value: string): string {
  if (value === "~") {
    return homedir();
  }
  if (value.startsWith("~/")) {
    return join(homedir(), value.slice(2));
  }
  return value;
}

main().catch((cause) => {
  process.stdout.write(`\n${error(cause instanceof Error ? cause.message : String(cause))}\n`);
  process.exitCode = 1;
});
