"""Queue port (SDD/plan.md §4): enqueue document processing tasks (T-09)."""

from typing import Protocol


class TaskQueue(Protocol):
    """Producer side of the processing pipeline."""

    def send_process_task(self, document_id: int) -> None:
        """Enqueue the processing of a document (consumed by the worker)."""
        ...
