import { emitKeypressEvents } from "node:readline";
import { accent, clearScreen, drawBox, hideCursor, muted, showCursor, truncate, warn } from "./ansi.js";
import type { DocxFile } from "./types.js";

type SelectorState = {
  cursor: number;
  scroll: number;
  filter: string;
  editingFilter: boolean;
  selectedPaths: Set<string>;
};

export async function selectDocxFiles(files: readonly DocxFile[]): Promise<DocxFile[]> {
  if (!process.stdin.isTTY) {
    return [...files];
  }

  const state: SelectorState = {
    cursor: 0,
    scroll: 0,
    filter: "",
    editingFilter: false,
    selectedPaths: new Set()
  };

  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  hideCursor();

  try {
    return await new Promise<DocxFile[]>((resolve, reject) => {
      const cleanup = () => {
        process.stdin.off("keypress", onKeyPress);
        process.stdin.setRawMode(false);
        showCursor();
        clearScreen();
      };

      const finish = () => {
        cleanup();
        resolve(files.filter((file) => state.selectedPaths.has(file.path)));
      };

      const cancel = () => {
        cleanup();
        reject(new Error("Abgebrochen."));
      };

      const render = () => drawSelector(files, state);

      const onKeyPress = (character: string | undefined, key: { name?: string; ctrl?: boolean; sequence?: string }) => {
        if (key.ctrl && key.name === "c") {
          cancel();
          return;
        }

        const visibleFiles = getVisibleFiles(files, state.filter);

        if (state.editingFilter) {
          if (key.name === "return") {
            state.editingFilter = false;
          } else if (key.name === "escape") {
            state.filter = "";
            state.editingFilter = false;
          } else if (key.name === "backspace") {
            state.filter = state.filter.slice(0, -1);
          } else if (character && character >= " ") {
            state.filter += character;
          }
          clampState(state, visibleFiles.length);
          render();
          return;
        }

        switch (key.name) {
          case "q":
            cancel();
            return;
          case "up":
            state.cursor = Math.max(0, state.cursor - 1);
            break;
          case "down":
            state.cursor = Math.min(Math.max(visibleFiles.length - 1, 0), state.cursor + 1);
            break;
          case "space":
            toggleCurrent(visibleFiles, state);
            break;
          case "return":
            finish();
            return;
          default:
            if (character === "/") {
              state.editingFilter = true;
            } else if (character === "a") {
              for (const file of visibleFiles) {
                state.selectedPaths.add(file.path);
              }
            } else if (character === "n") {
              state.selectedPaths.clear();
            }
        }

        clampState(state, visibleFiles.length);
        render();
      };

      process.stdin.on("keypress", onKeyPress);
      render();
    });
  } finally {
    if (process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
    showCursor();
  }
}

function drawSelector(files: readonly DocxFile[], state: SelectorState): void {
  const visibleFiles = getVisibleFiles(files, state.filter);
  const terminalRows = process.stdout.rows || 30;
  const terminalWidth = process.stdout.columns || 100;
  const listHeight = Math.max(8, terminalRows - 12);

  if (state.cursor < state.scroll) {
    state.scroll = state.cursor;
  }
  if (state.cursor >= state.scroll + listHeight) {
    state.scroll = state.cursor - listHeight + 1;
  }

  const visibleSlice = visibleFiles.slice(state.scroll, state.scroll + listHeight);
  const selectedCount = state.selectedPaths.size;
  const filterLabel = state.filter ? `Filter: ${state.filter}` : "Filter: /";
  const filterText = state.editingFilter ? accent(`${filterLabel}_`) : muted(filterLabel);

  clearScreen();
  process.stdout.write(`${drawBox("Docx Word PDF", "Systemweite DOCX-Suche. Auswahl mit Space. Export mit Word.")}\n\n`);
  process.stdout.write(`${accent(String(files.length))} Dateien gefunden · ${accent(String(selectedCount))} ausgewählt · ${filterText}\n`);
  process.stdout.write(`${muted("↑/↓ bewegen  Space auswählen  / filtern  a alle sichtbaren  n keine  Enter weiter  q raus")}\n\n`);

  if (visibleSlice.length === 0) {
    process.stdout.write(`${warn("Keine Treffer für diesen Filter.")}\n`);
    return;
  }

  for (const [offset, file] of visibleSlice.entries()) {
    const absoluteIndex = state.scroll + offset;
    const isCursor = absoluteIndex === state.cursor;
    const isSelected = state.selectedPaths.has(file.path);
    const pointer = isCursor ? accent("›") : " ";
    const checkbox = isSelected ? accent("[x]") : muted("[ ]");
    const nameWidth = Math.min(34, Math.max(18, Math.floor(terminalWidth * 0.32)));
    const directoryWidth = Math.max(24, terminalWidth - nameWidth - 20);
    const date = formatDate(file.modifiedAt);
    process.stdout.write(
      `${pointer} ${checkbox} ${truncate(file.name, nameWidth).padEnd(nameWidth)} ${muted(truncate(file.directory, directoryWidth))} ${muted(date)}\n`
    );
  }
}

function getVisibleFiles(files: readonly DocxFile[], filter: string): DocxFile[] {
  const normalizedFilter = filter.trim().toLowerCase();
  if (!normalizedFilter) {
    return [...files];
  }

  return files.filter((file) => `${file.name} ${file.directory}`.toLowerCase().includes(normalizedFilter));
}

function toggleCurrent(visibleFiles: readonly DocxFile[], state: SelectorState): void {
  const current = visibleFiles[state.cursor];
  if (!current) {
    return;
  }

  if (state.selectedPaths.has(current.path)) {
    state.selectedPaths.delete(current.path);
  } else {
    state.selectedPaths.add(current.path);
  }
}

function clampState(state: SelectorState, visibleLength: number): void {
  state.cursor = Math.min(Math.max(0, state.cursor), Math.max(visibleLength - 1, 0));
  state.scroll = Math.min(Math.max(0, state.scroll), Math.max(visibleLength - 1, 0));
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
