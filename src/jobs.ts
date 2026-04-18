import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, parse } from "node:path";
import type { ConversionJob, DocxFile } from "./types.js";

export async function buildConversionJobs(
  selectedFiles: readonly DocxFile[],
  outputDirectory: string,
  overwrite: boolean
): Promise<ConversionJob[]> {
  await mkdir(outputDirectory, { recursive: true });
  const usedTargets = new Set<string>();

  return selectedFiles.map((source) => {
    const targetPath = createTargetPath(source, outputDirectory, overwrite, usedTargets);
    usedTargets.add(targetPath);
    return { source, targetPath };
  });
}

export function createTargetPath(
  source: Pick<DocxFile, "name">,
  outputDirectory: string,
  overwrite: boolean,
  usedTargets = new Set<string>()
): string {
  const parsedName = parse(source.name);
  const baseName = parsedName.name || basename(source.name, ".docx");
  let candidate = join(outputDirectory, `${baseName}.pdf`);

  if (overwrite) {
    return candidate;
  }

  let suffix = 2;
  while (usedTargets.has(candidate) || existsSync(candidate)) {
    candidate = join(outputDirectory, `${baseName}-${suffix}.pdf`);
    suffix += 1;
  }
  return candidate;
}
