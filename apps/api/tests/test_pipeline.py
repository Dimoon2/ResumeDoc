"""Pipeline tests (T-17, CA-3/3b/4/4b/9): state machine, extraction, worker.

Dataset dorado generado en la prueba: PDF textual a mano, PDF cifrado y de
101 páginas (pypdf), PNG con texto y sin texto (PIL). El OCR real usa
Tesseract `spa` (CA-4).
"""

import io
from collections.abc import Iterator
from pathlib import Path

import pytest
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter

from src.adapters.extraction.pdf_pipeline import PdfTextExtractor
from src.adapters.extraction.tesseract import TesseractOcrEngine
from src.adapters.persistence.memory import (
    InMemoryDocumentRepository,
    InMemoryDocumentStateStore,
)
from src.adapters.storage.filesystem import FilesystemStorage
from src.adapters.workers.queue import PROCESS_TASK_NAME
from src.application.ports.extraction import OcrEngine, TextExtractor
from src.application.usecases.documents import process_document
from src.domain.document import (
    Document,
    DocumentState,
    DocumentProcessingError,
    EncryptedDocumentError,
    InvalidTransitionError,
    TooManyPagesError,
    begin_processing,
    can_edit,
    complete,
    fail,
)
from src.worker import process_document_task

# --- Dataset dorado ----------------------------------------------------


def build_textual_pdf(text: str, blank_last_page: bool = False) -> bytes:
    """Minimal valid PDF (hand-built): one text page (+ optional blank one).

    Object ids: 1 = catalog, 2 = pages, 3..2+n = pages, 3+n+i = content
    stream of page i, 3+2n = font.
    """
    page_count = 2 if blank_last_page else 1
    text_stream = f"BT /F1 24 Tf 72 720 Td ({text}) Tj ET".encode()
    empty_stream = b""

    bodies: dict[int, bytes] = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        2: (
            f"<< /Type /Pages /Kids [{' '.join(f'{3 + i} 0 R' for i in range(page_count))}] "
            f"/Count {page_count} >>"
        ).encode(),
        3 + 2 * page_count: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    }
    for index in range(page_count):
        stream = text_stream if index == 0 else empty_stream
        content_id = 3 + page_count + index
        bodies[3 + index] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Contents {content_id} 0 R /Resources << /Font << /F1 {3 + 2 * page_count} 0 R >> >> >>"
        ).encode()
        bodies[content_id] = (
            b"<< /Length " + str(len(stream)).encode()
            + b" >>\nstream\n" + stream + b"\nendstream"
        )

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets: list[int] = []
    for number in sorted(bodies):
        offsets.append(out.tell())
        out.write(f"{number} 0 obj\n".encode() + bodies[number] + b"\nendobj\n")
    xref_pos = out.tell()
    out.write(f"xref\n0 {max(bodies) + 1}\n".encode() + b"0000000000 65535 f \n")
    for offset in offsets:
        out.write(f"{offset:010d} 00000 n \n".encode())
    out.write(
        f"trailer\n<< /Size {max(bodies) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n".encode()
    )
    return out.getvalue()


def image_png(text: str | None) -> bytes:
    """PNG with a drawn word, or a blank PNG when text is None."""
    image = Image.new("RGB", (500, 120), "white")
    if text:
        draw = ImageDraw.Draw(image)
        font = ImageFont.load_default(size=48)
        draw.text((20, 30), text, fill="black", font=font)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def encrypted_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(612, 792)
    writer.encrypt("secreto")
    return _writer_bytes(writer)


def many_pages_pdf(pages: int) -> bytes:
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(612, 792)
    return _writer_bytes(writer)


def _writer_bytes(writer: PdfWriter) -> bytes:
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


# --- Dobles de extracción ----------------------------------------------


class FakeExtractor(TextExtractor):
    def __init__(self, result: str = "", error: Exception | None = None) -> None:
        self._result = result
        self._error = error

    def extract_pdf(self, data: bytes) -> str:
        if self._error:
            raise self._error
        return self._result


class FakeOcr(OcrEngine):
    def __init__(self, result: str = "") -> None:
        self._result = result

    def recognize(self, image: bytes) -> str:
        return self._result


# --- Máquina de estados (T-11) -----------------------------------------


def test_state_machine_happy_path() -> None:
    state = DocumentState("pending")
    processing = begin_processing(state)
    done = complete(processing, "text/x.txt")

    assert processing.status == "processing"
    assert done.status == "completed" and done.text_path == "text/x.txt"
    assert can_edit(done) and not can_edit(processing)


def test_state_machine_rejects_bad_transitions() -> None:
    with pytest.raises(InvalidTransitionError):
        begin_processing(DocumentState("completed"))
    with pytest.raises(InvalidTransitionError):
        complete(DocumentState("pending"), "text/x.txt")
    # fail() es válido desde cualquier estado (D-16).
    assert fail(DocumentState("pending"), "boom").error == "boom"


# --- Caso de uso ProcessDocument (T-14) --------------------------------


@pytest.fixture
def pipeline(tmp_path: Path) -> tuple[InMemoryDocumentRepository, FilesystemStorage, InMemoryDocumentStateStore]:
    repository = InMemoryDocumentRepository()
    storage = FilesystemStorage(tmp_path / "storage")
    return repository, storage, InMemoryDocumentStateStore()


def _add_document(
    repository: InMemoryDocumentRepository,
    storage: FilesystemStorage,
    data: bytes,
    extension: str,
) -> Document:
    location = storage.save(extension, data)
    return repository.create_document(
        Document(name=f"doc{extension}", location=location, size_bytes=len(data), owner_id=1)
    )


def test_process_pdf_completed_with_text(
    pipeline: tuple[InMemoryDocumentRepository, FilesystemStorage, InMemoryDocumentStateStore],
) -> None:
    repository, storage, states = pipeline
    document = _add_document(repository, storage, build_textual_pdf("hola"), ".pdf")

    process_document(repository, storage, states, FakeExtractor("TEXTO"), FakeOcr(), document.id)

    state = states.get(document.id)
    assert state is not None and state.status == "completed"
    assert storage.read_text(state.text_path) == "TEXTO"
    assert can_edit(state)


def test_process_image_empty_text_is_completed_not_error(
    pipeline: tuple[InMemoryDocumentRepository, FilesystemStorage, InMemoryDocumentStateStore],
) -> None:
    repository, storage, states = pipeline
    document = _add_document(repository, storage, image_png(None), ".png")

    process_document(repository, storage, states, FakeExtractor(), FakeOcr(""), document.id)

    state = states.get(document.id)
    assert state is not None and state.status == "completed"  # D-09
    assert storage.read_text(state.text_path) == ""


def test_process_unknown_document_is_noop(
    pipeline: tuple[InMemoryDocumentRepository, FilesystemStorage, InMemoryDocumentStateStore],
) -> None:
    repository, storage, states = pipeline

    process_document(repository, storage, states, FakeExtractor(), FakeOcr(), 999)

    assert states.get(999) is None


def test_process_already_completed_is_not_reprocessed(
    pipeline: tuple[InMemoryDocumentRepository, FilesystemStorage, InMemoryDocumentStateStore],
) -> None:
    repository, storage, states = pipeline
    document = _add_document(repository, storage, b"x", ".pdf")
    states.set(document.id, DocumentState("completed", text_path="text/old.txt"))
    calls: list[int] = []

    class Counting(FakeExtractor):
        def extract_pdf(self, data: bytes) -> str:
            calls.append(document.id)
            return "y"

    process_document(repository, storage, states, Counting(), FakeOcr(), document.id)

    assert calls == []
    final = states.get(document.id)
    assert final is not None and final.text_path == "text/old.txt"


def test_process_extraction_error_marks_error_in_spanish(
    pipeline: tuple[InMemoryDocumentRepository, FilesystemStorage, InMemoryDocumentStateStore],
) -> None:
    repository, storage, states = pipeline
    document = _add_document(repository, storage, b"x", ".pdf")

    process_document(
        repository,
        storage,
        states,
        FakeExtractor(error=EncryptedDocumentError()),
        FakeOcr(),
        document.id,
    )

    state = states.get(document.id)
    assert state is not None and state.status == "error"
    assert "cifrado" in state.error


def test_process_unexpected_error_gives_generic_spanish_message(
    pipeline: tuple[InMemoryDocumentRepository, FilesystemStorage, InMemoryDocumentStateStore],
) -> None:
    repository, storage, states = pipeline
    document = _add_document(repository, storage, b"x", ".pdf")

    process_document(
        repository,
        storage,
        states,
        FakeExtractor(error=RuntimeError("traceback interno")),
        FakeOcr(),
        document.id,
    )

    state = states.get(document.id)
    assert state is not None and state.status == "error"
    assert state.error == "Error al procesar el documento."


# --- Adaptadores reales de extracción (T-12/T-13) -----------------------


@pytest.fixture
def real_extractor(tmp_path: Path) -> Iterator[PdfTextExtractor]:
    """Real pipeline with the real Tesseract engine (`spa`)."""
    yield PdfTextExtractor(
        ocr=TesseractOcrEngine("spa"), max_pages=100
    )


def test_real_pdf_text_layer_extracted(real_extractor: PdfTextExtractor) -> None:
    text = real_extractor.extract_pdf(build_textual_pdf("Hola ResumeDoc"))

    assert "Hola ResumeDoc" in text


def test_real_pdf_mixed_falls_back_to_ocr(real_extractor: PdfTextExtractor) -> None:
    # Página 1 textual + página 2 sin texto: la 2 pasa por Tesseract.
    text = real_extractor.extract_pdf(
        build_textual_pdf("Hola ResumeDoc", blank_last_page=True)
    )

    assert text.startswith("Hola ResumeDoc")


def test_real_pdf_encrypted_is_rejected(real_extractor: PdfTextExtractor) -> None:
    with pytest.raises(EncryptedDocumentError):
        real_extractor.extract_pdf(encrypted_pdf())


def test_real_pdf_too_many_pages_is_rejected(real_extractor: PdfTextExtractor) -> None:
    with pytest.raises(TooManyPagesError):
        real_extractor.extract_pdf(many_pages_pdf(101))


def test_real_ocr_reads_word() -> None:
    engine = TesseractOcrEngine("spa")

    text = engine.recognize(image_png("RESUMEDOC"))

    assert "RESUMEDOC" in text.upper()


def test_real_ocr_blank_image_gives_empty_text() -> None:
    engine = TesseractOcrEngine("spa")

    assert engine.recognize(image_png(None)).strip() == ""


# --- Worker (T-14/T-16) --------------------------------------------------


def test_worker_task_registered_with_expected_name() -> None:
    assert process_document_task.name == PROCESS_TASK_NAME
