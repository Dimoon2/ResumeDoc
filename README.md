# ResumeDoc — Capa de datos

Solo la capa de base de datos (SQLModel + PostgreSQL en Neon). No incluye backend ni frontend.

## Requisitos

- Python 3.13
- Cuenta en [Neon](https://neon.tech)

## Instalación

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Configuración

1. En Neon: **Connection Details → Direct connection** (no la *pooled*).
2. Copia `.env.example` a `.env` y reemplaza la URL. Cambia el esquema
   `postgresql://` por `postgresql+psycopg://`:

```env
DATABASE_URL=postgresql+psycopg://usuario:password@host/dbname?sslmode=require
```

> El archivo `.env` no se sube al repositorio.

## Migraciones (Alembic)

```bash
# crear la primera migración a partir de db/models.py
alembic revision --autogenerate -m "init"

# aplicarla a Neon
alembic upgrade head
```

## Verificar la conexión

```bash
python -m scripts.check_db
```

Muestra la versión de PostgreSQL y las tablas existentes.

## Estructura

```
db/
├── config.py    # lee DATABASE_URL desde .env
├── engine.py    # conexión (create_engine)
├── session.py   # Session + get_session
└── models.py    # tablas SQLModel
alembic/         # migraciones versionadas
scripts/
└── check_db.py  # prueba de conexión
```
