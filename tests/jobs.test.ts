import { strict as assert } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createTargetPath } from "../src/jobs.js";

test("createTargetPath appends suffixes for duplicate names", () => {
  const usedTargets = new Set<string>();
  const first = createTargetPath({ name: "report.docx" }, "/tmp/output", false, usedTargets);
  usedTargets.add(first);
  const second = createTargetPath({ name: "report.docx" }, "/tmp/output", false, usedTargets);

  assert.equal(first, "/tmp/output/report.pdf");
  assert.equal(second, "/tmp/output/report-2.pdf");
});

test("createTargetPath returns the base target when overwrite is enabled", () => {
  const target = createTargetPath({ name: "invoice.docx" }, "/tmp/output", true, new Set(["/tmp/output/invoice.pdf"]));

  assert.equal(target, "/tmp/output/invoice.pdf");
});

test("createTargetPath skips existing files when overwrite is disabled", () => {
  const outputDirectory = join(tmpdir(), `docx-word-pdf-test-${process.pid}`);
  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "invoice.pdf"), "");

  const target = createTargetPath({ name: "invoice.docx" }, outputDirectory, false);

  assert.equal(target, join(outputDirectory, "invoice-2.pdf"));
  rmSync(outputDirectory, { recursive: true, force: true });
});
