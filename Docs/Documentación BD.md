# Documentación — Base de datos

Capa de datos de ResumeDoc: modelos **SQLModel** sobre PostgreSQL, migraciones con **Alembic** y una prueba de conexión. El código de esta parte vive en `db/`, `alembic/` y `scripts/`, en la raíz del repositorio.

> Este documento cubre únicamente la base de datos. El arranque general del proyecto está en el [README principal](../README.md).

## Requisitos

- Python 3.13
- Acceso a una base de datos PostgreSQL (instancia compartida en Neon o una local)

## Instalación

Desde la raíz del repositorio:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

El `requirements.txt` de la raíz contiene solo las dependencias de esta capa: `sqlmodel`, `psycopg[binary]`, `alembic` y `pydantic-settings`.

## Configuración

1. En Neon: **Connection Details → Direct connection** (no la *pooled*).
2. Copia `.env.example` a `.env` y reemplaza la URL. Cambia el esquema `postgresql://` por `postgresql+psycopg://`.
3. Alembic y `scripts/check_db.py` leen `DATABASE_URL` del entorno. Si usas `./dev.ps1 migrate`, el script carga `apps/api/.env` y fija `PYTHONPATH` por ti (detalles en el README principal).

```env
DATABASE_URL=postgresql+psycopg://usuario:password@host/dbname?sslmode=require
```

> Los archivos `.env` no se suben al repositorio.

## Modelo de datos

### Tablas

| Tabla | Columnas | Descripción |
|---|---|---|
| `usuario` | `id` PK, `nombre`, `correo` (único), `password_hash`, `rol` (`admin`/`noadmin`) | Usuarios del sistema. |
| `documento` | `id` PK, `nombre`, `ubicacion`, `peso`, `es_resumen`, `fecha_creacion`, `usuario_id` FK | Documentos. `usuario_id` es el dueño que lo subió; `es_resumen` indica si es un resumen. |
| `documento_contenido_documento` | `contenedor_id` FK, `contenido_id` FK, PK compuesta | Composición documento ↔ documento. |
| `usuario_acceso_usuario` | `propietario_id` FK, `autorizado_id` FK, `puede_editar`, `fecha_otorgamiento`, `fecha_revocacion`, PK compuesta | Permisos de acceso a todos los documentos de un propietario. |
| `token_refresco` | `jti` PK, `usuario_id` FK, `familia`, `fecha_expiracion`, `fecha_creacion`, `fecha_uso`, `fecha_revocacion` | Sesiones de refresh: rotación atómica y detección de reuso (familia se revoca). |

### Relaciones

- **`Usuario` 1:N `Documento`**: un documento tiene un dueño (`documento.usuario_id`); un usuario puede tener muchos documentos.
- **`Documento` N:M `Documento`** (autoreferenciada) vía `documento_contenido_documento`:
  - `Documento.documentos_contenidos`: documentos que contiene.
  - `Documento.documentos_contenedores`: documentos en los que está contenido.
- **`Usuario` N:M `Usuario`** (autoreferenciada) vía `usuario_acceso_usuario`:
  - `User.usuarios_autorizados`: usuarios a los que les dio acceso.
  - `User.usuarios_que_me_autorizaron`: usuarios que le dieron acceso.

### Reglas de integridad

- PKs compuestas impiden vínculos y permisos duplicados.
- CHECK impide auto-contención (`contenedor_id != contenido_id`) y autoautorización (`propietario_id != autorizado_id`).
- `ON DELETE CASCADE` limpia vínculos y permisos al borrar documentos o usuarios; no borra documentos por revocar un permiso.
- La revocación de acceso es lógica: `fecha_revocacion` con valor indica permiso inactivo.
- Los ciclos indirectos entre documentos (A contiene B y B contiene A) no se validan en la BD.

```mermaid
erDiagram
    USUARIO ||--o{ DOCUMENTO : sube
    USUARIO ||--o{ USUARIO_ACCESO_USUARIO : propietario
    USUARIO ||--o{ USUARIO_ACCESO_USUARIO : autorizado
    DOCUMENTO ||--o{ DOCUMENTO_CONTENIDO_DOCUMENTO : contenedor
    DOCUMENTO ||--o{ DOCUMENTO_CONTENIDO_DOCUMENTO : contenido
```

## Migraciones (Alembic)

Desde la raíz del repo, con `DATABASE_URL` en el entorno:

```bash
# crear una nueva migración a partir de cambios en db/models.py
alembic revision --autogenerate -m "descripcion"

# aplicar las migraciones pendientes
alembic upgrade head

# ver el estado actual
alembic current
```

Si la base de datos es compartida, coordina con quien la gestiona antes de aplicar migraciones.

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
