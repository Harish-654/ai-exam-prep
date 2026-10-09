#!/usr/bin/env python3
"""Small terminal version of AI Exam Prep.

Converts a document (PDF/DOCX/PPTX/XLSX/EPUB/TXT, or an image via OCR),
asks the Planner agent to build a study plan, then prints the syllabus and a
ready-to-paste study prompt for each module.

Usage:
    python/venv/bin/python python/cli.py notes.pdf
    python/venv/bin/python python/cli.py notes.pdf --pages 1-5,8
    python/venv/bin/python python/cli.py notes.pdf --prompt "Focus on depreciation"
    python/venv/bin/python python/cli.py scan.png --copy 1
    python/venv/bin/python python/cli.py notes.pdf --json > plan.json
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from convert import IMAGE_EXTENSIONS, extract_image, extract_pdf, progress  # noqa: E402

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "openrouter/free"
MAX_SOURCE_CHARS = 30000


# --------------------------------------------------------------------------- #
# Terminal helpers
# --------------------------------------------------------------------------- #
class Style:
    def __init__(self, enabled):
        self.enabled = enabled
        self.bold = "\033[1m" if enabled else ""
        self.dim = "\033[2m" if enabled else ""
        self.green = "\033[32m" if enabled else ""
        self.red = "\033[31m" if enabled else ""
        self.cyan = "\033[36m" if enabled else ""
        self.reset = "\033[0m" if enabled else ""


def use_color():
    return sys.stdout.isatty() and not os.environ.get("NO_COLOR")


def load_dotenv():
    path = os.path.join(REPO_ROOT, ".env")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


# --------------------------------------------------------------------------- #
# Conversion
# --------------------------------------------------------------------------- #
def convert_file(file_path, pages):
    extension = os.path.splitext(file_path)[1].lower()
    if extension == ".pdf":
        with open(file_path, "rb") as handle:
            return extract_pdf(handle.read(), pages)
    if extension in IMAGE_EXTENSIONS:
        with open(file_path, "rb") as handle:
            return extract_image(handle.read())
    from markitdown import MarkItDown

    progress("Converting {} via MarkItDown converter...".format(extension or "document"))
    result = MarkItDown().convert(file_path)
    return result.text_content or ""


# --------------------------------------------------------------------------- #
# Planner agent
# --------------------------------------------------------------------------- #
def extract_json(content):
    if not content:
        return None
    text = content.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    candidate = text
    if "```" in text:
        import re

        fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if fenced:
            candidate = fenced.group(1)
    start, end = candidate.find("{"), candidate.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(candidate[start : end + 1])
    except json.JSONDecodeError:
        return None


def call_planner(markdown, user_prompt, model):
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise SystemExit(
            "OPENROUTER_API_KEY is not set. Add it to .env or export it before running the CLI."
        )

    system_prompt = (
        "You are the Planning Agent in a multi-agent exam preparation system. "
        "You analyze an exam preparation document and produce a concrete study plan. "
        "You speak the truth derived strictly from the provided source text. "
        "Respond with ONLY a valid JSON object and nothing else."
    )

    user_text = "Analyze the exam preparation material below and build a study plan.\n\n"
    if user_prompt and user_prompt.strip():
        user_text += (
            "The student gave you the following instructions. Follow them closely when "
            "building the plan (prioritize requested topics, skip requested exclusions, "
            "adjust depth and hours accordingly):\n" + user_prompt.strip() + "\n\n"
        )
    user_text += (
        "Return a JSON object with this exact shape:\n"
        "{\n"
        '  "totalHours": <number, estimated total prep hours>,\n'
        '  "modules": [\n'
        '    { "title": <string>, "duration": <string like "2 hours">, "topics": [<string>, ...] }\n'
        "  ]\n"
        "}\n\n"
        "Constraints: estimate between 8 and 60 total hours based on content volume, difficulty, "
        "and the student instructions; build between 3 and 8 modules; each module must have "
        "2-6 concrete topics extracted from the source.\n\n"
        "SOURCE MATERIAL (page markers indicate which page each passage came from):\n"
        "---\n" + markdown[:MAX_SOURCE_CHARS] + "\n---"
    )

    payload = json.dumps(
        {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            "response_format": {"type": "json_object"},
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        OPENROUTER_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key,
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "ExamPrep CLI",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        try:
            message = json.loads(detail).get("error", {}).get("message", detail)
        except json.JSONDecodeError:
            message = detail
        raise SystemExit("OpenRouter API error: " + str(message))
    except urllib.error.URLError as error:
        raise SystemExit("OpenRouter request failed: " + str(error.reason))

    content = (
        data.get("choices", [{}])[0].get("message", {}).get("content")
        if isinstance(data, dict)
        else None
    )
    plan = extract_json(content)
    if not isinstance(plan, dict):
        raise SystemExit("Planner returned an unparseable response.")
    return plan


# --------------------------------------------------------------------------- #
# Study prompt (mirrors the GUI's per-module copy button)
# --------------------------------------------------------------------------- #
def build_study_prompt(module, markdown):
    topics = module.get("topics") or []
    topic_lines = "\n".join("- " + str(topic) for topic in topics) or "- (no topics listed)"
    source = (markdown or "").strip()[:12000] or "No source text available for this document."
    return (
        "You are my personal study tutor for an upcoming exam.\n"
        "\n"
        "MODULE TO MASTER: {title}\n"
        "PLANNED STUDY TIME: {duration}\n"
        "TOPICS TO COVER:\n"
        "{topics}\n\n"
        "Run a focused study session for me covering exactly this module. For each topic:\n"
        "1. Explain the concept in plain language with the key definitions, formulas, and rules.\n"
        "2. Point out what examiners most often test and the most common traps students fall into.\n"
        "3. Give me one short practice question I can answer to check my understanding.\n"
        "\n"
        "End the session by listing the 3-5 things I must memorise from this module. "
        "If a required formula or concept is not covered by the source, say so explicitly instead of guessing.\n"
        "\n"
        "SOURCE EXCERPTS FROM MY EXAM DOCUMENT (the [[Page N]] markers show which page each part came from):\n"
        "---\n"
        "{source}\n"
        "---"
    ).format(
        title=module.get("title", "Untitled module"),
        duration=module.get("duration", "varies"),
        topics=topic_lines,
        source=source,
    )


def copy_to_clipboard(text):
    for command in (["wl-copy"], ["xclip", "-selection", "clipboard"], ["xsel", "--clipboard", "--input"], ["pbcopy"]):
        if shutil.which(command[0]):
            try:
                subprocess.run(command, input=text.encode("utf-8"), check=True)
                return command[0]
            except (subprocess.CalledProcessError, OSError):
                continue
    return None


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    parser = argparse.ArgumentParser(
        prog="exam-prep",
        description="Terminal version of AI Exam Prep: document -> study plan + per-module prompts.",
    )
    parser.add_argument("file", help="Document to study (PDF, DOCX, PPTX, XLSX, EPUB, TXT, or image)")
    parser.add_argument("--pages", default=None, help="PDF pages to use, e.g. '1-5,8' (default: all)")
    parser.add_argument("--prompt", default=None, help="Study guidance for the Planner agent")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="OpenRouter model (default: %(default)s)")
    parser.add_argument("--json", action="store_true", help="Print the raw plan as JSON and exit")
    parser.add_argument("--copy", type=int, metavar="N", help="Copy module N's study prompt to the clipboard and exit")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        raise SystemExit("File not found: " + args.file)

    style = Style(use_color())
    load_dotenv()

    if not args.json:
        print(style.dim + "[convert] parsing " + os.path.basename(args.file) + "..." + style.reset, file=sys.stderr)

    markdown = convert_file(args.file, args.pages)
    if not markdown.strip():
        raise SystemExit("No text could be extracted from the document.")

    if not args.json:
        print(
            style.dim
            + "[convert] extracted {} chars; asking the Planner agent...".format(len(markdown))
            + style.reset,
            file=sys.stderr,
        )

    plan = call_planner(markdown, args.prompt, args.model)
    modules = [m for m in (plan.get("modules") or []) if isinstance(m, dict)]

    if args.json:
        print(json.dumps({"fileName": os.path.basename(args.file), "markdown": markdown, "syllabus": plan}, indent=2))
        return

    if not modules:
        raise SystemExit("Planner returned no modules.")

    if args.copy is not None:
        index = args.copy
        if index < 1 or index > len(modules):
            raise SystemExit("--copy expects a module number between 1 and {}.".format(len(modules)))
        prompt = build_study_prompt(modules[index - 1], markdown)
        tool = copy_to_clipboard(prompt)
        if tool:
            print(style.green + "Copied module {} study prompt to the clipboard ({}).".format(index, tool) + style.reset)
        else:
            print(prompt)
        return

    total_hours = plan.get("totalHours", "?")
    print()
    print(style.bold + "AI Exam Prep" + style.reset + style.dim + "  ·  " + os.path.basename(args.file) + style.reset)
    print(
        style.cyan
        + "{} hours planned  ·  {} modules".format(total_hours, len(modules))
        + style.reset
    )
    print()

    for index, module in enumerate(modules, start=1):
        print(
            style.bold
            + "[{}] {} ".format(index, module.get("title", "Untitled"))
            + style.reset
            + style.dim
            + "({})".format(module.get("duration", "?"))
            + style.reset
        )
        for topic in module.get("topics") or []:
            print("    • " + str(topic))
        print()
        prompt = build_study_prompt(module, markdown)
        print(style.dim + "    ---- study prompt (copy below) ----" + style.reset)
        for line in prompt.splitlines():
            print("    " + line)
        print(style.dim + "    ----------------------------------" + style.reset)
        print()

    print(
        style.dim
        + "Tip: `python/venv/bin/python python/cli.py {} --copy 1` copies module 1's prompt.".format(
            args.file
        )
        + style.reset
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
