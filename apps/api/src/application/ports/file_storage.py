"""Storage port (SDD/plan.md §4): binary files of the documents."""

from typing import Protocol


class FileStorage(Protocol):
    """Persists document binaries; locations are opaque to the application."""

    def save(self, extension: str, content: bytes) -> str:
        """Store the bytes under a fresh `{uuid}.{ext}` name; return its location."""
        ...

    def read(self, location: str) -> bytes:
        """Return the bytes stored at a location."""
        ...

    def save_text(self, content: str) -> str:
        """Store extracted text in the temp folder; return its location (D-25)."""
        ...

    def read_text(self, location: str) -> str:
        """Return the text stored at a location."""
        ...

    def delete(self, location: str) -> None:
        """Remove a stored file; failures are logged, never raised."""
        ...
