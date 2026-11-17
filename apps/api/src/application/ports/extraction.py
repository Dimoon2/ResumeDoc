"""Extraction ports (T-12/T-13): PDF pipeline and OCR engine."""

from typing import Protocol


class TextExtractor(Protocol):
    """Extracts the text of a PDF page by page (D-08)."""

    def extract_pdf(self, data: bytes) -> str:
        """Return the full text, or raise a DocumentProcessingError."""
        ...


class OcrEngine(Protocol):
    """Recognizes text in an image (PNG/JPG or a rasterized PDF page)."""

    def recognize(self, image: bytes) -> str:
        """Return the recognized text ("" when the image has none)."""
        ...
