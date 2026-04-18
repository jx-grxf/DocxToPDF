import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { accent, error, muted } from "./ansi.js";

const AFFIRMATIVE = new Set(["y", "yes"]);
const NEGATIVE = new Set(["n", "no"]);

export async function askText(question: string, defaultValue: string): Promise<string> {
  const readline = createInterface({ input, output });
  const answer = await readline.question(`${accent("?")} ${question} ${muted(`(${defaultValue})`)} `);
  readline.close();
  return answer.trim() || defaultValue;
}

export async function askBoolean(question: string, defaultValue = false): Promise<boolean> {
  const defaultLabel = defaultValue ? "Y/n" : "y/N";
  const readline = createInterface({ input, output });
  try {
    for (;;) {
      const answer = await readline.question(`${accent("?")} ${question} ${muted(`(${defaultLabel})`)} `);
      const normalized = answer.trim().toLowerCase();

      if (!normalized) {
        return defaultValue;
      }
      if (AFFIRMATIVE.has(normalized)) {
        return true;
      }
      if (NEGATIVE.has(normalized)) {
        return false;
      }

      output.write(`${error("Invalid input. Enter y or n (or press Enter for the default in parentheses).")}\n`);
    }
  } finally {
    readline.close();
  }
}
