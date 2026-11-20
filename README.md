# ResumeDoc

Plataforma para convertir PDFs e imágenes en texto consultable (OCR), generar resúmenes y gestionar documentos. El repositorio es un monorepo con tres partes:

- **Backend** (`apps/api/`): FastAPI + Celery/Redis, autenticación con JWT y pipeline de extracción de texto.
- **Frontend** (`apps/web/`): React + TypeScript + Vite + Tailwind.
- **Base de datos** (`db/`, `alembic/`, `scripts/`): modelos SQLModel sobre PostgreSQL y migraciones Alembic.

## Documentación

| Parte | Documento |
|---|---|
| Base de datos | [Documentación BD](Docs/Documentación%20BD.md) |
| Backend | [Documentación Backend](Docs/Documentación%20Backend.md) |
| Frontend | [Documentación Frontend](Docs/Documentación%20Frontend.md) |
| Contrato de autenticación para clientes | [docs/api-auth-frontend.md](docs/api-auth-frontend.md) |

## Arranque rápido

Necesitas Docker Desktop (PostgreSQL y Redis), Node.js/npm y Python. Para la primera vez:

```powershell
./dev.ps1 install
```

Y para levantar todo el entorno:

```powershell
./dev.ps1 up
```

El frontend queda en http://localhost:5173 y la API en http://localhost:8000/docs. Si `dev.ps1` se ejecuta sin argumentos, realiza la acción `up` por defecto.

## Comandos de `dev.ps1`

`dev.ps1` es un envoltorio en PowerShell para las tareas diarias de desarrollo: carga `.env`, fija `PYTHONPATH`, gestiona los contenedores Docker y abre cada servicio en su propia terminal. Se invoca con la acción como primer argumento:

```powershell
./dev.ps1 <accion>
# p. ej.: ./dev.ps1 api
# equivalente a: ./dev.ps1 -Action api
```

Si la política de ejecución de PowerShell bloquea el script:

```powershell
powershell -ExecutionPolicy Bypass -File .\dev.ps1 up
```

| Acción | Qué hace | Comando(s) original(es) que sustituye |
|---|---|---|
| `install` | Instala dependencias y prepara el entorno: `npm install` en la raíz, crea `apps/api/venv` si no existe, actualiza `pip` e instala `apps/api/requirements.txt`. | `npm install`, `python -m venv apps/api/venv`, `apps\api\venv\Scripts\python -m pip install --upgrade pip` y `...\python -m pip install -r apps\api\requirements.txt`. |
| `infra` | Comprueba que Docker esté activo, crea o arranca `resumedoc_db` (PostgreSQL 17, puerto 5434, volumen `resumedoc_pgdata`) y `resumedoc_redis` (Redis 7, puerto 6379), y espera a `pg_isready`. | `docker run -d --name resumedoc_db -p 5434:5432 -e POSTGRES_USER=resumedoc -e POSTGRES_PASSWORD=resumedoc -e POSTGRES_DB=resumedoc -v resumedoc_pgdata:/var/lib/postgresql/data postgres:17`, `docker run -d --name resumedoc_redis -p 6379:6379 redis:7`, los `docker start` posteriores y la espera manual con `docker exec resumedoc_db pg_isready ...`. |
| `migrate` | Carga `apps/api/.env`, fija `PYTHONPATH` a la raíz y ejecuta Alembic con el Python del venv. | Cargar variables de entorno/`DATABASE_URL`, `PYTHONPATH=<raíz>` y `python -m alembic upgrade head` desde la raíz. |
| `api` | Carga el entorno y arranca FastAPI con recarga automática en `http://localhost:8000`. | `cd apps/api`, definir `PYTHONPATH` y `python -m uvicorn src.main:app --reload`. |
| `worker` | Carga el entorno y arranca el worker Celery en `apps/api` con `--pool=solo --concurrency=1 --loglevel=info` (opciones pensadas para Windows). | `cd apps/api`, definir `PYTHONPATH` y `python -m celery -A src.worker:celery_app worker --loglevel=info` (añadiendo `--pool=solo --concurrency=1` en Windows). |
| `web` | Entra en `apps/web` y lanza Vite. | `cd apps/web && npm run dev` (o `npm run dev` desde la raíz, que redirige al workspace). |
| `up` | Acción por defecto: ejecuta `infra`, luego `migrate`, abre tres ventanas de PowerShell para `api`, `worker` y `web`, guarda sus PID en `.dev-processes.json` e imprime las URLs. | Ejecutar a mano `infra` + `migrate` + los tres comandos anteriores en tres terminales distintas y anotar los PID. |
| `down` | Lee `.dev-processes.json`, termina los procesos con `taskkill /PID ... /T /F`, elimina el archivo y ejecuta `docker stop resumedoc_db resumedoc_redis`. Los datos de PostgreSQL se conservan. | Cerrar las tres terminales (Ctrl+C) y ejecutar `docker stop resumedoc_db resumedoc_redis`. |
| `status` | Lista los contenedores Docker en ejecución. | `docker ps`. |
| `db` | Carga `DATABASE_URL` de `apps/api/.env` y abre una consola `psql`: entra al contenedor si la URL apunta a `localhost:5434`; si no, usa el `psql` local con `PGPASSWORD`. | `docker exec -it resumedoc_db psql -U resumedoc -d resumedoc` o `set PGPASSWORD=...` seguido de `psql -h <host> -p <puerto> -U <usuario> -d <bd>`. |

### Notas

- Antes de `up`, ejecuta `install` una vez. Las acciones `migrate`, `api`, `worker` y `db` necesitan `apps/api/.env`; si no existe, el script falla con un mensaje explícito.
- `dev.ps1` usa el intérprete `apps/api/venv/Scripts/python.exe`. La documentación manual de BD y backend describe un entorno `.venv` en la raíz; son dos formas de preparar el entorno, no hace falta usar ambas.
- `.dev-processes.json` se genera en la raíz al ejecutar `up` y se borra con `down`.
- `infra`, `up`, `down` y `status` requieren Docker Desktop en ejecución.
