# ResumeDoc — API

Backend de ResumeDoc: subida de PDFs/imágenes, extracción de texto por
pipeline (pypdf + OCR Tesseract), autenticación y resúmenes. FastAPI con
arquitectura hexagonal, cola Celery/Redis y PostgreSQL (rama `data-base`).

## Estado: qué está hecho (Fases 0–4)

| Fase | Tareas | Qué entrega |
|---|---|---|
| 0 — Fundamentos | T-01, T-02 | Esqueleto hexagonal (`domain/`, `application/`, `adapters/`, composición en `main.py`), config 100% por env vars con fail-fast, `/health` |
| 1 — Autenticación | T-03…T-05 | JWT (access 30 min / refresh 7 días) + bcrypt, login/registro/me/logout, cookie HttpOnly, bootstrap del primer admin por env, tests |
| 2 — Subida | T-06…T-10 | `POST /documents` (validación extensión/vacío/20 MB → 201 `{id, status:"pending"}`), guardado `{uuid}.{ext}`, puerto `DocumentRepository` + doble en memoria, encolado por Celery con **compensación si el broker falla** (sin huérfanos en BD ni disco) |
| 3 — Pipeline | T-11…T-17 | Máquina de estados en Redis (`pending → processing → completed/error`), worker Celery con `soft_time_limit` (5 min) y hook de huérfanos al arrancar, PDF: capa textual pypdf + OCR por página sin texto, PDF cifrado → error, > 100 páginas → error, `GET /documents/{id}/status` (polling, 404 uniforme) |
| 4 — Integración | T-18, T-19 | Adaptador SQLModel real (modelos vendidos verbatim de `data-base`; al fusionar, sustituir por su paquete `db/` + Alembic), pruebas de integración auto-skipped sin infra |

Suite: **73 passed, 3 skipped · pyright 0 errores** (los 3 skips son las
pruebas de integración, que solo corren con infra real).

## Cómo levantar el backend

Requisitos: Python 3.12+, Redis y PostgreSQL 17. Sin BD real funciona con
`DATABASE_URL=memory://` (doble en memoria; lo usan los tests).

```bash
cd apps/api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # rellena TODAS las variables; sin .env no arranca
```

Infraestructura local (el `docker-compose.yml` es local y no se versiona):

```bash
docker run -d --name resumedoc_redis -p 6379:6379 redis:7
docker run -d --name resumedoc_db -p 5434:5432 \
  -e POSTGRES_USER=resumedoc -e POSTGRES_PASSWORD=resumedoc \
  -e POSTGRES_DB=resumedoc postgres:17
# nota: el 5434 es porque el 5432 de esta máquina ya está ocupado
```

Dos procesos separados (la API encola, el worker procesa):

```bash
venv/bin/python -m uvicorn src.main:app --reload          # API en :8000
venv/bin/celery -A src.worker:celery_app worker --loglevel=info
```

Primer admin (bootstrap, nunca vía endpoint):

```bash
ADMIN_EMAIL=root@correo.com ADMIN_PASSWORD=<una-clave-fuerte> \
  venv/bin/python -m uvicorn src.main:app
```

Pruebas:

```bash
venv/bin/pytest                 # suite completa
venv/bin/pyright                # tipos
# integración real (requiere BD + Redis levantados):
INTEGRATION_DATABASE_URL=postgresql://resumedoc:resumedoc@localhost:5434/resumedoc \
INTEGRATION_REDIS_URL=redis://localhost:6379/0 venv/bin/pytest
```

## Variables de entorno

Todas obligatorias salvo las marcadas — véase `.env.example` con la
plantilla completa (`JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`,
`STORAGE_DIR`, límites de D-17, `OCR_LANG`, `CORS_ORIGINS`,
`ADMIN_EMAIL`/`ADMIN_PASSWORD` opcionales).

## Contrato de autenticación (con el frontend)

- `POST /auth/register` → 201 `{user: {id, name, email}}` + cookie `access_token`
  (HttpOnly). Registro abierto, rol `user`; duplicado → 409. Sin permisos
  del admin, el usuario solo ve sus documentos (D-28).
- `POST /auth/login` → 200 `{user}` + cookie; credenciales mal → 401.
- `GET /auth/me` → 200 `{user}` desde la cookie; 401 si no hay sesión
  (el front lo trata como logged-out).
- `POST /auth/logout` → 204, borra la cookie.
- `POST /auth/refresh` → bearer, para clientes sin cookies (el front no lo usa).
- `POST /auth/forgot-password` → 202 genérico (anti-enumeración); el reset
  real llega con el flujo de correo.
- CORS con credenciales para `CORS_ORIGINS` (default `http://localhost:5173`).

## Flujo de documentos

1. `POST /documents` (cookie/bearer) → valida, guarda binario, crea registro,
   encola → responde 201 inmediato (< 1 s).
2. El worker extrae el texto (pypdf; página sin capa textual → rasterizar
   150 dpi + Tesseract `spa`) y escribe el texto en `STORAGE_DIR/text/{uuid}.txt`.
3. El estado se consulta con `GET /documents/{id}/status` hasta `completed`.
4. El texto se persiste en BD solo con un guardado explícito del usuario (D-25).

## Arquitectura

Hexagonal estricta: `domain/` (stdlib solo) → `application/` (casos de uso
y puertos) → `adapters/` (FastAPI, SQLModel, Redis, filesystem, Tesseract,
Celery). La composición solo en `src/main.py` y `src/worker.py`. Cambiar de
ORM toca solo `adapters/persistence/`; cambiar de OCR, solo
`adapters/extraction/tesseract.py` + 2 líneas de `worker.py`.

## Pendientes conocidos

- Rate limiting en `/auth/login` y `/auth/register`.
- Cookie `secure=True` para producción HTTPS (setting pendiente).
- Purgar `requirements.txt` (solo se usan ~16 dependencias directas).
- Zona admin (T-A4) y concesiones: sin implementar.
- Al fusionar con `data-base`: borrar `orm.py`, importar su `db/` y pasar a
  Alembic (hoy las tablas se crean con `create_all`, solo desarrollo).
