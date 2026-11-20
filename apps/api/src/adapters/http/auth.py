"""Auth endpoints aligned to the frontend contract (feat/Landing-Page-and-Auth):

`POST /auth/login` / `POST /auth/register` → `{user}` + `access_token` and
`refresh_token` HttpOnly cookies; `GET /auth/me` → `{user}` from the access
cookie; `POST /auth/refresh` rotates the refresh cookie (or body) and renews
both cookies; `POST /auth/logout` revokes the family and clears both cookies.
Registro propio permitido (D-28).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from src.adapters.http.dependencies import (
    REFRESH_COOKIE,
    SESSION_COOKIE,
    current_user,
    get_password_hasher,
    get_refresh_repository,
    get_repository,
    get_token_service,
)
from src.adapters.http.schemas import (
    AccessTokenResponse,
    AuthSessionResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    UserResponse,
)
from src.application.ports.document_repository import DocumentRepository
from src.application.ports.refresh_token_repository import RefreshTokenRepository
from src.application.ports.security import PasswordHasher, TokenService
from src.application.usecases import auth as auth_usecases
from src.core.config import get_settings
from src.domain.refresh_token import RefreshTokenError, TokenPair
from src.domain.user import AuthContext, EmailAlreadyRegistered, User as DomainUser

router = APIRouter(prefix="/auth", tags=["auth"])

# El refresh solo se envía a rutas bajo su propio prefijo.
_REFRESH_COOKIE_PATH = "/auth"


def _user_response(user: DomainUser) -> UserResponse:
    """User payload exactly as the frontend expects it."""
    return UserResponse(id=user.id, name=user.name, email=user.email)


def _session(repository: DocumentRepository, user_id: int) -> AuthSessionResponse:
    """Fresh `{user}` read (me); 401 if the user vanished from the BD."""
    user = repository.get_user(user_id)
    if user is None:
        raise HTTPException(
            status_code=401, detail="La sesión ya no es válida."
        )
    return AuthSessionResponse(user=_user_response(user))


def _set_session_cookies(response: Response, pair: TokenPair) -> None:
    """Set both HttpOnly cookies; the refresh one uses the remaining lifetime."""
    settings = get_settings()
    response.set_cookie(
        SESSION_COOKIE,
        pair.access,
        max_age=settings.jwt_access_ttl,
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
    )
    max_age = 0
    if pair.refresh_expires_at is not None:
        remaining = pair.refresh_expires_at - datetime.now(timezone.utc)
        max_age = max(0, int(remaining.total_seconds()))
    response.set_cookie(
        REFRESH_COOKIE,
        pair.refresh,
        max_age=max_age,
        path=_REFRESH_COOKIE_PATH,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
    )


def _clear_session_cookies(response: Response) -> None:
    """Delete both cookies with the same paths they were created with."""
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path=_REFRESH_COOKIE_PATH)


def _raw_refresh(request: Request, payload: RefreshRequest | None) -> str | None:
    """Body wins (bearer clients); otherwise the HttpOnly cookie."""
    if payload is not None and payload.refresh_token:
        return payload.refresh_token
    return request.cookies.get(REFRESH_COOKIE)


@router.post("/login", response_model=AuthSessionResponse)
def login(
    payload: LoginRequest,
    response: Response,
    repository: DocumentRepository = Depends(get_repository),
    hasher: PasswordHasher = Depends(get_password_hasher),
    tokens: TokenService = Depends(get_token_service),
    refresh_repo: RefreshTokenRepository = Depends(get_refresh_repository),
) -> AuthSessionResponse:
    """Exchange credentials for a session cookie + the user payload."""
    session = auth_usecases.login(
        repository,
        hasher,
        tokens,
        refresh_repo,
        payload.email,
        payload.password,
    )
    if session is None:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")
    user, pair = session
    _set_session_cookies(response, pair)
    return AuthSessionResponse(user=_user_response(user))


@router.post("/register", response_model=AuthSessionResponse, status_code=201)
def register(
    payload: RegisterRequest,
    response: Response,
    repository: DocumentRepository = Depends(get_repository),
    hasher: PasswordHasher = Depends(get_password_hasher),
    tokens: TokenService = Depends(get_token_service),
    refresh_repo: RefreshTokenRepository = Depends(get_refresh_repository),
) -> AuthSessionResponse:
    """Self-registration (D-28): creates a `user` account and logs in."""
    try:
        user = auth_usecases.register_user(
            repository, hasher, payload.name, payload.email, payload.password
        )
    except EmailAlreadyRegistered as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    pair = auth_usecases.issue_session(user, refresh_repo, tokens)
    _set_session_cookies(response, pair)
    return AuthSessionResponse(user=_user_response(user))


@router.get("/me", response_model=AuthSessionResponse)
def me(
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
) -> AuthSessionResponse:
    """Current session from the cookie; 401 → frontend treats as logged out."""
    return _session(repository, user.user_id)


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    payload: RefreshRequest | None = None,
    refresh_repo: RefreshTokenRepository = Depends(get_refresh_repository),
    tokens: TokenService = Depends(get_token_service),
) -> Response:
    """Revoke the session family (cookie or body) and clear both cookies."""
    auth_usecases.logout_session(
        refresh_repo, tokens, _raw_refresh(request, payload)
    )
    response = Response(status_code=204)
    _clear_session_cookies(response)
    return response


@router.post("/forgot-password", status_code=202)
def forgot_password(payload: ForgotPasswordRequest) -> dict[str, str]:
    """Accept the request without revealing whether the correo exists.

    shortcut: sin flujo de correo ni pantalla de reset; hoy solo responde
    genérico (contrato del front). El token/reset real llega con el email.
    """
    return {"detail": "Si el correo está asociado a una cuenta, recibirás instrucciones."}


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(
    request: Request,
    response: Response,
    payload: RefreshRequest | None = None,
    repository: DocumentRepository = Depends(get_repository),
    tokens: TokenService = Depends(get_token_service),
    refresh_repo: RefreshTokenRepository = Depends(get_refresh_repository),
) -> AccessTokenResponse:
    """Rotate the refresh token from the body (bearer) or the cookie."""
    raw_refresh = _raw_refresh(request, payload)
    if raw_refresh is None:
        raise HTTPException(
            status_code=401,
            detail="Token de actualización inválido o expirado.",
        )
    try:
        _user, pair = auth_usecases.rotate_session(
            refresh_repo,
            repository,
            tokens,
            raw_refresh,
        )
    except RefreshTokenError:
        raise HTTPException(
            status_code=401,
            detail="Token de actualización inválido o expirado.",
        )
    _set_session_cookies(response, pair)
    return AccessTokenResponse(access_token=pair.access)
