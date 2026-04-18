#!/usr/bin/env node

import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { accent, clearScreen, drawBox, error, muted, success, warn } from "./ansi.js";
import { assertRuntime, convertJob } from "./converter.js";
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
  process.stdout.write(`${drawBox("Docx Word PDF", "Ruhige TUI. Systemweite DOCX-Suche. Word als PDF-Engine.")}\n\n`);

  await assertRuntime({ ocr: false });

  const searchLoader = createTuiLoadingBall("Suche systemweit nach DOCX Dokumenten...");
  searchLoader.start();
  const files = await searchDocxFiles();
  searchLoader.stop(`${files.length} DOCX Dokumente gefunden`);

  if (files.length === 0) {
    process.stdout.write(`${warn("Keine DOCX Dateien gefunden.")}\n`);
    return;
  }

  const selectedFiles = await selectDocxFiles(files);
  if (selectedFiles.length === 0) {
    process.stdout.write(`${warn("Keine Dateien ausgewählt.")}\n`);
    return;
  }

  process.stdout.write(`${drawBox("Export vorbereiten", `${selectedFiles.length} Dokumente ausgewählt`)}\n\n`);
  const outputDirectory = resolve(
    expandHome(await askText("Output-Ordner", join(homedir(), "Desktop", "Docx Word PDF")))
  );
  const ocr = await askBoolean("OCR nach Word-Export hinzufügen", false);
  const overwrite = await askBoolean("Bestehende PDFs überschreiben", false);
  const options: ConversionOptions = { outputDirectory, overwrite, ocr };

  await assertRuntime(options);
  const jobs = await buildConversionJobs(selectedFiles, outputDirectory, overwrite);

  process.stdout.write(`\n${muted("Word rendert jetzt jedes Dokument nativ als PDF.")}\n`);
  const results = [];
  for (const [index, job] of jobs.entries()) {
    const loader = createTuiLoadingBall(`(${index + 1}/${jobs.length}) ${job.source.name}`);
    loader.start();
    const result = await convertJob(job, options);
    if (result.ok) {
      loader.stop(`${job.source.name} -> ${job.targetPath}`);
    } else {
      loader.fail(`${job.source.name}: ${result.message}`);
    }
    results.push(result);
  }

  const failed = results.filter((result) => !result.ok);
  process.stdout.write("\n");
  if (failed.length === 0) {
    process.stdout.write(`${success("Alle PDFs wurden erstellt.")}\n`);
    process.stdout.write(`${muted(outputDirectory)}\n`);
    return;
  }

  process.stdout.write(`${error(`${failed.length} Datei(en) fehlgeschlagen.`)}\n`);
  for (const failure of failed) {
    process.stdout.write(`${error("●")} ${failure.job.source.name}: ${failure.message}\n`);
  }
  process.stdout.write(
    `${muted("Falls Word hängt: Word einmal manuell öffnen und macOS Automation/File-Access erlauben.")}\n`
  );
}

function printHelp(): void {
  process.stdout.write(`${drawBox("Docx Word PDF", "Systemweite DOCX-Suche und PDF-Export mit Microsoft Word.")}\n\n`);
  process.stdout.write(`${accent("Start:")} npm run dev\n`);
  process.stdout.write(`${muted("Steuerung: ↑/↓, Space, /, a, n, Enter, q")}\n`);
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
