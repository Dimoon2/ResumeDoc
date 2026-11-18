"""Tests de la semilla de usuarios (sin base de datos real)."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from scripts import seed_users
from scripts.seed_users import (
    PasswordResolver,
    SeedError,
    SeedSettings,
    SeedUser,
    _normalize_database_url,
    load_seeds,
    main,
    seed_one,
)
from src.adapters.persistence.memory import InMemoryDocumentRepository
from src.adapters.security.bcrypt_adapter import BcryptPasswordHasher

SEEDS_FILE = Path(__file__).resolve().parents[3] / "scripts" / "seeds" / "users.json"
PASSWORD = "ClaveDePrueba123!"


def test_default_file_has_five_regular_users() -> None:
    seeds = load_seeds(SEEDS_FILE)

    assert len(seeds) == 5
    assert [seed.name for seed in seeds] == [
        "Juan Carlos",
        "Diana",
        "Ana Laura",
        "Andriu",
        "Jose Bello",
    ]
    assert all(seed.role == "user" for seed in seeds)
    assert all(seed.email.endswith("@resumedoc.com") for seed in seeds)
    assert {seed.password_env for seed in seeds} == {"SEED_USER_PASSWORD"}


def test_seed_one_creates_user_with_hashed_password() -> None:
    repository = InMemoryDocumentRepository()
    hasher = BcryptPasswordHasher()
    seed = SeedUser("diana@resumedoc.com", "Diana")

    status, user_id = seed_one(repository, hasher, seed, password=PASSWORD)

    assert status == "creado"
    assert user_id is not None
    created = repository.get_user_by_email("diana@resumedoc.com")
    assert created is not None
    assert created.name == "Diana"
    assert created.role == "user"
    assert created.password_hash != PASSWORD
    assert hasher.verify(PASSWORD, created.password_hash)


def test_seed_one_is_idempotent() -> None:
    repository = InMemoryDocumentRepository()
    hasher = BcryptPasswordHasher()
    seed = SeedUser("andriu@resumedoc.com", "Andriu")

    first, first_id = seed_one(repository, hasher, seed, password=PASSWORD)
    second, second_id = seed_one(repository, hasher, seed, password="Otra123!")

    assert first == "creado"
    assert second == "omitido"
    assert second_id == first_id
    assert hasher.verify(PASSWORD, repository.get_user_by_email(seed.email).password_hash)  # type: ignore[union-attr]


def test_dry_run_does_not_write() -> None:
    repository = InMemoryDocumentRepository()
    seed = SeedUser("ana.laura@resumedoc.com", "Ana Laura")

    status, user_id = seed_one(
        repository, BcryptPasswordHasher(), seed, dry_run=True
    )

    assert status == "crearía"
    assert user_id is None
    assert repository.get_user_by_email(seed.email) is None


def test_verify_login_flags_a_different_password() -> None:
    repository = InMemoryDocumentRepository()
    hasher = BcryptPasswordHasher()
    seed = SeedUser("jose.bello@resumedoc.com", "Jose Bello")
    seed_one(repository, hasher, seed, password=PASSWORD)

    status, _ = seed_one(
        repository, hasher, seed, password="Distinta123!", verify_login=True
    )

    assert status == "omitido (contraseña distinta)"


def test_short_password_is_rejected() -> None:
    repository = InMemoryDocumentRepository()

    with pytest.raises(SeedError):
        seed_one(
            repository,
            BcryptPasswordHasher(),
            SeedUser("diana@resumedoc.com", "Diana"),
            password="corta",
        )


def test_load_seeds_supports_a_custom_file(tmp_path: Path) -> None:
    path = tmp_path / "users.json"
    path.write_text(
        json.dumps([{"email": "x@y.com", "name": "X", "role": "admin"}]),
        encoding="utf-8",
    )

    seeds = load_seeds(path)

    assert seeds == [SeedUser("x@y.com", "X", role="admin", password_env="")]


@pytest.mark.parametrize(
    "payload",
    [
        [],
        [{"email": "sin-arroba", "name": "X"}],
        [{"email": "x@y.com", "name": "  "}],
        [{"email": "x@y.com", "name": "X", "role": "root"}],
        [
            {"email": "x@y.com", "name": "X"},
            {"email": "x@y.com", "name": "Y"},
        ],
        [{"name": "X"}],
    ],
)
def test_load_seeds_rejects_invalid_data(tmp_path: Path, payload: object) -> None:
    path = tmp_path / "users.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(SeedError):
        load_seeds(path)


def test_password_resolver_reads_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SEED_USER_PASSWORD", PASSWORD)

    assert PasswordResolver().resolve("SEED_USER_PASSWORD") == PASSWORD


def test_password_resolver_reads_repo_env_file(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.delenv("SEED_USER_PASSWORD", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text(f"SEED_USER_PASSWORD={PASSWORD}\n", encoding="utf-8")
    monkeypatch.setattr(seed_users, "ENV_FILE", env_file)

    assert PasswordResolver().resolve("SEED_USER_PASSWORD") == PASSWORD


def test_password_resolver_prompts_once(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.delenv("SEED_USER_PASSWORD", raising=False)
    monkeypatch.setattr(seed_users, "ENV_FILE", tmp_path / "missing.env")
    calls: list[str] = []

    def fake_getpass(prompt: str = "") -> str:
        calls.append(prompt)
        return PASSWORD

    monkeypatch.setattr(seed_users.getpass, "getpass", fake_getpass)
    resolver = PasswordResolver()

    assert resolver.resolve("SEED_USER_PASSWORD") == PASSWORD
    assert resolver.resolve("SEED_USER_PASSWORD") == PASSWORD
    assert len(calls) == 1


def test_password_resolver_reports_missing_terminal(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.delenv("SEED_USER_PASSWORD", raising=False)
    monkeypatch.setattr(seed_users, "ENV_FILE", tmp_path / "missing.env")

    def fake_getpass(prompt: str = "") -> str:
        raise EOFError

    monkeypatch.setattr(seed_users.getpass, "getpass", fake_getpass)

    with pytest.raises(SeedError):
        PasswordResolver().resolve("SEED_USER_PASSWORD")


def test_main_creates_user_from_flags(
    capsys: pytest.CaptureFixture[str],
) -> None:
    repository = InMemoryDocumentRepository()

    code = main(
        [
            "--email",
            "diana@resumedoc.com",
            "--name",
            "Diana",
            "--password",
            PASSWORD,
        ],
        repository=repository,
        hasher=BcryptPasswordHasher(),
    )

    assert code == 0
    assert "creado" in capsys.readouterr().out
    assert repository.get_user_by_email("diana@resumedoc.com") is not None


def test_main_is_idempotent(
    capsys: pytest.CaptureFixture[str],
) -> None:
    repository = InMemoryDocumentRepository()
    argv = [
        "--email",
        "diana@resumedoc.com",
        "--name",
        "Diana",
        "--password",
        PASSWORD,
    ]

    main(argv, repository=repository, hasher=BcryptPasswordHasher())
    code = main(argv, repository=repository, hasher=BcryptPasswordHasher())

    assert code == 0
    assert "[omitido]" in capsys.readouterr().out


def test_main_dry_run_does_not_need_a_password() -> None:
    repository = InMemoryDocumentRepository()

    code = main(
        ["--email", "diana@resumedoc.com", "--name", "Diana", "--dry-run"],
        repository=repository,
        hasher=BcryptPasswordHasher(),
    )

    assert code == 0
    assert repository.get_user_by_email("diana@resumedoc.com") is None


def test_main_rejects_memory_database() -> None:
    code = main(
        ["--email", "diana@resumedoc.com", "--name", "Diana", "--password", PASSWORD]
    )

    assert code == 2


def test_main_rejects_password_with_multiple_users(
    capsys: pytest.CaptureFixture[str],
) -> None:
    code = main(["--password", PASSWORD], repository=InMemoryDocumentRepository())

    assert code == 2
    assert "--password" in capsys.readouterr().err


def test_main_requires_name_with_email(
    capsys: pytest.CaptureFixture[str],
) -> None:
    code = main(["--email", "diana@resumedoc.com"], repository=InMemoryDocumentRepository())

    assert code == 2
    assert "--name" in capsys.readouterr().err


def test_main_seeds_default_file_with_shared_password(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv("SEED_USER_PASSWORD", PASSWORD)
    repository = InMemoryDocumentRepository()

    code = main([], repository=repository, hasher=BcryptPasswordHasher())

    output = capsys.readouterr().out
    assert code == 0
    assert output.count("[creado]") == 5
    assert repository.get_user_by_email("jose.bello@resumedoc.com") is not None


def test_seed_settings_requires_database_url() -> None:
    with pytest.raises(ValidationError):
        SeedSettings(database_url="")


def test_normalize_database_url_uses_psycopg() -> None:
    assert (
        _normalize_database_url("postgresql://u:p@host/db?sslmode=require")
        == "postgresql+psycopg://u:p@host/db?sslmode=require"
    )
    assert (
        _normalize_database_url("postgresql+psycopg://u:p@host/db")
        == "postgresql+psycopg://u:p@host/db"
    )
