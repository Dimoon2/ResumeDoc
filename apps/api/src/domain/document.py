"""Domain entities for documents (spec §4, entity `documento`).

Mirrors the DB entity of branch `data-base`: int id (assigned by the
repository), `nombre`, `ubicacion`, `peso` and `usuario_id`. No `status`
column: it is application-level state (D-24). Extracted/edited text is
persisted only on explicit user save (D-25) — its storage is pending
definition (P-13).
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

# Formats accepted at upload (CA-1); anything else is rejected (CA-2).
ALLOWED_EXTENSIONS = frozenset({".pdf", ".png", ".jpg", ".jpeg"})

# Pipeline statuses (D-16/D-24): application state, never a DB column.
Status = Literal["pending", "processing", "completed", "error"]


@dataclass(frozen=True)
class DocumentState:
    """Pipeline state of a document: lives in Redis, text lives in a temp
    folder referenced by `text_path` (P-13)."""

    status: Status
    text_path: str = ""
    error: str = ""


class InvalidTransitionError(Exception):
    """Illegal status transition of the state machine."""


class DocumentProcessingError(Exception):
    """Base of the extraction failures with a user-facing Spanish message."""


class EncryptedDocumentError(DocumentProcessingError):
    """Encrypted PDF (CA-3b)."""

    def __init__(self) -> None:
        super().__init__("El PDF está cifrado y no puede procesarse.")


class TooManyPagesError(DocumentProcessingError):
    """Over the page limit (D-17)."""

    def __init__(self, max_pages: int) -> None:
        super().__init__(
            f"El documento excede el límite de {max_pages} páginas."
        )


def begin_processing(state: DocumentState) -> DocumentState:
    """`pending → processing`; rejects any other origin state."""
    if state.status != "pending":
        raise InvalidTransitionError(
            f"No se puede procesar un documento en estado {state.status}."
        )
    return DocumentState("processing")


def complete(state: DocumentState, text_path: str) -> DocumentState:
    """`processing → completed`; empty text is a valid outcome, not an error
    (D-09): the text file is written even when it ends up empty."""
    if state.status != "processing":
        raise InvalidTransitionError(
            f"No se puede completar un documento en estado {state.status}."
        )
    return DocumentState("completed", text_path=text_path)


def fail(state: DocumentState, message: str) -> DocumentState:
    """`* → error` with a Spanish message from the error taxonomy (D-02)."""
    return DocumentState("error", text_path=state.text_path, error=message)


def can_edit(state: DocumentState) -> bool:
    """Editing policy (D-11): only completed documents are editable."""
    return state.status == "completed"


@dataclass(frozen=True)
class Document:
    """An uploaded document: metadata only, the text lives apart (D-25)."""

    name: str
    location: str
    size_bytes: int
    owner_id: int
    id: int = 0  # 0 = not yet persisted; the repository assigns the real id


class DocumentUploadError(Exception):
    """Base of the upload rejections (mapped to 4xx by the HTTP layer)."""


class UnsupportedDocumentFormat(DocumentUploadError):
    """Rejected extension (CA-2)."""

    def __init__(self, extension: str) -> None:
        label = extension if extension else "(sin extensión)"
        super().__init__(f"Formato de archivo no soportado: {label}.")


class EmptyDocument(DocumentUploadError):
    """Zero-byte file (CA-2)."""

    def __init__(self) -> None:
        super().__init__("El archivo está vacío.")


class DocumentTooLarge(DocumentUploadError):
    """Over the size limit (D-17)."""

    def __init__(self, max_mb: int) -> None:
        super().__init__(f"El archivo excede el límite de {max_mb} MB.")


def document_extension(filename: str) -> str:
    """Lowercased extension of a filename ("" when it has none)."""
    return Path(filename).suffix.lower()
