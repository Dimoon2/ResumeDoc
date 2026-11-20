"""PDF pipeline adapter for the TextExtractor port (T-12, spec §7)."""

import io

from pdf2image import convert_from_bytes
from pypdf import PdfReader

from src.application.ports.extraction import OcrEngine
from src.domain.document import EncryptedDocumentError, TooManyPagesError

# Rasterization resolution for OCR fallback (provisional, CA-4).
_DPI = 150


class PdfTextExtractor:
    """Extracts text page by page: text layer first, OCR fallback otherwise."""

    def __init__(self, ocr: OcrEngine, max_pages: int) -> None:
        self._ocr = ocr
        self._max_pages = max_pages

    def extract_pdf(self, data: bytes) -> str:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise EncryptedDocumentError()
        if len(reader.pages) > self._max_pages:
            raise TooManyPagesError(self._max_pages)

        pages: list[str] = []
        for index, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            if not text:
                # Sin capa textual → rasterizar esa página y aplicar OCR.
                rendered = convert_from_bytes(
                    data, dpi=_DPI, first_page=index, last_page=index
                )[0]
                buffer = io.BytesIO()
                rendered.save(buffer, format="PNG")
                text = self._ocr.recognize(buffer.getvalue()).strip()
            pages.append(text)
        # Concatenación en orden de página (D-08).
        return "\n".join(pages)
