import { existsSync } from "node:fs";
import { mkdir, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commandExists, runCommand } from "./process.js";
import type { ConversionJob, ConversionOptions, ConversionResult } from "./types.js";

const WORD_APP_PATH = "/Applications/Microsoft Word.app";
const WORD_TIMEOUT_MS = 120_000;
const OCR_TIMEOUT_MS = 600_000;

const WORD_EXPORT_SCRIPT = `
on run argv
    set sourcePath to item 1 of argv
    set targetPath to item 2 of argv
    set sourceAlias to POSIX file sourcePath as alias

    tell application "Microsoft Word"
        launch
        set visible to false
        set openedDocument to open sourceAlias
        save as openedDocument file name targetPath file format format PDF
        close openedDocument saving no
    end tell
end run
`;

export async function assertRuntime(options: Pick<ConversionOptions, "ocr">): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("Dieses Tool braucht macOS, weil Microsoft Word per AppleScript gesteuert wird.");
  }
  if (!existsSync(WORD_APP_PATH)) {
    throw new Error("Microsoft Word wurde nicht unter /Applications/Microsoft Word.app gefunden.");
  }
  if (!(await commandExists("osascript"))) {
    throw new Error("osascript fehlt. Ohne macOS Automation kann Word nicht gesteuert werden.");
  }
  if (options.ocr && !(await commandExists("ocrmypdf"))) {
    throw new Error("OCR ist aktiviert, aber ocrmypdf ist nicht installiert.");
  }
}

export async function convertJob(job: ConversionJob, options: ConversionOptions): Promise<ConversionResult> {
  try {
    await mkdir(dirname(job.targetPath), { recursive: true });
    await exportWithWord(job.source.path, job.targetPath);

    if (options.ocr) {
      await addOcrLayer(job.targetPath);
    }

    return { job, ok: true, message: "Fertig" };
  } catch (cause) {
    return {
      job,
      ok: false,
      message: cause instanceof Error ? cause.message : String(cause)
    };
  }
}

async function exportWithWord(sourcePath: string, targetPath: string): Promise<void> {
  const result = await runCommand("osascript", ["-e", WORD_EXPORT_SCRIPT, sourcePath, targetPath], WORD_TIMEOUT_MS);
  if (result.code !== 0) {
    throw new Error((result.stderr || result.stdout || "Word Export fehlgeschlagen.").trim());
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
    throw new Error((result.stderr || result.stdout || "OCR fehlgeschlagen.").trim());
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
