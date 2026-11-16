"""State port (P-13): pipeline state of documents (status + text reference).

The state lives in Redis, NOT in the DB (D-24); the extracted text lives
in a temp folder and Redis only keeps its location (D-25).
"""

from typing import Protocol

from src.domain.document import DocumentState


class DocumentStateStore(Protocol):
    """Read/write access to the pipeline state, shared by API and worker."""

    def get(self, document_id: int) -> DocumentState | None:
        """Return the state of a document, or None when it has none."""
        ...

    def set(self, document_id: int, state: DocumentState) -> None:
        """Persist the state of a document."""
        ...

    def fail_processing(self, message: str) -> int:
        """Mark every document stuck in `processing` as error (D-16 orphans);
        return how many were marked."""
        ...
