"""Tesseract adapter for the OcrEngine port (T-13, spec D-03)."""

import io

import pytesseract
from PIL import Image


class TesseractOcrEngine:
    """Recognizes text in image bytes with Tesseract (default `spa`)."""

    def __init__(self, lang: str = "spa") -> None:
        self._lang = lang

    def recognize(self, image: bytes) -> str:
        with Image.open(io.BytesIO(image)) as decoded:
            return pytesseract.image_to_string(decoded, lang=self._lang)
