import { existsSync } from "node:fs";
import { mkdir, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commandExists, runCommand } from "./process.js";
import type { ConversionJob, ConversionOptions, ConversionResult } from "./types.js";

const WORD_APP_PATH = "/Applications/Microsoft Word.app";
const WORD_TIMEOUT_MS = 120_000;
/** Extra time per file in batch mode (one Word process, no repeated launch). */
const WORD_BATCH_PER_FILE_MS = 45_000;
const OCR_TIMEOUT_MS = 600_000;

const WORD_EXPORT_SCRIPT = `
on run argv
    set sourcePath to item 1 of argv
    set targetPath to item 2 of argv

    tell application "Microsoft Word"
        launch
        set display alerts to alerts none
        try
            set visible to false
            open POSIX file sourcePath
            delay 0.15
            set docRef to active document
            save as docRef file name (POSIX file targetPath) file format format PDF
            close docRef saving no
        on error errMsg number errNum
            try
                set display alerts to alerts all
            end try
            error errMsg number errNum
        end try
        set display alerts to alerts all
    end tell
end run
`;

const WORD_BATCH_EXPORT_SCRIPT = `
on run argv
    set argCount to count argv
    if argCount < 2 then error "At least one source and target pair is required."
    if (argCount mod 2) is not 0 then error "Expected an even number of path arguments (source, target, …)."

    tell application "Microsoft Word"
        launch
        set display alerts to alerts none
        try
            set visible to false
            repeat with pairIndex from 1 to argCount by 2
                set sourcePath to item pairIndex of argv
                set targetPath to item (pairIndex + 1) of argv
                open POSIX file sourcePath
                delay 0.15
                set docRef to active document
                save as docRef file name (POSIX file targetPath) file format format PDF
                close docRef saving no
            end repeat
        on error errMsg number errNum
            try
                set display alerts to alerts all
            end try
            error errMsg number errNum
        end try
        set display alerts to alerts all
    end tell
end run
`;

export async function assertRuntime(options: Pick<ConversionOptions, "ocr">): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("This tool requires macOS because Microsoft Word is driven via AppleScript.");
  }
  if (!existsSync(WORD_APP_PATH)) {
    throw new Error("Microsoft Word was not found at /Applications/Microsoft Word.app.");
  }
  if (!(await commandExists("osascript"))) {
    throw new Error("osascript is missing. Word cannot be automated without macOS Automation.");
  }
  if (options.ocr && !(await commandExists("ocrmypdf"))) {
    throw new Error("OCR is enabled but ocrmypdf is not installed.");
  }
}

export async function convertJob(job: ConversionJob, options: ConversionOptions): Promise<ConversionResult> {
  try {
    await mkdir(dirname(job.targetPath), { recursive: true });
    await exportWithWord(job.source.path, job.targetPath);

    if (options.ocr) {
      await addOcrLayer(job.targetPath);
    }

    return { job, ok: true, message: "Done" };
  } catch (cause) {
    return {
      job,
      ok: false,
      message: cause instanceof Error ? cause.message : String(cause)
    };
  }
}

/**
 * Converts all jobs in one Word session (one launch, one script loop).
 * On failure, callers can fall back to per-file conversion.
 */
export async function convertJobs(jobs: readonly ConversionJob[], options: ConversionOptions): Promise<ConversionResult[]> {
  if (jobs.length === 0) {
    return [];
  }

  for (const job of jobs) {
    await mkdir(dirname(job.targetPath), { recursive: true });
  }

  let bulkWordOk = false;
  try {
    const batchTimeout = Math.min(
      3_600_000,
      Math.max(WORD_TIMEOUT_MS, jobs.length * WORD_BATCH_PER_FILE_MS)
    );
    await exportBatchWithWord(jobs, batchTimeout);
    bulkWordOk = true;
  } catch {
    bulkWordOk = false;
  }

  if (bulkWordOk) {
    const results: ConversionResult[] = [];
    for (const job of jobs) {
      try {
        if (options.ocr) {
          await addOcrLayer(job.targetPath);
        }
        results.push({ job, ok: true, message: "Done" });
      } catch (cause) {
        results.push({
          job,
          ok: false,
          message: cause instanceof Error ? cause.message : String(cause)
        });
      }
    }
    return results;
  }

  const results: ConversionResult[] = [];
  for (const job of jobs) {
    results.push(await convertJob(job, options));
  }
  return results;
}

async function exportWithWord(sourcePath: string, targetPath: string): Promise<void> {
  const result = await runCommand("osascript", ["-e", WORD_EXPORT_SCRIPT, sourcePath, targetPath], WORD_TIMEOUT_MS);
  if (result.code !== 0) {
    throw new Error((result.stderr || result.stdout || "Word export failed.").trim());
  }
}

async function exportBatchWithWord(jobs: readonly ConversionJob[], timeoutMs: number): Promise<void> {
  const args = jobs.flatMap((job) => [job.source.path, job.targetPath]);
  const result = await runCommand("osascript", ["-e", WORD_BATCH_EXPORT_SCRIPT, ...args], timeoutMs);
  if (result.code !== 0) {
    throw new Error((result.stderr || result.stdout || "Word batch export failed.").trim());
  }
}

async function addOcrLayer(pdfPath: string): Promise<void> {
  const languages = await getOcrLanguages();
  const temporaryPath = join(tmpdir(), `docx-word-pdf-${process.pid}-${Date.now()}.pdf`);
  const result = await runCommand(
    "ocrmypdf",
    ["--skip-text", "--optimize", "1", "--quiet", "-l", languages, pdfPath, temporaryPath],
    OCR_TIMEOUT_MS
  );

  if (result.code !== 0) {
    await unlink(temporaryPath).catch(() => undefined);
    throw new Error((result.stderr || result.stdout || "OCR failed.").trim());
  }

  await rename(temporaryPath, pdfPath);
}

async function getOcrLanguages(): Promise<string> {
  if (!(await commandExists("tesseract"))) {
    return "eng";
  }

  const result = await runCommand("tesseract", ["--list-langs"], 20_000);
  const installedLanguages = new Set(result.stdout.split(/\s+/));
  const preferredLanguages = ["deu", "eng"].filter((language) => installedLanguages.has(language));
  return preferredLanguages.length > 0 ? preferredLanguages.join("+") : "eng";
}
