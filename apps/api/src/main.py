"""API composition root.

This module wires the real adapters into the application core
(SDD/plan.md §2: the only allowed composition point together with
the worker startup).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from src.adapters.http.auth import router as auth_router
from src.adapters.http.documents import router as documents_router
from src.adapters.http.router import router as http_router
from src.adapters.persistence.memory import (
    InMemoryDocumentRepository,
    InMemoryRefreshTokenRepository,
)
from src.adapters.persistence.redis_state import RedisDocumentStateStore
from src.adapters.persistence.sqlmodel_refresh_repo import (
    SQLModelRefreshTokenRepository,
)
from src.adapters.persistence.sqlmodel_repo import SQLModelDocumentRepository
from src.adapters.security.bcrypt_adapter import BcryptPasswordHasher
from src.adapters.security.jwt_adapter import JwtTokenService
from src.adapters.storage.filesystem import FilesystemStorage
from src.adapters.workers.queue import CeleryTaskQueue, create_celery_app
from src.application.usecases.auth import bootstrap_admin
from src.core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup: validate settings, wire adapters and seed the first admin."""
    try:
        settings = get_settings()
    except ValidationError as exc:
        raise RuntimeError(
            "Configuración incompleta: define TODAS las variables "
            "obligatorias en el entorno o en un archivo .env (véase "
            ".env.example). Ninguna variable tiene valor por defecto."
        ) from exc
    Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)

    # T-18: `DATABASE_URL=memory://` selecciona el doble para tests; una URL
    # real usa el adaptador SQLModel de la rama data-base.
    if settings.database_url == "memory://":
        app.state.repository = InMemoryDocumentRepository()
        app.state.refresh_repository = InMemoryRefreshTokenRepository()
    else:
        app.state.repository = SQLModelDocumentRepository(settings.database_url)
        app.state.refresh_repository = SQLModelRefreshTokenRepository(
            settings.database_url
        )
    app.state.password_hasher = BcryptPasswordHasher()
    app.state.storage = FilesystemStorage(Path(settings.storage_dir))
    app.state.task_queue = CeleryTaskQueue(create_celery_app(settings.redis_url))
    app.state.state_store = RedisDocumentStateStore(settings.redis_url)
    app.state.token_service = JwtTokenService(
        secret=settings.jwt_secret,
        access_ttl=settings.jwt_access_ttl,
        refresh_ttl=settings.jwt_refresh_ttl,
    )
    bootstrap_admin(
        app.state.repository,
        app.state.password_hasher,
        settings.admin_email,
        settings.admin_password,
    )
    yield


def create_app() -> FastAPI:
    """Build the FastAPI application with all adapters plugged in."""
    application = FastAPI(
        title="ResumeDoc API",
        description="Backend de ResumeDoc: carga de documentos, OCR y resúmenes.",
        version="0.1.0",
        lifespan=lifespan,
    )
    try:
        cors_origins = get_settings().cors_origins.split(",")
    except ValidationError:
        # La validación real ocurre en el lifespan con su mensaje en español.
        cors_origins = []
    # Cookies con credenciales: el frontend envía `credentials: "include"`.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(http_router)
    application.include_router(auth_router)
    application.include_router(documents_router)
    return application


app = create_app()
