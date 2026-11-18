"""Application configuration loaded from environment variables (SDD/plan.md §8).

Every setting is mandatory: no variable has a usable default value, so any
missing variable fails fast at startup with a Spanish message. The provisional
limits follow spec D-17 (20 MB, 100 pages, 300 s), the token TTLs follow
spec D-06 (30 min access / 7 days refresh) and OCR language follows D-03 (spa).
"""

from functools import lru_cache

from pydantic import Field, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven settings for the API and the worker."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Persistence and infrastructure (the DB engine is external, spec D-13)
    database_url: str = Field(default="", validate_default=True)
    redis_url: str = Field(default="", validate_default=True)
    storage_dir: str = Field(default="", validate_default=True)

    # JWT tokens (TTLs provisional: 30 min access / 7 days refresh, spec D-06)
    jwt_secret: str = Field(default="", validate_default=True)
    jwt_access_ttl: int = Field(default=0, validate_default=True)  # seconds
    jwt_refresh_ttl: int = Field(default=0, validate_default=True)  # seconds

    # Provisional limits (spec D-17)
    max_upload_mb: int = Field(default=0, validate_default=True)
    max_pdf_pages: int = Field(default=0, validate_default=True)
    process_timeout_s: int = Field(default=0, validate_default=True)

    # OCR (spec D-03)
    ocr_lang: str = Field(default="", validate_default=True)

    # Bootstrap del primer admin (spec D-22): opcionales; si ambas están
    # definidas, se crea el administrador inicial al arrancar. Nunca vía endpoint.
    admin_email: str = ""
    admin_password: str = ""

    # Orígenes permitidos para cookies con credenciales (frontend Vite, 5173).
    cors_origins: str = "http://localhost:5173"

    # Cookies de sesión: `secure` solo puede ser `false` en desarrollo HTTP.
    # En producción (HTTPS) debe configurarse COOKIE_SECURE=true.
    cookie_secure: bool = False

    @field_validator(
        "database_url", "redis_url", "storage_dir", "jwt_secret", "ocr_lang"
    )
    @classmethod
    def reject_missing_string(cls, value: str, info: ValidationInfo) -> str:
        """Reject the empty sentinel: strings have no default values."""
        if not str(value).strip():
            name = info.field_name or "setting"
            raise ValueError(
                f"{name.upper()} no está configurado: defínelo en el "
                "entorno o en un archivo .env. Ninguna variable tiene valor "
                "por defecto."
            )
        return value

    @field_validator(
        "jwt_access_ttl",
        "jwt_refresh_ttl",
        "max_upload_mb",
        "max_pdf_pages",
        "process_timeout_s",
    )
    @classmethod
    def reject_missing_number(cls, value: int, info: ValidationInfo) -> int:
        """Reject the zero sentinel: numbers must be defined and positive."""
        if value <= 0:
            name = info.field_name or "setting"
            raise ValueError(
                f"{name.upper()} no está configurado o no es "
                "positivo: defínelo en el entorno o en un archivo .env. "
                "Ninguna variable tiene valor por defecto."
            )
        return value


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings."""
    return Settings()
