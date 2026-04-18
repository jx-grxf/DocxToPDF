import { TUI_THEME } from "./tui-theme.js";

export function colorize(hex: string, value: string): string {
  if (!process.stdout.isTTY || process.env.NO_COLOR) {
    return value;
  }

  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `\u001b[38;2;${red};${green};${blue}m${value}\u001b[0m`;
}

export function accent(value: string): string {
  return colorize(TUI_THEME.palette.accent, value);
}

export function success(value: string): string {
  return colorize(TUI_THEME.palette.success, value);
}

export function warn(value: string): string {
  return colorize(TUI_THEME.palette.warn, value);
}

export function error(value: string): string {
  return colorize(TUI_THEME.palette.error, value);
}

export function muted(value: string): string {
  return colorize(TUI_THEME.palette.muted, value);
}

export function clearScreen(): void {
  process.stdout.write("\u001b[2J\u001b[H");
}

export function hideCursor(): void {
  process.stdout.write("\u001b[?25l");
}

export function showCursor(): void {
  process.stdout.write("\u001b[?25h");
}

export function width(): number {
  const terminalWidth = process.stdout.columns || TUI_THEME.layout.minWidth;
  return Math.max(TUI_THEME.layout.minWidth, Math.min(TUI_THEME.layout.maxWidth, terminalWidth - 2));
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 1) {
    return "…";
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

export function drawBox(title: string, subtitle: string): string {
  const boxWidth = width();
  const innerWidth = boxWidth - 4;
  const line = TUI_THEME.frame.horizontal.repeat(boxWidth - 2);
  const titleLine = pad(truncate(title, innerWidth), innerWidth);
  const subtitleLine = pad(truncate(subtitle, innerWidth), innerWidth);

  return [
    `${TUI_THEME.frame.topLeft}${line}${TUI_THEME.frame.topRight}`,
    `${TUI_THEME.frame.vertical} ${accent(titleLine)} ${TUI_THEME.frame.vertical}`,
    `${TUI_THEME.frame.vertical} ${muted(subtitleLine)} ${TUI_THEME.frame.vertical}`,
    `${TUI_THEME.frame.bottomLeft}${line}${TUI_THEME.frame.bottomRight}`
  ].join("\n");
}

function pad(value: string, targetLength: number): string {
  return value.padEnd(Math.max(targetLength, value.length), " ");
}
