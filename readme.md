# AI Exam Prep

Turn a document into a structured, time-aware study plan — then copy a
ready-to-paste study prompt for each module.

Upload (or point the CLI at) a PDF, Word doc, PowerPoint, spreadsheet, EPUB,
or plain text — even a photo/screenshot or a scanned PDF page. The app extracts
the content (text extraction with **OCR** fallback), asks a **Planner agent** to
build a study plan, and splits the material into modules with topics, estimated
hours, and calendar events.

## Features

- **Many input types** — PDF, DOCX, PPTX, XLSX/XLS, EPUB, Markdown, TXT, and
  images (PNG/JPG/WEBP/BMP/TIFF).
- **OCR for the hard cases** — scanned PDF pages and image uploads are read
  with Tesseract, so text without a text layer still works.
- **Page selection for PDFs** — parse only the pages you care about
  (e.g. `1-5, 8`); page markers (`[[Page N]]`) keep the agent aware of sources.
- **Planner agent** — estimates prep hours and builds 3–8 modules with concrete
  topics, driven by an optional natural-language study prompt.
- **Per-module study prompts** — one click (or `--copy N` in the terminal)
  copies a detailed, self-contained prompt you can paste into any LLM.
- **Google Calendar events** — each module ships a ready-to-add calendar link.
- **Two ways to run it** — a React + shadcn/ui web UI and a small terminal CLI.

## Tech Stack

- **Backend:** Node.js + Express (SSE live progress), Python for conversion.
- **Conversion:** [MarkItDown](https://github.com/microsoft/markitdown) +
  PyMuPDF/PDFium + Tesseract OCR.
- **Agent:** OpenRouter (`openrouter/free` by default).
- **Frontend:** React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui.

## Project Structure

```text
ai-exam-prep/
├── client/                 # React + shadcn/ui frontend
├── server/
│   ├── app.js              # Express API + SSE + serves the built client
│   └── services/           # markitdown (convert), openrouter, calendar
├── python/
│   ├── convert.py          # text extraction + page selection + OCR
│   ├── cli.py              # terminal version
│   └── requirements.txt
├── uploads/                # temporary uploads (cleaned up after each run)
├── package.json
├── .env.example
└── readme.md
```

## Prerequisites

- Node.js 20+ and npm
- Python 3.10+
- [Tesseract OCR](https://tesseract-ocr.github.io/) for OCR
  (`sudo pacman -S tesseract tesseract-data-eng`, `sudo apt install tesseract-ocr`, or `brew install tesseract`)
- An [OpenRouter](https://openrouter.ai/) API key

## Setup

```bash
git clone https://github.com/Harish-654/ai-exam-prep.git
cd ai-exam-prep

# Node dependencies
npm install

# Python virtualenv + dependencies (MarkItDown extras, OCR bindings)
npm run setup:venv

# Environment
cp .env.example .env
# then edit .env and set OPENROUTER_API_KEY
```

`.env`:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
PORT=5000
```

## Run the Web App

```bash
# Production-style: build the client, then start the server (serves it on :5000)
npm run build
npm start
```

```bash
# Development: server on :5000, Vite dev server on :5173 (proxies /api)
npm run dev          # terminal 1
npm run dev:client   # terminal 2
```

Open http://localhost:5000 (or the Vite URL in dev), upload a document, pick
pages if it's a PDF, optionally add study guidance, then **Run Pipeline**.

## Run the Terminal Version

A small CLI that converts, plans, and prints each module's study prompt.

```bash
npm run cli -- notes.pdf
npm run cli -- notes.pdf --pages 1-5,8
npm run cli -- notes.pdf --prompt "Focus on depreciation"
npm run cli -- scan.png                 # image input via OCR
npm run cli -- notes.pptx --copy 2      # copy module 2's prompt to clipboard
npm run cli -- notes.pdf --json > plan.json
```

Equivalent without npm:

```bash
python/venv/bin/python python/cli.py notes.pdf --pages 1-5,8
```

## How It Works

```text
Document / image
      │
      ▼
[1] Extract text  ── PDF pages filtered, scanned pages OCR'd
      │
      ▼
[2] Planner agent ── modules + topics + estimated hours
      │
      ▼
[3] Calendar      ── per-module Google Calendar links
      │
      ▼
Study plan + copyable per-module study prompts
```

Live progress streams to the UI terminal over Server-Sent Events
(`GET /api/events`).

## API

`POST /api/generate-exam-prep` (multipart/form-data)

| Field      | Required | Description                                   |
| ---------- | -------- | --------------------------------------------- |
| `document` | yes      | The file to analyze                           |
| `pages`    | no       | PDF pages, e.g. `1-5,8` (default: all pages)  |
| `prompt`   | no       | Study guidance for the Planner agent          |

Response: `{ success, fileName, markdown, syllabus, calendar }`.

## Troubleshooting

- **`MissingDependencyException` for a format** — the MarkItDown extras aren't
  installed for that file type. Run `npm run setup:venv` (installs
  `markitdown[pdf,docx,pptx,xlsx,xls]`).
- **OCR returns nothing** — make sure `tesseract` is on your `PATH`
  (`tesseract --version`).
- **`OPENROUTER_API_KEY is not set`** — create `.env` from `.env.example` and
  add your key.
- **Port already in use** — stop the previous server (`ss -ltnp | grep 5000`)
  or set `PORT` in `.env`.

## License

Add the project's license information here if applicable.
