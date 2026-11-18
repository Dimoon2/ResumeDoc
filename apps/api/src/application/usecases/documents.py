"""Document use cases: UploadDocument (T-08) and ProcessDocument (T-14)."""

from src.application.ports.document_repository import DocumentRepository
from src.application.ports.document_state_store import DocumentStateStore
from src.application.ports.extraction import OcrEngine, TextExtractor
from src.application.ports.file_storage import FileStorage
from src.application.ports.task_queue import TaskQueue
from src.domain.document import (
    ALLOWED_EXTENSIONS,
    Document,
    DocumentProcessingError,
    DocumentState,
    DocumentTooLarge,
    EmptyDocument,
    UnsupportedDocumentFormat,
    begin_processing,
    complete,
    document_extension,
    fail,
)


def upload_document(
    storage: FileStorage,
    repository: DocumentRepository,
    queue: TaskQueue,
    filename: str,
    content: bytes,
    owner_id: int,
    max_mb: int,
) -> Document:
    """Validate, store the binary, create the record and enqueue (CA-1/CA-2)."""
    extension = document_extension(filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise UnsupportedDocumentFormat(extension)
    if not content:
        raise EmptyDocument()
    if len(content) > max_mb * 1024 * 1024:
        raise DocumentTooLarge(max_mb)

    location = storage.save(extension, content)
    try:
        document = repository.create_document(
            Document(
                name=filename,
                location=location,
                size_bytes=len(content),
                owner_id=owner_id,
            )
        )
    except Exception:
        # Registro fallido → binario huérfano: purgarlo (CA-8b).
        storage.delete(location)
        raise
    try:
        queue.send_process_task(document.id)
    except Exception:
        # Enqueue fallido → registro + binario huérfanos: compensar (CA-8b).
        repository.delete_document(document.id)
        storage.delete(location)
        raise
    return document


def process_document(
    repository: DocumentRepository,
    storage: FileStorage,
    states: DocumentStateStore,
    pdf_extractor: TextExtractor,
    ocr: OcrEngine,
    document_id: int,
) -> None:
    """Extract the text of a document and store it in the storage folder
    (T-14) — automatically, no user action needed: the flow is upload →
    OCR → save → view. On completion the DB reference `ubicacion` is
    repointed at the processed text and the original binary is deleted
    (team decision: the text is the only content kept). State transitions
    live in the state store (D-24). Empty text completes normally (D-09).
    """
    document = repository.get_document(document_id)
    if document is None:
        return
    state = states.get(document_id) or DocumentState("pending")
    if state.status != "pending":
        return  # ya procesado o en curso: no reprocesar
    processing = begin_processing(state)
    states.set(document_id, processing)
    try:
        data = storage.read(document.location)
        if document_extension(document.location) == ".pdf":
            text = pdf_extractor.extract_pdf(data)
        else:
            text = ocr.recognize(data)
        text_path = storage.save_text(text)
        repository.update_location(document_id, text_path)
        storage.delete(document.location)  # el binario ya no se necesita
    except DocumentProcessingError as exc:
        states.set(document_id, fail(processing, str(exc)))
        return
    except Exception:
        # Fallo inesperado: mensaje genérico en español, sin filtrar el traceback.
        states.set(document_id, fail(processing, "Error al procesar el documento."))
        return
    states.set(document_id, complete(processing, text_path))
