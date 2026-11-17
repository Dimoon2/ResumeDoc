"""Authentication use cases: Login, RefreshToken and admin bootstrap (T-04)."""

from src.application.ports.document_repository import DocumentRepository
from src.application.ports.security import PasswordHasher, TokenService
from src.domain.user import EmailAlreadyRegistered, User as DomainUser, new_user


def login(
    repository: DocumentRepository,
    hasher: PasswordHasher,
    tokens: TokenService,
    email: str,
    password: str,
) -> tuple[DomainUser, str, str] | None:
    """Return (user, access, refresh), or None for wrong credentials."""
    user = repository.get_user_by_email(email)
    if user is None or not hasher.verify(password, user.password_hash):
        return None
    return user, tokens.create_access_token(user), tokens.create_refresh_token(user)


def register_user(
    repository: DocumentRepository,
    hasher: PasswordHasher,
    name: str,
    email: str,
    password: str,
) -> DomainUser:
    """Self-registration (D-28): role user; only sees own documents."""
    if repository.get_user_by_email(email) is not None:
        raise EmailAlreadyRegistered()
    # El duplicado por carrera lo detecta el adaptador real (unique de BD).
    return repository.create_user(
        new_user(email, hasher.hash(password), name=name)
    )


def refresh_access_token(
    repository: DocumentRepository,
    tokens: TokenService,
    refresh_token: str,
) -> str | None:
    """Return a new access token, or None when the refresh token is invalid."""
    context = tokens.decode_refresh_token(refresh_token)
    if context is None:
        return None
    # The fresh role claim comes from the current repository state (D-23).
    user = repository.get_user(context.user_id)
    if user is None:
        return None
    return tokens.create_access_token(user)


def bootstrap_admin(
    repository: DocumentRepository,
    hasher: PasswordHasher,
    email: str,
    password: str,
) -> None:
    """Seed the first admin from env vars; never via an endpoint (D-22)."""
    if not email or not password:
        return
    if repository.get_user_by_email(email) is not None:
        return
    repository.create_user(new_user(email, hasher.hash(password), role="admin"))
