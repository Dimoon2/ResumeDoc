# Documentación — Backend

API de ResumeDoc: subida de PDFs e imágenes, extracción de texto (pypdf + OCR con Tesseract), autenticación y resúmenes. Implementada con **FastAPI** y arquitectura hexagonal, cola **Celery/Redis** y **PostgreSQL**. El código de esta parte vive en `apps/api/`.

> Este documento cubre únicamente el backend. El arranque general del proyecto está en el [README principal](../README.md). Los bloques de comandos se ejecutan desde la **raíz del repositorio**, salvo que se indique lo contrario.

## Estado: qué está hecho (Fases 0–4)

| Fase | Tareas | Qué entrega |
|---|---|---|
| 0 — Fundamentos | T-01, T-02 | Esqueleto hexagonal (`domain/`, `application/`, `adapters/`, composición en `main.py`), config 100% por env vars con fail-fast, `/health` |
| 1 — Autenticación | T-03…T-05 | JWT (access 30 min / refresh 7 días) + bcrypt, login/registro/me/logout, cookies HttpOnly, **refresh rotativo por familia** (reuso ⇒ revoca la familia) y `token_refresco` persistido en BD, bootstrap del primer admin por env, tests |
| 2 — Subida | T-06…T-10 | `POST /documents` (validación extensión/vacío/20 MB → 201 `{id, status:"pending"}`), guardado `{uuid}.{ext}`, puerto `DocumentRepository` + doble en memoria, encolado por Celery con **compensación si el broker falla** (sin huérfanos en BD ni disco) |
| 3 — Pipeline | T-11…T-17 | Máquina de estados en Redis (`pending → processing → completed/error`), worker Celery con `soft_time_limit` (5 min) y hook de huérfanos al arrancar, PDF: capa textual pypdf + OCR por página sin texto, PDF cifrado → error, > 100 páginas → error, `GET /documents/{id}/status` (polling, 404 uniforme) |
| 4 — Integración | T-18, T-19 | Adaptadores SQLModel reales sobre el paquete `db/` (documentos y `token_refresco`, con `claim` atómico y revocación por familia), migraciones Alembic aplicadas, pruebas de integración auto-skipped sin infra |

Suite: **118 passed · pyright 0 errores**. Quedan 3 fallos de entorno si no está instalado el binario `tesseract` (pruebas de OCR real) y 10 skips: las pruebas de integración solo corren con infra real (no `memory://`).

## Puesta en marcha

Requisitos: Python 3.14+, Redis y PostgreSQL 17 (vía Docker). Con `DATABASE_URL=memory://` la API corre sin BD (doble en memoria; lo usan los tests unitarios).

### 1. Entorno virtual

Desde la **raíz del repo** (el `.venv` vive ahí y lo comparten API y Alembic):

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r apps/api/requirements.txt
```

> Alternativa: `./dev.ps1 install` automatiza la instalación y crea el entorno en `apps/api/venv` (intérprete `apps/api/venv/Scripts/python.exe`), que es el que usan las acciones `api`, `worker` y `migrate` del script. Ambas opciones son válidas, pero conviene no mezclarlas en la misma máquina.

`pyright` no viene en `requirements.txt`: se ejecuta con `npx pyright` desde `apps/api` (lee `pyrightconfig.json`, que apunta al `.venv` de la raíz).

### 2. Variables de entorno

El repo usa **dos** `.env` (los dos a partir de la misma plantilla): `./.env` en la raíz para Alembic, y `apps/api/.env` porque la API y el worker leen `.env` desde su directorio de trabajo.

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

Rellena **TODAS** las variables: sin `.env` completo no arranca (fail-fast con mensaje en español). Las dos que dependen del equipo:

- `DATABASE_URL` — la BD compartida es **Neon** (pedir la URL al responsable de datos) o un Postgres local (paso 3).
- `REDIS_URL` — `redis://localhost:6379/0` con el contenedor de abajo.

Para el front: `CORS_ORIGINS` (default `http://localhost:5173`) y `COOKIE_SECURE` (default `false`, solo desarrollo HTTP).

### 3. Infraestructura local (solo si no usas la BD del equipo)

```bash
docker run -d --name resumedoc_redis -p 6379:6379 redis:7
docker run -d --name resumedoc_db -p 5434:5432 \
  -e POSTGRES_USER=resumedoc -e POSTGRES_PASSWORD=resumedoc \
  -e POSTGRES_DB=resumedoc postgres:17
```

`./dev.ps1 infra` crea (o arranca) exactamente estos dos contenedores y espera a que PostgreSQL esté listo.

### 4. Migraciones (solo si la BD es local o recién creada)

Alembic vive en la **raíz del repo** y lee `DATABASE_URL` del entorno:

```bash
DATABASE_URL=postgresql://resumedoc:resumedoc@localhost:5434/resumedoc \
  alembic upgrade head
```

La BD de Neon del equipo **ya está migrada**: no ejecutar migraciones contra ella sin hablar antes con quien la gestiona.

### 5. Arrancar API y worker

Son **dos procesos** (la API encola, el worker procesa) y ambos necesitan `PYTHONPATH=../..`, porque el paquete `db/` con los modelos vive en la raíz del repo, **dos niveles** arriba de `apps/api`:

```bash
cd apps/api
PYTHONPATH=../.. ../../.venv/bin/python -m uvicorn src.main:app --reload  # API en :8000
PYTHONPATH=../.. ../../.venv/bin/celery -A src.worker:celery_app worker --loglevel=info
```

Verificación rápida: `curl http://localhost:8000/health` → `{"status":"ok",...}`.

### 6. Primer admin (bootstrap, nunca vía endpoint)

```bash
cd apps/api
ADMIN_EMAIL=root@correo.com ADMIN_PASSWORD=<una-clave-fuerte> \
  PYTHONPATH=../.. ../../.venv/bin/python -m uvicorn src.main:app
```

### 7. Pruebas

```bash
cd apps/api
../../.venv/bin/python -m pytest            # suite completa
npx pyright                                 # tipos: 0 errores (usa ../../.venv)
```

Las pruebas de integración (worker y repo de refresh) usan por defecto la infra del `.env` (`DATABASE_URL`/`REDIS_URL`) y se limpian solas al terminar. Para apuntarlas a otra infraestructura (recomendado: una BD de pruebas, no la compartida), defíne `INTEGRATION_DATABASE_URL` e `INTEGRATION_REDIS_URL`. Receta con una BD `resumedoc_test` en el contenedor local:

```bash
docker exec resumedoc_db psql -U resumedoc -d postgres -c "CREATE DATABASE resumedoc_test;"
DATABASE_URL=postgresql://resumedoc:resumedoc@localhost:5434/resumedoc_test \
  .venv/bin/python -m alembic upgrade head
cd apps/api
INTEGRATION_DATABASE_URL=postgresql://resumedoc:resumedoc@localhost:5434/resumedoc_test \
  INTEGRATION_REDIS_URL=redis://localhost:6379/0 ../../.venv/bin/pytest tests/test_integration_db.py
```

## Variables de entorno

Todas obligatorias salvo las marcadas — véase `.env.example` con la plantilla completa (`JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `STORAGE_DIR`, límites de D-17, `OCR_LANG`, `CORS_ORIGINS`, `ADMIN_EMAIL`/`ADMIN_PASSWORD` opcionales).

## Contrato de autenticación (API)

- `POST /auth/register` → 201 `{user: {id, name, email}}` + cookies `access_token` y `refresh_token` (HttpOnly). Registro abierto, rol `user`; duplicado → 409. Sin permisos del admin, el usuario solo ve sus documentos (D-28).
- `POST /auth/login` → 200 `{user}` + ambas cookies; credenciales mal → 401.
- `GET /auth/me` → 200 `{user}` desde la cookie de access; 401 si no hay sesión.
- `POST /auth/refresh` → rota el refresh (cookie o body) y renueva ambas cookies; responde `{access_token}`. Token inválido, expirado, revocado o reusado → 401 genérico.
- `POST /auth/logout` → 204, revoca la familia de sesión y borra ambas cookies.
- `POST /auth/forgot-password` → 202 genérico (anti-enumeración); el reset real llega con el flujo de correo.
- CORS con credenciales para `CORS_ORIGINS` (default `http://localhost:5173`).

### Cookies de sesión

| Cookie | Path | Max-Age | HttpOnly | SameSite | Secure |
|---|---|---|---|---|---|
| `access_token` | `/` | `JWT_ACCESS_TTL` | Sí | `lax` | `COOKIE_SECURE` |
| `refresh_token` | `/auth` | restante hasta `expires_at` | Sí | `lax` | `COOKIE_SECURE` |

`COOKIE_SECURE` es opcional (default `false`, solo válido en HTTP local); en producción HTTPS debe ser `true`. El refresh usa `Path=/auth`, así que no se envía a `/documents/*`; `SameSite=Lax` cubre el CSRF básico (sin token CSRF explícito en el MVP).

### Comportamiento del refresh

Cada refresh invalida el token anterior y emite uno nuevo de la misma familia; reusar un token ya rotado revoca toda la sesión. El detalle del flujo para clientes SPAs está en [docs/api-auth-frontend.md](../docs/api-auth-frontend.md).

## Flujo de documentos

1. `POST /documents` (cookie/bearer) → valida, guarda binario, crea registro, encola → responde 201 inmediato (< 1 s).
2. El worker extrae el texto (pypdf; página sin capa textual → rasterizar 150 dpi + Tesseract `spa`) y escribe el texto en `STORAGE_DIR/text/{uuid}.txt`.
3. El estado se consulta con `GET /documents/{id}/status` hasta `completed`.
4. El texto se persiste en BD solo con un guardado explícito del usuario (D-25).

## Arquitectura

Hexagonal estricta: `domain/` (stdlib solo) → `application/` (casos de uso y puertos) → `adapters/` (FastAPI, SQLModel, Redis, filesystem, Tesseract, Celery). La composición solo en `src/main.py` y `src/worker.py`. Cambiar de ORM toca solo `adapters/persistence/`; cambiar de OCR, solo `adapters/extraction/tesseract.py` + 2 líneas de `worker.py`.

## Pendientes conocidos

- ~~Aplicar la migración `e3f9a7c1b204` (`token_refresco`)~~: hecha (recreada con `downgrade d9b1c3e5f702` + `upgrade head`; `alembic check` limpio). El repositorio SQLModel de refresh tokens ya persiste en `token_refresco` (`claim` atómico y revocación por familia).
- Rate limiting en `/auth/login`, `/auth/register` y `/auth/refresh`.
- Activar `COOKIE_SECURE=true` en producción HTTPS (default `false`).
- Purga periódica de `token_refresco` expirados (`delete_expired` ya existe).
- Si el servicio se sirve en otro dominio: `SameSite=None` configurable + CSRF (hoy `SameSite=Lax`; véase `docs/api-auth-frontend.md §7`).
- Purgar `requirements.txt` (solo se usan ~16 dependencias directas).
- Zona admin (T-A4) y concesiones: sin implementar.
- El `PYTHONPATH=../..` es un parche: decidir en equipo si `db/` se mueve a `apps/api/` o se empaqueta (pip install -e) y quitar el parche.
- `db/engine.py` tiene `echo=True`: loguea cada SQL (incluidos datos) — apagarlo para producción.
