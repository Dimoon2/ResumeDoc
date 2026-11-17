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

## Modelo de datos

### Tablas

| Tabla | Columnas | Descripción |
|---|---|---|
| `usuario` | `id` PK, `nombre`, `correo` (único), `password_hash`, `rol` (`admin`/`noadmin`) | Usuarios del sistema. |
| `documento` | `id` PK, `nombre`, `ubicacion`, `peso`, `es_resumen`, `fecha_creacion`, `usuario_id` FK | Documentos. `usuario_id` es el dueño que lo subió; `es_resumen` indica si es un resumen. |
| `documento_contenido_documento` | `contenedor_id` FK, `contenido_id` FK, PK compuesta | Composición documento ↔ documento. |
| `usuario_acceso_usuario` | `propietario_id` FK, `autorizado_id` FK, `puede_editar`, `fecha_otorgamiento`, `fecha_revocacion`, PK compuesta | Permisos de acceso a todos los documentos de un propietario. |

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

```bash
# crear una nueva migración a partir de cambios en db/models.py
alembic revision --autogenerate -m "descripcion"

# aplicar las migraciones pendientes a Neon
alembic upgrade head

# ver el estado actual
alembic current
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
docs/            # notas locales (ignoradas por git)
```
