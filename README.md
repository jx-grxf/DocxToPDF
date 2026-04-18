<div align="center">

# Docx To PDF

A calm TypeScript TUI for finding DOCX files and batch-converting them to PDF with Microsoft Word as the native export engine.

![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)
![Node](https://img.shields.io/badge/node-22%2B-green)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Engine](https://img.shields.io/badge/pdf%20engine-Microsoft%20Word-2b579a)

</div>

## Showcase

```text
┌────────────────────────────────────────────────────────────┐
│ Docx Word PDF                                              │
│ System-wide DOCX search. Space to select. Export with Word. │
└────────────────────────────────────────────────────────────┘

  ◐ Searching the system for DOCX files…

  › [ ] resume.docx             /Users/you/Documents
    [x] invoice.docx          /Users/you/Downloads
    [ ] contract.docx           /Users/you/Desktop
```

## Contents

- [Highlights](#highlights)
- [Why This Exists](#why-this-exists)
- [Current Workflow](#current-workflow)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Development](#development)
- [Roadmap](#roadmap)
- [License](#license)

## Highlights

| Feature | Description |
| --- | --- |
| Native Word engine | Uses Microsoft Word via AppleScript, so PDFs match Word's own export output. |
| System-wide DOCX search | Uses macOS Spotlight first and falls back to filesystem search when needed. |
| Keyboard selection | Arrow keys, Space to toggle, type to filter, Ctrl+A (all visible), Ctrl+N (clear), Enter to continue. |
| Batch export | One Word session exports every selected file in order (faster than separate runs). |
| Optional OCR | Adds a searchable OCR layer through OCRmyPDF without replacing existing PDF text. |
| Calm TUI | Uses the provided theme and loading-ball animation without heavy UI clutter. |

## Why This Exists

LibreOffice and document parsing libraries can convert DOCX files, but complex Word layout often changes. This tool uses Word itself as the rendering engine, then optionally adds OCR as a separate post-processing step.

## Current Workflow

1. Search the Mac for `.docx` files.
2. Show all results in a keyboard-driven TUI.
3. Select documents with Space.
4. Choose output folder, OCR, and overwrite behavior.
5. Export through Microsoft Word in one session (with AppleScript alerts suppressed where supported).

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript |
| Runtime | Node.js |
| Search | `mdfind` / filesystem fallback |
| PDF engine | Microsoft Word via `osascript` |
| OCR | OCRmyPDF and Tesseract |

## Requirements

- macOS
- Microsoft Word installed at `/Applications/Microsoft Word.app`
- Node.js 22+
- Optional OCR tools:

```bash
brew install ocrmypdf tesseract tesseract-lang
```

## Quick Start

```bash
npm install
npm run dev
```

## Usage

Controls:

| Key | Action |
| --- | --- |
| Arrow Up / Down | Move through results |
| Space | Select or unselect a document |
| Type letters | Filter the list (start typing; `/` opens filter without a leading slash) |
| Ctrl+A | Select all visible results |
| Ctrl+N | Clear selection among visible results |
| Enter | Continue |
| `q` | Quit |

On first conversion, macOS may ask whether your terminal may control Microsoft Word. Allow it, otherwise Word cannot export PDFs.

Word modal prompts (for example linked fields) are suppressed during automation via `display alerts`; some macOS security prompts may still appear until paths are trusted once.

## Development

```bash
npm install
npm run build
npm test
```

## Roadmap

- Preserve source folder structure in the output directory.
- Add a small conversion log export.
- Add retry for failed files.
- Add signed release packaging.

## License

MIT
