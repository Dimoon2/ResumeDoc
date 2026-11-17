"""Celery/Redis adapter for the TaskQueue port (T-09)."""

from celery import Celery

# Name of the task the worker will register (Fase 3). The producer only
# references it by name: it never imports the worker's code.
PROCESS_TASK_NAME = "resumedoc.process_document"


def create_celery_app(broker_url: str) -> Celery:
    """Celery app of the API (producer only; connections are lazy)."""
    return Celery("resumedoc", broker=broker_url)


class CeleryTaskQueue:
    """Sends process tasks to the Celery broker."""

    def __init__(self, celery_app: Celery) -> None:
        self._app = celery_app

    def send_process_task(self, document_id: int) -> None:
        self._app.send_task(PROCESS_TASK_NAME, args=[document_id])
