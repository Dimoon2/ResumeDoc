"""Shared test environment for the ResumeDoc API test suite."""

import sys
from pathlib import Path

# Raíz del repo: el paquete `db/` (modelos del equipo de datos) vive ahí.
# Un `pythonpath = ..` del ini no vale: pytest inserta la ruta sin
# normalizar y Python 3.14 no resuelve entradas con `..`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from src.core.config import get_settings

# Representative values for every mandatory setting. The autouse fixture
# installs them so no test depends on the real environment or a real .env.
TEST_ENV: dict[str, str] = {
    "DATABASE_URL": "memory://",
    "REDIS_URL": "redis://broker:6379/1",
    "STORAGE_DIR": "storage",
    "JWT_SECRET": "test-only-secret-that-is-long-enough-32b",
    "JWT_ACCESS_TTL": "1800",
    "JWT_REFRESH_TTL": "604800",
    "MAX_UPLOAD_MB": "20",
    "MAX_PDF_PAGES": "100",
    "PROCESS_TIMEOUT_S": "300",
    "OCR_LANG": "spa",
}


@pytest.fixture(autouse=True)
def test_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Provide every mandatory setting for each test."""
    for key, value in TEST_ENV.items():
        monkeypatch.setenv(key, value)


@pytest.fixture(autouse=True)
def fresh_settings_cache() -> None:
    """Keep the get_settings() cache from leaking between tests."""
    get_settings.cache_clear()


@pytest.fixture
def test_env() -> dict[str, str]:
    """Expose the base test environment to individual tests."""
    return TEST_ENV
