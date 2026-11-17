"""Unit tests of environment-driven configuration (T-02)."""

import pytest
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

from conftest import TEST_ENV

from src.core.config import Settings


class FreshSettings(Settings):
    """Settings subclass that never reads a .env file in tests."""

    model_config = SettingsConfigDict(env_file=None, extra="ignore")


def test_full_configuration_loads(test_env: dict[str, str]) -> None:
    """Every mandatory variable provided by the environment is loaded."""
    settings = FreshSettings()

    assert settings.database_url == test_env["DATABASE_URL"]
    assert settings.redis_url == test_env["REDIS_URL"]
    assert settings.storage_dir == test_env["STORAGE_DIR"]
    assert settings.jwt_secret == test_env["JWT_SECRET"]
    assert settings.jwt_access_ttl == int(test_env["JWT_ACCESS_TTL"])
    assert settings.jwt_refresh_ttl == int(test_env["JWT_REFRESH_TTL"])
    assert settings.max_upload_mb == int(test_env["MAX_UPLOAD_MB"])
    assert settings.max_pdf_pages == int(test_env["MAX_PDF_PAGES"])
    assert settings.process_timeout_s == int(test_env["PROCESS_TIMEOUT_S"])
    assert settings.ocr_lang == test_env["OCR_LANG"]


@pytest.mark.parametrize("missing", sorted(TEST_ENV))
def test_every_setting_is_required(
    monkeypatch: pytest.MonkeyPatch, missing: str
) -> None:
    """No variable has a default: each one missing fails fast."""
    monkeypatch.delenv(missing, raising=False)

    with pytest.raises(ValidationError, match="no está configurado"):
        FreshSettings()


@pytest.mark.parametrize(
    "blank",
    ["JWT_SECRET", "DATABASE_URL", "STORAGE_DIR", "OCR_LANG"],
)
def test_blank_values_are_rejected(
    monkeypatch: pytest.MonkeyPatch, blank: str
) -> None:
    """Blank values are treated as missing configuration."""
    monkeypatch.setenv(blank, "   ")

    with pytest.raises(ValidationError, match="no está configurado"):
        FreshSettings()
