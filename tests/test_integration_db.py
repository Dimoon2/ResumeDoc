"""Integration tests against the real PostgreSQL and Redis (T-18/T-19).

Por defecto usan la infraestructura del `.env` (DATABASE_URL/REDIS_URL).
Para apuntar a otra (p. ej. una BD de pruebas), sobreescríbela:

    INTEGRATION_DATABASE_URL=postgresql://resumedoc:resumedoc@localhost:5434/resumedoc_test \
    INTEGRATION_REDIS_URL=redis://localhost:6379/0 .venv/bin/pytest tests/test_integration_db.py
"""

import os

import pytest
from sqlalchemy import create_engine, delete
from sqlmodel import Session

from db.models import User as OrmUser
from src.adapters.persistence.redis_state import RedisDocumentStateStore
from src.adapters.persistence.sqlmodel_repo import SQLModelDocumentRepository
from src.core.config import get_settings
from src.domain.document import Document, DocumentState
from src.domain.user import new_user

try:
    _settings = get_settings()
except Exception:  # sin .env completo: queda en skip, como antes
    _settings = None

DB_URL = os.environ.get("INTEGRATION_DATABASE_URL", "") or (
    _settings.database_url if _settings else ""
)
REDIS_URL = os.environ.get("INTEGRATION_REDIS_URL", "") or (
    _settings.redis_url if _settings else ""
)

pytestmark = pytest.mark.skipif(
    not DB_URL or not REDIS_URL,
    reason="infra de integración no disponible (define DATABASE_URL/REDIS_URL en .env o INTEGRATION_*)",
)

_ORPHAN_MESSAGE = "Procesamiento interrumpido por un reinicio del worker."


def _delete_user_by_email(email: str) -> None:
    """Limpieza: borra el usuario (el FK CASCADE arrastra sus documentos)."""
    engine = create_engine(DB_URL)
    with Session(engine) as session:
        session.exec(delete(OrmUser).where(OrmUser.correo == email))  # type: ignore[call-overload]
        session.commit()


def test_repository_roundtrip_and_role_mapping() -> None:
    repository = SQLModelDocumentRepository(DB_URL)
    email = "integracion@correo.com"
    _delete_user_by_email(email)
    try:
        admin = repository.create_user(
            new_user(email, "hash", role="admin", name="Integracion")
        )
        assert admin.id > 0

        found = repository.get_user_by_email(email)
        assert found is not None and found.role == "admin"

        plain = repository.create_user(
            new_user("user_integracion@correo.com", "hash", role="user")
        )
        found_plain = repository.get_user(plain.id)
        assert found_plain is not None
        assert found_plain.role == "user"  # noadmin ≡ user (D-27)

        document = repository.create_document(
            Document(
                name="int.pdf", location="int.pdf", size_bytes=10, owner_id=admin.id
            )
        )
        stored = repository.get_document(document.id)
        assert stored is not None
        assert stored.name == "int.pdf" and stored.owner_id == admin.id
    finally:
        _delete_user_by_email(email)
        _delete_user_by_email("user_integracion@correo.com")


def test_duplicate_email_rejected_by_database() -> None:
    repository = SQLModelDocumentRepository(DB_URL)
    email = "duplicado@correo.com"
    _delete_user_by_email(email)
    try:
        repository.create_user(new_user(email, "hash"))
        with pytest.raises(Exception):  # IntegrityError del unique de correo
            repository.create_user(new_user(email, "otra-hash"))
    finally:
        _delete_user_by_email(email)


def test_worker_restart_orphans_become_error_and_data_intact() -> None:
    """T-19: API+worker reinician a mitad de proceso → huérfano en `error`,
    y los datos del documento y del dueño quedan intactos en la BD."""
    repository = SQLModelDocumentRepository(DB_URL)
    states = RedisDocumentStateStore(REDIS_URL)
    email = "huérfano@correo.com"
    _delete_user_by_email(email)
    try:
        user = repository.create_user(new_user(email, "hash"))
        document = repository.create_document(
            Document(name="h.pdf", location="h.pdf", size_bytes=1, owner_id=user.id)
        )
        states.set(document.id, DocumentState("processing"))

        count = states.fail_processing(_ORPHAN_MESSAGE)

        assert count >= 1
        state = states.get(document.id)
        assert state is not None and state.status == "error"
        assert _ORPHAN_MESSAGE in state.error
        # Datos intactos tras el reinicio.
        assert repository.get_document(document.id) is not None
        assert repository.get_user(user.id) is not None
    finally:
        _delete_user_by_email(email)
