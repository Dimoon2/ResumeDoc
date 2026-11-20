"""Auth endpoints aligned to the frontend contract (feat/Landing-Page-and-Auth):

`POST /auth/login` / `POST /auth/register` → `{user}` + cookie HttpOnly;
`GET /auth/me` → `{user}` desde la cookie; `POST /auth/logout` → borra la
cookie. `POST /auth/refresh` se conserva (bearer, para clientes que no
usen cookies). Registro propio permitido (D-28).
"""

from fastapi import APIRouter, Depends, HTTPException, Response

from src.adapters.http.dependencies import (
    SESSION_COOKIE,
    current_user,
    get_password_hasher,
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
from src.application.ports.security import PasswordHasher, TokenService
from src.application.usecases import auth as auth_usecases
from src.core.config import get_settings
from src.domain.user import AuthContext, EmailAlreadyRegistered, User as DomainUser

router = APIRouter(prefix="/auth", tags=["auth"])


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


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=get_settings().jwt_access_ttl,
        httponly=True,
        samesite="lax",
        secure=get_settings().cookie_secure,
    )


@router.post("/login", response_model=AuthSessionResponse)
def login(
    payload: LoginRequest,
    response: Response,
    repository: DocumentRepository = Depends(get_repository),
    hasher: PasswordHasher = Depends(get_password_hasher),
    tokens: TokenService = Depends(get_token_service),
) -> AuthSessionResponse:
    """Exchange credentials for a session cookie + the user payload."""
    session = auth_usecases.login(
        repository, hasher, tokens, payload.email, payload.password
    )
    if session is None:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")
    user, access_token, _refresh = session  # refresh: para clientes bearer
    _set_cookie(response, access_token)
    return AuthSessionResponse(user=_user_response(user))


@router.post("/register", response_model=AuthSessionResponse, status_code=201)
def register(
    payload: RegisterRequest,
    response: Response,
    repository: DocumentRepository = Depends(get_repository),
    hasher: PasswordHasher = Depends(get_password_hasher),
    tokens: TokenService = Depends(get_token_service),
) -> AuthSessionResponse:
    """Self-registration (D-28): creates a `user` account and logs in."""
    try:
        user = auth_usecases.register_user(
            repository, hasher, payload.name, payload.email, payload.password
        )
    except EmailAlreadyRegistered as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    _set_cookie(response, tokens.create_access_token(user))
    return AuthSessionResponse(user=_user_response(user))


@router.get("/me", response_model=AuthSessionResponse)
def me(
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
) -> AuthSessionResponse:
    """Current session from the cookie; 401 → frontend treats as logged out."""
    return _session(repository, user.user_id)


@router.post("/logout", status_code=204)
def logout() -> Response:
    """Clear the session cookie."""
    response = Response(status_code=204)
    response.delete_cookie(SESSION_COOKIE)
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
    payload: RefreshRequest,
    repository: DocumentRepository = Depends(get_repository),
    tokens: TokenService = Depends(get_token_service),
) -> AccessTokenResponse:
    """Renew the access token from a valid refresh token (bearer flow)."""
    access_token = auth_usecases.refresh_access_token(
        repository,
        tokens,
        payload.refresh_token,
    )
    if access_token is None:
        raise HTTPException(
            status_code=401,
            detail="Token de actualización inválido o expirado.",
        )
    return AccessTokenResponse(access_token=access_token)
