/**
 * Agent note:
 * This is a reusable loading-ball snippet for terminal UIs that use the TUI theme.
 * Keep it as a presentational utility and wire app-specific loading logic outside.
 *
 * Example:
 * const loader = createTuiLoadingBall("Suche nach Geraeten...");
 * loader.start();
 * await doWork();
 * loader.stop("Fertig");
 */

import { TUI_THEME } from "./tui-theme.js";

const LOADING_BALL_FRAMES = ["◐", "◓", "◑", "◒"] as const;

function colorize(hex: string, value: string): string {
  if (!process.stdout.isTTY || process.env.NO_COLOR) {
    return value;
  }

  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `\u001b[38;2;${r};${g};${b}m${value}\u001b[0m`;
}

function clearLine(): void {
  process.stdout.write("\r\u001b[2K");
}

export function createTuiLoadingBall(label = "Laedt...", intervalMs = 90) {
  let frameIndex = 0;
  let timer: NodeJS.Timeout | undefined;

  const render = (text: string) => {
    const ball = colorize(TUI_THEME.palette.accent, LOADING_BALL_FRAMES[frameIndex]!);
    const message = colorize(TUI_THEME.palette.muted, text);
    clearLine();
    process.stdout.write(`${ball} ${message}`);
    frameIndex = (frameIndex + 1) % LOADING_BALL_FRAMES.length;
  };

  return {
    start(nextLabel = label) {
      if (timer) {
        return;
      }

      frameIndex = 0;
      render(nextLabel);
      timer = setInterval(() => render(nextLabel), intervalMs);
    },
    stop(doneText?: string) {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }

      clearLine();

      if (doneText) {
        const doneBall = colorize(TUI_THEME.palette.success, "●");
        process.stdout.write(`${doneBall} ${doneText}\n`);
      }
    },
    fail(errorText: string) {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }

      clearLine();
      const failedBall = colorize(TUI_THEME.palette.error, "●");
      process.stdout.write(`${failedBall} ${errorText}\n`);
    }
  };
}
