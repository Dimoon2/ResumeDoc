"""Summarization use case: generate a summary from a completed document.

Coordinates the repository (existence check), state store (text availability),
storage (read extracted text) and summarizer (port). Authorization
(owner/admin) is enforced by the HTTP layer before calling this use case.
"""

from src.application.ports.document_repository import DocumentRepository
from src.application.ports.document_state_store import DocumentStateStore
from src.application.ports.file_storage import FileStorage
from src.application.ports.summarization import (
    SummaryResult,
    Summarizer,
    SynthesisDepth,
)


class DocumentNotCompleted(Exception):
    """The document has not finished processing; no text to summarize."""


class DocumentNotFound(Exception):
    """The document does not exist."""


def summarize_document(
    *,
    repository: DocumentRepository,
    state_store: DocumentStateStore,
    storage: FileStorage,
    summarizer: Summarizer,
    document_id: int,
    depth: SynthesisDepth,
) -> SummaryResult:
    """Build a `SummaryResult` from the extracted text of `document_id`.

    Raises `DocumentNotFound` when the document is unknown, and
    `DocumentNotCompleted` when the pipeline has not finished successfully.
    """
    document = repository.get_document(document_id)
    if document is None:
        raise DocumentNotFound("Documento no encontrado.")
    state = state_store.get(document_id)
    if state is None or state.status != "completed":
        raise DocumentNotCompleted(
            "El documento no tiene texto extraído disponible aún."
        )
    text = storage.read_text(state.text_path) if state.text_path else ""
    return summarizer.summarize(text, depth)
