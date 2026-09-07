import argparse
import io
import os
import re
import sys

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}


def progress(message):
    sys.stderr.write("[convert] {}\n".format(message))
    sys.stderr.flush()


def parse_pages(spec, page_count):
    if not spec or not str(spec).strip():
        return list(range(page_count))
    selected = set()
    spec = str(spec).strip()
    for part in re.split(r"[,;\s]+", spec):
        if not part:
            continue
        match = re.match(r"^(\d+)(?:-(\d+))?$", part)
        if not match:
            raise ValueError(
                "Invalid page range '{}'. Use comma/space separated page numbers or ranges, e.g. '1-3,5'.".format(part)
            )
        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else start
        if start < 1 or end > page_count or start > end:
            raise ValueError(
                "Page range '{}' is out of bounds (document has {} page(s)).".format(part, page_count)
            )
        selected.update(range(start - 1, end))
    return sorted(selected)


def ocr_image(image_bytes):
    try:
        from PIL import Image
        import pytesseract
    except Exception as error:
        progress("OCR engine unavailable: {}".format(error))
        return "[No text detected - OCR unavailable: {}]\n".format(error)
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        image.close()
        return text
    except Exception as error:
        progress("OCR failed: {}".format(error))
        return "[No text detected - OCR failed: {}]\n".format(error)


def extract_pdf(pdf_bytes, pages_spec):
    try:
        import pypdfium2 as pdfium
    except ImportError as error:
        raise RuntimeError("pypdfium2 is required for PDF processing: {}".format(error))
    if not pdf_bytes:
        raise ValueError("PDF file is empty.")

    doc = pdfium.PdfDocument(pdf_bytes)
    page_count = len(doc)
    selected = parse_pages(pages_spec, page_count)
    if not selected:
        doc.close()
        return ""
    progress(
        "PDF has {} page(s); extracting {} selected page(s): {}.".format(
            page_count, len(selected), ", ".join(str(p + 1) for p in selected)
        )
    )

    chunks = []
    for index in selected:
        page_num = index + 1
        page = doc[index]
        text = ""
        try:
            textpage = page.get_textpage()
            if textpage:
                text = (textpage.get_text_range() or "").strip()
                textpage.close()
        except Exception as error:
            progress("Page {} text extraction failed: {}".format(page_num, error))

        if text:
            chunks.append("[[Page {}]]\n{}".format(page_num, text))
            progress("Page {}: extracted {} chars of text.".format(page_num, len(text)))
            continue

        progress("Page {}: no selectable text -- running OCR...".format(page_num))
        bitmap = page.render(scale=2.2)
        pil = bitmap.to_pil()
        buffer = io.BytesIO()
        pil.save(buffer, format="PNG")
        bitmap.close()
        pil.close()
        ocr_text = ocr_image(buffer.getvalue()).strip()
        if not ocr_text:
            ocr_text = "[No text detected on page {}]".format(page_num)
        progress("Page {}: OCR recovered {} chars.".format(page_num, len(ocr_text)))
        chunks.append("[[Page {}]]\n{}".format(page_num, ocr_text))

    doc.close()
    return "\n\n".join(chunks)


def extract_image(image_bytes):
    progress("Image file, {} bytes -- running OCR...".format(len(image_bytes)))
    text = ocr_image(image_bytes).strip()
    if not text:
        return "[No text detected in image]"
    progress("OCR recovered {} chars.".format(len(text)))
    return text


def main():
    parser = argparse.ArgumentParser(prog="convert")
    parser.add_argument("file_path")
    parser.add_argument("--pages", default=None, help="e.g. '1-3,5' - only parse these PDF pages (1-indexed)")
    args = parser.parse_args()

    if not os.path.exists(args.file_path):
        sys.stderr.write("Error converting document: source file does not exist.\n")
        sys.exit(1)

    extension = os.path.splitext(args.file_path)[1].lower()
    try:
        with open(args.file_path, "rb") as handle:
            data = handle.read()

        if extension == ".pdf":
            markdown = extract_pdf(data, args.pages)
        elif extension in IMAGE_EXTENSIONS:
            markdown = extract_image(data)
        else:
            from markitdown import MarkItDown

            progress("Converting {} via MarkItDown converter...".format(extension or "document"))
            result = MarkItDown().convert(args.file_path)
            markdown = result.text_content or ""
            progress("MarkItDown produced {} chars.".format(len(markdown)))

        sys.stdout.write(markdown or "(empty)")
    except Exception as error:
        sys.stderr.write("Error converting document: {}\n".format(error))
        sys.exit(1)


if __name__ == "__main__":
    main()