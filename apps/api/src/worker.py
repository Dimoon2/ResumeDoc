"""Worker composition root (T-14): registers the `process_document` task.

This is the second allowed composition point (SDD/plan.md §2). Run with:
`../../.venv/bin/celery -A src.worker:celery_app worker --loglevel=info`
(desde `apps/api`; el entorno vive en la raíz del repo).
"""

import logging

from celery import Celery
from celery.exceptions import SoftTimeLimitExceeded
from celery.signals import worker_ready

from src.adapters.extraction.pdf_pipeline import PdfTextExtractor
from src.adapters.extraction.tesseract import TesseractOcrEngine
from src.adapters.persistence.memory import InMemoryDocumentRepository
from src.adapters.persistence.redis_state import RedisDocumentStateStore
from src.adapters.persistence.sqlmodel_repo import SQLModelDocumentRepository
from src.adapters.storage.filesystem import FilesystemStorage
from src.adapters.workers.queue import PROCESS_TASK_NAME, create_celery_app
from src.application.usecases.documents import process_document
from src.core.config import get_settings
from src.domain.document import DocumentState, fail
from pathlib import Path

logger = logging.getLogger(__name__)

settings = get_settings()
celery_app = create_celery_app(settings.redis_url)

# Real adapters of the worker side (T-18: misma selección que la API).
if settings.database_url == "memory://":
    repository = InMemoryDocumentRepository()
else:
    repository = SQLModelDocumentRepository(settings.database_url)
storage = FilesystemStorage(Path(settings.storage_dir))
states = RedisDocumentStateStore(settings.redis_url)
ocr_engine = TesseractOcrEngine(settings.ocr_lang)
pdf_extractor = PdfTextExtractor(ocr=ocr_engine, max_pages=settings.max_pdf_pages)


@celery_app.task(name=PROCESS_TASK_NAME, soft_time_limit=settings.process_timeout_s)
def process_document_task(document_id: int) -> None:
    """Pipeline task: extract text and update the state store (CA-7)."""
    state = states.get(document_id)
    try:
        process_document(
            repository,
            storage,
            states,
            pdf_extractor,
            ocr_engine,
            document_id=document_id,
        )
    except SoftTimeLimitExceeded:
        # CA-9: timeout controlado, nunca un 500 ni un estado colgado.
        states.set(
            document_id,
            fail(
                state or DocumentState("pending"),
                f"Tiempo de procesamiento agotado ({settings.process_timeout_s} s).",
            ),
        )


@worker_ready.connect
def fail_orphaned_documents(**_: object) -> None:
    """Startup hook (D-16): documents stuck in `processing` → error."""
    count = states.fail_processing(
        "Procesamiento interrumpido por un reinicio del worker."
    )
    if count:
        logger.warning("Huérfanos en processing marcados como error: %d", count)
