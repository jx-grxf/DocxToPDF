import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { accent, muted } from "./ansi.js";

export async function askText(question: string, defaultValue: string): Promise<string> {
  const readline = createInterface({ input, output });
  const answer = await readline.question(`${accent("?")} ${question} ${muted(`(${defaultValue})`)} `);
  readline.close();
  return answer.trim() || defaultValue;
}

export async function askBoolean(question: string, defaultValue = false): Promise<boolean> {
  const defaultLabel = defaultValue ? "Y/n" : "y/N";
  const readline = createInterface({ input, output });
  const answer = await readline.question(`${accent("?")} ${question} ${muted(`(${defaultLabel})`)} `);
  readline.close();

  if (!answer.trim()) {
    return defaultValue;
  }

  return ["y", "yes", "j", "ja"].includes(answer.trim().toLowerCase());
}
