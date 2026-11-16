"""Filesystem adapter for the FileStorage port (T-06)."""

import logging
from pathlib import Path
from uuid import uuid4

logger = logging.getLogger(__name__)

_TEXT_SUBDIR = "text"


class FilesystemStorage:
    """Stores binaries under a root directory with `{uuid}.{ext}` names and
    extracted text in a `{root}/text` temp folder (P-13)."""

    def __init__(self, root: Path) -> None:
        self._root = root
        root.mkdir(parents=True, exist_ok=True)

    def save(self, extension: str, content: bytes) -> str:
        name = f"{uuid4().hex}{extension}"
        (self._root / name).write_bytes(content)
        return name

    def read(self, location: str) -> bytes:
        return (self._root / location).read_bytes()

    def save_text(self, content: str) -> str:
        text_dir = self._root / _TEXT_SUBDIR
        text_dir.mkdir(exist_ok=True)
        name = f"{uuid4().hex}.txt"
        (text_dir / name).write_text(content, encoding="utf-8")
        return f"{_TEXT_SUBDIR}/{name}"

    def read_text(self, location: str) -> str:
        return (self._root / location).read_text(encoding="utf-8")

    def write_text(self, location: str, content: str) -> None:
        (self._root / location).write_text(content, encoding="utf-8")

    def delete(self, location: str) -> None:
        try:
            (self._root / location).unlink(missing_ok=True)
        except OSError:
            logger.warning("No se pudo eliminar el archivo %s", location)
