"""In-memory double of TaskQueue for tests (eager mode, T-10).

shortcut: registra las tareas en una lista en vez de enviarlas a un
broker; equivale al modo ALWAYS_EAGER de Celery para determinismo.
"""

from src.application.ports.task_queue import TaskQueue


class EagerTaskQueue:
    """Records the enqueued document ids instead of sending them."""

    def __init__(self) -> None:
        self.sent: list[int] = []

    def send_process_task(self, document_id: int) -> None:
        self.sent.append(document_id)
