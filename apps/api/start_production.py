"""Run DB migrations, Celery and the API together on the shared storage disk."""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
API_DIR = ROOT / "apps" / "api"


def main() -> int:
    subprocess.run(["alembic", "upgrade", "head"], cwd=ROOT, check=True)

    worker = subprocess.Popen(
        ["celery", "-A", "src.worker:celery_app", "worker", "--loglevel=info"],
        cwd=API_DIR,
    )
    api = subprocess.Popen(
        [
            "uvicorn",
            "src.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            os.environ.get("PORT", "10000"),
        ],
        cwd=API_DIR,
    )

    try:
        while True:
            worker_code = worker.poll()
            api_code = api.poll()
            if worker_code is not None:
                return worker_code or 1
            if api_code is not None:
                return api_code
            time.sleep(1)
    except KeyboardInterrupt:
        return 0
    finally:
        for process in (api, worker):
            if process.poll() is None:
                process.terminate()
        for process in (api, worker):
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
        if worker.returncode not in (None, 0):
            print(f"El worker terminó con código {worker.returncode}.", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
