"""Document endpoints (T-08/T-15): upload and status polling (CA-5)."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from src.adapters.http.dependencies import (
    current_user,
    get_repository,
    get_state_store,
    get_storage,
    get_task_queue,
)
from src.adapters.http.schemas import DocumentStatusResponse, UploadedDocumentResponse
from src.application.ports.document_repository import DocumentRepository
from src.application.ports.document_state_store import DocumentStateStore
from src.application.ports.file_storage import FileStorage
from src.application.ports.task_queue import TaskQueue
from src.application.usecases import documents as document_usecases
from src.core.config import get_settings
from src.domain.document import DocumentTooLarge, DocumentUploadError
from src.domain.user import AuthContext

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=UploadedDocumentResponse, status_code=201)
def upload(
    file: UploadFile,
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    storage: FileStorage = Depends(get_storage),
    queue: TaskQueue = Depends(get_task_queue),
) -> UploadedDocumentResponse:
    """Upload a PDF/PNG/JPG; enqueues processing and answers immediately
    (RNF-2). `status` is application-level state (D-24)."""
    try:
        document = document_usecases.upload_document(
            storage,
            repository,
            queue,
            file.filename or "",
            file.file.read(),
            user.user_id,
            get_settings().max_upload_mb,
        )
    except DocumentTooLarge as exc:
        raise HTTPException(status_code=413, detail=str(exc))
    except DocumentUploadError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return UploadedDocumentResponse(id=document.id)


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
def status(
    document_id: int,
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    states: DocumentStateStore = Depends(get_state_store),
) -> DocumentStatusResponse:
    """Polling of the pipeline state; 404 uniform for unknown or foreign
    documents (CA-5, CA-15)."""
    document = repository.get_document(document_id)
    if document is None or (
        document.owner_id != user.user_id and user.role != "admin"
    ):
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    state = states.get(document_id)
    if state is None:
        # Sin estado en Redis (o perdido): todavía no procesado → pending.
        return DocumentStatusResponse(id=document_id, status="pending")
    return DocumentStatusResponse(
        id=document_id, status=state.status, error=state.error
    )
