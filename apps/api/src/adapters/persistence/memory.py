"""In-memory double of DocumentRepository for tests and local runs (T-07).

shortcut: los datos viven solo en memoria y se pierden al reiniciar;
sustituir por el adaptador real de persistencia en T-18.
"""

from dataclasses import replace

from src.domain.document import Document, DocumentState, fail
from src.domain.user import User


class InMemoryDocumentRepository:
    """Keeps users and documents in dictionaries (T-07)."""

    def __init__(self) -> None:
        self._next_user_id: int = 1
        self._users_by_id: dict[int, User] = {}
        self._users_by_email: dict[str, User] = {}
        self._next_document_id: int = 1
        self._documents_by_id: dict[int, Document] = {}

    def create_user(self, user: User) -> User:
        # shortcut: contador simple; el adaptador real usa el PK autoincremental (T-18)
        persisted = replace(user, id=self._next_user_id)
        self._next_user_id += 1
        self._users_by_id[persisted.id] = persisted
        self._users_by_email[persisted.email] = persisted
        return persisted

    def get_user_by_email(self, email: str) -> User | None:
        return self._users_by_email.get(email)

    def get_user(self, user_id: int) -> User | None:
        return self._users_by_id.get(user_id)

    def create_document(self, document: Document) -> Document:
        # shortcut: contador simple; el adaptador real usa el PK autoincremental (T-18)
        persisted = replace(document, id=self._next_document_id)
        self._next_document_id += 1
        self._documents_by_id[persisted.id] = persisted
        return persisted

    def get_document(self, document_id: int) -> Document | None:
        return self._documents_by_id.get(document_id)

    def delete_document(self, document_id: int) -> None:
        self._documents_by_id.pop(document_id, None)


class InMemoryDocumentStateStore:
    """Keeps pipeline states in a dictionary (double for tests)."""

    def __init__(self) -> None:
        self._states: dict[int, DocumentState] = {}

    def get(self, document_id: int) -> DocumentState | None:
        return self._states.get(document_id)

    def set(self, document_id: int, state: DocumentState) -> None:
        self._states[document_id] = state

    def fail_processing(self, message: str) -> int:
        count = 0
        for document_id, state in self._states.items():
            if state.status == "processing":
                self._states[document_id] = fail(state, message)
                count += 1
        return count
