"""Redis adapter for the DocumentStateStore port (P-13: state in Redis).

shortcut: si Redis se vacía, los documentos vuelven a parecer `pending`
(no hay estado persistido); aceptado hasta que la BD defina columnas.
"""

from typing import cast

import redis

from src.domain.document import DocumentState, Status

_KEY = "resumedoc:doc:{document_id}"
_STATUSES: tuple[str, ...] = ("pending", "processing", "completed", "error")


class RedisDocumentStateStore:
    """Keeps one hash per document: status, text_path and error."""

    def __init__(self, url: str) -> None:
        self._redis = redis.Redis.from_url(url, decode_responses=True)

    def get(self, document_id: int) -> DocumentState | None:
        data = self._redis.hgetall(_KEY.format(document_id=document_id))
        if not data:
            return None
        status = data.get("status", "")
        if status not in _STATUSES:
            return None
        return DocumentState(
            status=cast(Status, status),
            text_path=str(data.get("text_path", "")),
            error=str(data.get("error", "")),
        )

    def set(self, document_id: int, state: DocumentState) -> None:
        self._redis.hset(
            _KEY.format(document_id=document_id),
            mapping={
                "status": state.status,
                "text_path": state.text_path,
                "error": state.error,
            },
        )

    def fail_processing(self, message: str) -> int:
        count = 0
        for key in self._redis.scan_iter(match="resumedoc:doc:*"):
            if self._redis.hget(key, "status") == "processing":
                self._redis.hset(key, mapping={"status": "error", "error": message})
                count += 1
        return count
