"""HTTP dependencies: typed access to the wired ports + caller resolution.

The composition root stores the adapters on `app.state`; these providers
expose them to the routers as typed application ports (never raw state).
"""

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.application.ports.document_repository import DocumentRepository
from src.application.ports.document_state_store import DocumentStateStore
from src.application.ports.file_storage import FileStorage
from src.application.ports.security import PasswordHasher, TokenService
from src.application.ports.summarization import Summarizer
from src.application.ports.task_queue import TaskQueue
from src.domain.user import AuthContext

_bearer_scheme = HTTPBearer(auto_error=False)
_UNAUTHORIZED_DETAIL = "Token de autenticación ausente o inválido."
# Cookie de sesión HttpOnly: el frontend usa `credentials: "include"` y
# `GET /auth/me`; no lee el token (cookies HttpOnly).
SESSION_COOKIE = "access_token"


def _session_token(request: Request, credentials: HTTPAuthorizationCredentials | None) -> str | None:
    """Bearer header has priority; otherwise the session cookie."""
    if credentials is not None:
        return credentials.credentials
    return request.cookies.get(SESSION_COOKIE)


def get_repository(request: Request) -> DocumentRepository:
    """Repository port wired at startup."""
    return request.app.state.repository


def get_password_hasher(request: Request) -> PasswordHasher:
    """Password hasher port wired at startup."""
    return request.app.state.password_hasher


def get_token_service(request: Request) -> TokenService:
    """Token service port wired at startup."""
    return request.app.state.token_service


def get_storage(request: Request) -> FileStorage:
    """Storage port wired at startup."""
    return request.app.state.storage


def get_task_queue(request: Request) -> TaskQueue:
    """Task queue port wired at startup."""
    return request.app.state.task_queue


def get_state_store(request: Request) -> DocumentStateStore:
    """Pipeline state store port wired at startup."""
    return request.app.state.state_store


def get_summarizer(request: Request) -> Summarizer:
    """Summarization port wired at startup."""
    return request.app.state.summarizer


def current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    tokens: TokenService = Depends(get_token_service),
) -> AuthContext:
    """Return the caller identity (cookie or bearer), or 401 when absent/invalid."""
    token = _session_token(request, credentials)
    if token is None:
        raise HTTPException(status_code=401, detail=_UNAUTHORIZED_DETAIL)
    context = tokens.decode_access_token(token)
    if context is None:
        raise HTTPException(status_code=401, detail=_UNAUTHORIZED_DETAIL)
    return context
