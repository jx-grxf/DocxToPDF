import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { runCommand } from "./process.js";
import type { DocxFile } from "./types.js";

const SPOTLIGHT_QUERY = 'kMDItemFSName == "*.docx"c';
const FALLBACK_SKIP_DIRECTORIES = new Set([
  ".git",
  "Library",
  "node_modules",
  "Applications",
  "System",
  "Volumes",
  "private",
  "dev",
  "Network"
]);

export async function searchDocxFiles(): Promise<DocxFile[]> {
  const spotlightResults = await searchWithSpotlight();
  if (spotlightResults.length > 0) {
    return spotlightResults;
  }

  return searchWithFilesystemFallback(homedir());
}

async function searchWithSpotlight(): Promise<DocxFile[]> {
  try {
    const result = await runCommand("mdfind", [SPOTLIGHT_QUERY], 90_000);
    if (result.code !== 0) {
      return [];
    }
    const paths = result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.toLowerCase().endsWith(".docx") && !basename(line).startsWith("~$"));
    return toDocxFiles(paths);
  } catch {
    return [];
  }
}

async function searchWithFilesystemFallback(root: string): Promise<DocxFile[]> {
  const found: string[] = [];
  await walk(root, found);
  return toDocxFiles(found);
}

async function walk(currentDirectory: string, found: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(currentDirectory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const nextPath = join(currentDirectory, entry.name);
    if (entry.isDirectory()) {
      if (!FALLBACK_SKIP_DIRECTORIES.has(entry.name)) {
        await walk(nextPath, found);
      }
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".docx") && !entry.name.startsWith("~$")) {
      found.push(nextPath);
    }
  }
}

async function toDocxFiles(paths: string[]): Promise<DocxFile[]> {
  const uniquePaths = [...new Set(paths)];
  const files: DocxFile[] = [];

  for (const path of uniquePaths) {
    try {
      const metadata = await stat(path);
      if (!metadata.isFile()) {
        continue;
      }
      files.push({
        path,
        name: basename(path),
        directory: dirname(path),
        modifiedAt: metadata.mtime,
        sizeBytes: metadata.size
      });
    } catch {
      // Spotlight can return stale paths. Ignore them.
    }
  }

  return files.sort((left, right) => right.modifiedAt.getTime() - left.modifiedAt.getTime());
}
