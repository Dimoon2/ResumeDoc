"""HTTP router of the API (phase 0: minimal smoke-test endpoint).

Routers and schemas of later phases live in this package.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness endpoint used as smoke test of the composition."""
    return {"status": "ok", "message": "Servicio en funcionamiento."}
