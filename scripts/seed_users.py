"""Siembra usuarios en la base de datos real (idempotente: solo crea).

Lee `DATABASE_URL` del `.env` de la raíz del repo (no necesita el resto de
variables de la API), así que funciona desde cualquier directorio:

    PYTHONPATH=apps/api .venv/bin/python -m scripts.seed_users --dry-run
    PYTHONPATH=apps/api .venv/bin/python -m scripts.seed_users

Las contraseñas nunca viven en el JSON: se resuelven desde la variable
indicada en `password_env` (o `SEED_PASSWORD`), primero en el entorno y luego
en `./.env`; si falta, se piden por consola con `getpass`. El script no
actualiza usuarios existentes.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from dotenv import dotenv_values
from pydantic import ValidationError, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from src.adapters.persistence.sqlmodel_repo import SQLModelDocumentRepository
from src.adapters.security.bcrypt_adapter import BcryptPasswordHasher
from src.application.ports.document_repository import DocumentRepository
from src.application.ports.security import PasswordHasher
from src.domain.user import EmailAlreadyRegistered, Role, new_user

REPO_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = REPO_ROOT / ".env"
DEFAULT_SEEDS_FILE = Path(__file__).resolve().parent / "seeds" / "users.json"
SHARED_PASSWORD_ENV = "SEED_PASSWORD"
MIN_PASSWORD_LENGTH = 8
VALID_ROLES: tuple[Role, ...] = ("user", "admin")

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SeedError(Exception):
    """Error de configuración o de datos: se reporta con código 2."""


class SeedSettings(BaseSettings):
    """Configuración mínima de la semilla: solo la base de datos.

    Lee siempre `./.env` (raíz del repo); el resto de variables se ignoran,
    así que no hace falta el `.env` completo de la API para sembrar.
    """

    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    database_url: str = ""

    @field_validator("database_url")
    @classmethod
    def require_database_url(cls, value: str) -> str:
        if not str(value).strip():
            raise ValueError(
                "DATABASE_URL no está configurado en ./.env ni en el entorno."
            )
        return str(value).strip()


@dataclass(frozen=True)
class SeedUser:
    """Usuario a sembrar, tal como viene del JSON o de los flags."""

    email: str
    name: str
    role: Role = "user"
    password_env: str = ""


def _env_file_value(key: str) -> str:
    """Lee una variable del `./.env` sin exportarla al proceso."""
    try:
        return dotenv_values(ENV_FILE).get(key, "") or ""
    except OSError:
        return ""


class PasswordResolver:
    """Obtiene la contraseña del entorno, del `.env` o la pide una sola vez."""

    def __init__(self) -> None:
        self._cache: dict[str, str] = {}

    def resolve(self, env_name: str) -> str:
        key = env_name or SHARED_PASSWORD_ENV
        if key in self._cache:
            return self._cache[key]
        value = os.environ.get(key, "") or _env_file_value(key)
        if not value:
            try:
                value = getpass.getpass(f"Contraseña para {key}: ")
            except EOFError as exc:
                raise SeedError(
                    f"No se pudo leer la contraseña de {key}: define la "
                    "variable de entorno o ejecuta el script en una terminal."
                ) from exc
        if len(value) < MIN_PASSWORD_LENGTH:
            raise SeedError(
                f"La contraseña de {key} debe tener al menos "
                f"{MIN_PASSWORD_LENGTH} caracteres."
            )
        self._cache[key] = value
        return value


def _validate_email(value: object, position: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise SeedError(f"Semilla #{position}: falta el correo.")
    email = value.strip()
    if not _EMAIL_RE.match(email):
        raise SeedError(f"Semilla #{position}: correo inválido: {email!r}.")
    return email


def _validate_name(value: object, position: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise SeedError(f"Semilla #{position}: falta el nombre.")
    return value.strip()


def _validate_role(value: object, position: int) -> Role:
    role = "user" if value is None else value
    if role not in VALID_ROLES:
        raise SeedError(
            f"Semilla #{position}: rol inválido {role!r} (usa user o admin)."
        )
    return role  # type: ignore[return-value]


def _validate_password_env(value: object, position: int) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise SeedError(f"Semilla #{position}: password_env debe ser texto.")
    return value.strip()


def load_seeds(path: Path) -> list[SeedUser]:
    """Carga y valida el JSON de semillas (sin contraseñas)."""
    try:
        raw_data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SeedError(f"No existe el archivo de semillas: {path}") from exc
    except json.JSONDecodeError as exc:
        raise SeedError(f"JSON inválido en {path}: {exc}") from exc

    if not isinstance(raw_data, list) or not raw_data:
        raise SeedError("El archivo de semillas debe ser una lista no vacía.")

    seeds: list[SeedUser] = []
    seen: set[str] = set()
    for position, raw in enumerate(raw_data, start=1):
        if not isinstance(raw, dict):
            raise SeedError(f"Semilla #{position}: debe ser un objeto JSON.")
        seed = SeedUser(
            email=_validate_email(raw.get("email"), position),
            name=_validate_name(raw.get("name"), position),
            role=_validate_role(raw.get("role"), position),
            password_env=_validate_password_env(raw.get("password_env"), position),
        )
        if seed.email in seen:
            raise SeedError(f"Correo duplicado en el archivo: {seed.email}.")
        seen.add(seed.email)
        seeds.append(seed)
    return seeds


def _normalize_database_url(database_url: str) -> str:
    """Usa el driver psycopg v3 aunque la URL venga sin `+psycopg`."""
    prefix = "postgresql://"
    if database_url.startswith(prefix):
        return "postgresql+psycopg://" + database_url[len(prefix) :]
    return database_url


def build_repository(database_url: str) -> DocumentRepository:
    """Crea el repositorio real, rechazando URLs de memoria o no PostgreSQL."""
    if not database_url or database_url.startswith("memory://"):
        raise SeedError(
            "DATABASE_URL apunta a memory://: la semilla necesita una BD real."
        )
    database_url = _normalize_database_url(database_url)
    if not database_url.startswith("postgresql+psycopg://"):
        raise SeedError(
            "DATABASE_URL debe ser una URL de PostgreSQL "
            "(postgresql://... o postgresql+psycopg://...)."
        )
    return SQLModelDocumentRepository(database_url)


def _validate_password(password: str) -> str:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise SeedError(
            f"La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres."
        )
    return password


def seed_one(
    repository: DocumentRepository,
    hasher: PasswordHasher,
    seed: SeedUser,
    *,
    password: str = "",
    dry_run: bool = False,
    verify_login: bool = False,
) -> tuple[str, int | None]:
    """Crea un usuario si no existe y devuelve (estado, id)."""
    if password:
        _validate_password(password)

    existing = repository.get_user_by_email(seed.email)
    if existing is not None:
        if verify_login and password and not hasher.verify(
            password, existing.password_hash
        ):
            return "omitido (contraseña distinta)", existing.id
        return "omitido", existing.id

    if dry_run:
        return "crearía", None

    if not password:
        raise SeedError(f"Falta la contraseña para {seed.email}.")

    user = new_user(
        seed.email,
        hasher.hash(password),
        role=seed.role,
        name=seed.name,
    )
    try:
        created = repository.create_user(user)
    except EmailAlreadyRegistered:
        return "omitido", None

    if verify_login and not hasher.verify(password, created.password_hash):
        raise SeedError(f"El hash de {seed.email} no verifica la contraseña.")
    return "creado", created.id


def _seeds_from_args(args: argparse.Namespace) -> list[SeedUser]:
    if args.email:
        if args.file is not None:
            raise SeedError("Usa --email o --file, no ambos.")
        if not args.name:
            raise SeedError("--email requiere --name.")
        return [
            SeedUser(
                email=_validate_email(args.email, 1),
                name=_validate_name(args.name, 1),
                role=_validate_role(args.role, 1),
            )
        ]
    if args.password:
        raise SeedError("--password solo se puede usar junto con --email.")
    path = args.file if args.file is not None else DEFAULT_SEEDS_FILE
    return load_seeds(Path(path))


def _parse_args(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Crea usuarios en la BD si no existen (no actualiza).",
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=None,
        help=f"JSON de semillas (por defecto {DEFAULT_SEEDS_FILE}).",
    )
    parser.add_argument("--email", help="Modo de un solo usuario.")
    parser.add_argument("--name", help="Nombre del usuario de --email.")
    parser.add_argument("--role", choices=VALID_ROLES, default="user")
    parser.add_argument(
        "--password",
        help=(
            "Solo con --email; si se omite, se usa password_env/SEED_PASSWORD "
            "o el prompt."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Muestra qué haría sin escribir en la BD ni pedir contraseñas.",
    )
    parser.add_argument(
        "--verify-login",
        action="store_true",
        help="Comprueba el hash con hasher.verify tras crear.",
    )
    return parser.parse_args(argv)


def main(
    argv: Sequence[str] | None = None,
    *,
    repository: DocumentRepository | None = None,
    hasher: PasswordHasher | None = None,
) -> int:
    args = _parse_args(argv)
    try:
        seeds = _seeds_from_args(args)
        if args.password and len(seeds) > 1:
            raise SeedError("--password solo vale para un único usuario.")
        if repository is None:
            repository = build_repository(SeedSettings().database_url)
        password_hasher = hasher or BcryptPasswordHasher()
        resolver = PasswordResolver()

        for seed in seeds:
            password = args.password or ""
            if not password and not args.dry_run:
                password = resolver.resolve(seed.password_env)
            status, user_id = seed_one(
                repository,
                password_hasher,
                seed,
                password=password,
                dry_run=args.dry_run,
                verify_login=args.verify_login,
            )
            identifier = f" id={user_id}" if user_id is not None else ""
            print(f"[{status}] {seed.email} rol={seed.role}{identifier}")
        return 0
    except ValidationError as exc:
        missing = ", ".join(
            ".".join(str(part) for part in error["loc"]) or "valor"
            for error in exc.errors()
        )
        print(
            "Error: configuración incompleta "
            f"({missing}). Define DATABASE_URL en ./.env o expórtalo "
            "en el entorno.",
            file=sys.stderr,
        )
        return 2
    except SeedError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # noqa: BLE001 - error de BD: mensaje limpio
        print(f"Error al sembrar usuarios: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
