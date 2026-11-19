"""Application configuration loaded from environment variables (SDD/plan.md §8).

Core infrastructure settings are mandatory and fail fast at startup with a
Spanish message. Optional settings have usable defaults. The provisional
limits follow spec D-17 (20 MB, 100 pages, 300 s), the token TTLs follow
spec D-06 (30 min access / 7 days refresh) and OCR language follows D-03 (spa).
"""

from functools import lru_cache
from urllib.parse import urlparse

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

    # Gemini Developer API (OpenAI-compatible chat completions).
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai"
    gemini_model: str = "gemini-flash-lite-latest"
    gemini_api_key: str = ""
    gemini_timeout_s: float = 180.0

    # Bootstrap del primer admin (spec D-22): opcionales; si ambas están
    # definidas, se crea el administrador inicial al arrancar. Nunca vía endpoint.
    admin_email: str = ""
    admin_password: str = ""

    # Orígenes permitidos para cookies con credenciales (frontend Vite, 5173).
    cors_origins: str = "http://localhost:5173"

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

    @field_validator("gemini_timeout_s")
    @classmethod
    def validate_gemini_timeout(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("GEMINI_TIMEOUT_S debe ser positivo.")
        return value

    @field_validator("gemini_base_url")
    @classmethod
    def validate_gemini_base_url(cls, value: str) -> str:
        parsed = urlparse(value.strip())
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("GEMINI_BASE_URL debe ser una URL HTTP o HTTPS válida.")
        return value.strip().rstrip("/")

    @field_validator("gemini_model")
    @classmethod
    def validate_gemini_model(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("GEMINI_MODEL no puede estar vacío.")
        return value.strip()


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings."""
    return Settings()
