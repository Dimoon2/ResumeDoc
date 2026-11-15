"""Task queue tests (T-09): port doubles and the Celery producer adapter."""

from celery import Celery

from src.adapters.workers.memory import EagerTaskQueue
from src.adapters.workers.queue import PROCESS_TASK_NAME, CeleryTaskQueue, create_celery_app


def test_eager_double_records_sent_ids() -> None:
    queue = EagerTaskQueue()

    queue.send_process_task(1)
    queue.send_process_task(2)

    assert queue.sent == [1, 2]


def test_celery_adapter_sends_by_task_name(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_send_task(
        self: Celery, name: str, args: list[int] | None = None, **kwargs: object
    ) -> None:
        captured["name"] = name
        captured["args"] = args

    monkeypatch.setattr(Celery, "send_task", fake_send_task)
    queue = CeleryTaskQueue(create_celery_app("memory://"))

    queue.send_process_task(7)

    assert captured == {"name": PROCESS_TASK_NAME, "args": [7]}
