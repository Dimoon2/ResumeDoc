"""Persistence port (SDD/plan.md §4): users, documents, summaries, grants.

Admin/grant operations (T-A4) extend this same port; the real adapter is
external (T-18).
"""

from typing import Protocol

from src.domain.document import Document
from src.domain.user import User


class DocumentRepository(Protocol):
    """Persistence contract shared by the API and the worker.

    Nota: la interfaz NO está congelada (P-13/T-A4); las operaciones de
    admin y concesiones se añaden cuando se definan.
    """

    def create_user(self, user: User) -> User:
        """Store a new user and return it with the assigned id."""
        ...

    def get_user_by_email(self, email: str) -> User | None:
        """Return the user with that email, or None."""
        ...

    def get_user(self, user_id: int) -> User | None:
        """Return the user with that id, or None."""
        ...

    def create_document(self, document: Document) -> Document:
        """Store a new document and return it with the assigned id."""
        ...

    def get_document(self, document_id: int) -> Document | None:
        """Return the document with that id, or None.

        Sin filtro de dueño: la autorización (dueño/concesión/admin) la
        aplica la capa de aplicación antes de llamar.
        """
        ...

    def delete_document(self, document_id: int) -> None:
        """Remove the record (compensation when enqueue fails, CA-8b)."""
        ...

    def list_documents(self, owner_id: int | None = None) -> list[Document]:
        """Return documents, filtered by owner; `None` = all (admin)."""
        ...

    def rename_document(self, document_id: int, name: str) -> Document | None:
        """Change the display name of a document; None if it doesn't exist."""
        ...

    def update_location(self, document_id: int, location: str) -> None:
        """Point `ubicacion` at the processed text once the pipeline
        completes (team decision): the DB reference always names the
        current content file, not the original binary."""
        ...
