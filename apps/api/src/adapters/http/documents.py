"""Document endpoints (T-08/T-15): upload, polling (CA-5) and the CRUD
read/update/delete surface (list, detail, text, rename, delete)."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse

from src.adapters.http.dependencies import (
    current_user,
    get_repository,
    get_state_store,
    get_storage,
    get_summarizer,
    get_task_queue,
)
from src.adapters.http.schemas import (
    DocumentResponse,
    DocumentStatusResponse,
    RenameDocumentRequest,
    SummaryResponse,
    SummarizeRequest,
    UpdateTextRequest,
    UploadedDocumentResponse,
)
from src.application.ports.document_repository import DocumentRepository
from src.application.ports.document_state_store import DocumentStateStore
from src.application.ports.file_storage import FileStorage
from src.application.ports.summarization import (
    Summarizer,
    SummarizerFailed,
    SummarizerUnavailable,
)
from src.application.ports.task_queue import TaskQueue
from src.application.usecases import documents as document_usecases
from src.application.usecases.summaries import (
    DocumentNotCompleted,
    DocumentNotFound,
    summarize_document,
)
from src.core.config import get_settings
from src.domain.document import (
    Document,
    DocumentState,
    DocumentTooLarge,
    DocumentUploadError,
)
from src.domain.user import AuthContext

router = APIRouter(prefix="/documents", tags=["documents"])


def _accessible_document(
    document: Document | None, user: AuthContext
) -> Document:
    """Authorization in one place (CA-5/CA-15): owner or admin, 404 uniform
    for unknown or foreign documents."""
    if document is None or (
        document.owner_id != user.user_id and user.role != "admin"
    ):
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    return document


def _to_response(
    document: Document, states: DocumentStateStore
) -> DocumentResponse:
    state = states.get(document.id)
    return DocumentResponse(
        id=document.id,
        name=document.name,
        size_bytes=document.size_bytes,
        status=state.status if state else "pending",
        error=state.error if state else "",
    )


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


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    states: DocumentStateStore = Depends(get_state_store),
) -> list[DocumentResponse]:
    """List documents: own ones for `user`, all of them for `admin` (D-27)."""
    owner = None if user.role == "admin" else user.user_id
    return [
        _to_response(document, states)
        for document in repository.list_documents(owner)
    ]


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    states: DocumentStateStore = Depends(get_state_store),
) -> DocumentResponse:
    """Metadata + state of one document; 404 uniform (CA-5, CA-15)."""
    document = _accessible_document(repository.get_document(document_id), user)
    return _to_response(document, states)


@router.get("/{document_id}/text", response_class=PlainTextResponse)
def get_document_text(
    document_id: int,
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    states: DocumentStateStore = Depends(get_state_store),
    storage: FileStorage = Depends(get_storage),
) -> str:
    """Extracted text (D-25): only once the pipeline is completed; empty
    text is a valid outcome (D-09)."""
    document = _accessible_document(repository.get_document(document_id), user)
    state = states.get(document_id)
    if state is None or state.status != "completed":
        raise HTTPException(
            status_code=409, detail="El texto todavía no está disponible."
        )
    try:
        return storage.read_text(state.text_path) if state.text_path else ""
    except OSError as exc:
        raise HTTPException(
            status_code=500, detail="El texto no está disponible."
        ) from exc


@router.patch("/{document_id}", response_model=DocumentResponse)
def rename_document(
    document_id: int,
    payload: RenameDocumentRequest,
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    states: DocumentStateStore = Depends(get_state_store),
) -> DocumentResponse:
    """Rename the document (metadata only; the file location never changes)."""
    document = _accessible_document(repository.get_document(document_id), user)
    renamed = repository.rename_document(document_id, payload.name)
    assert renamed is not None  # existe: lo acabamos de leer
    return _to_response(renamed, states)


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    states: DocumentStateStore = Depends(get_state_store),
    storage: FileStorage = Depends(get_storage),
) -> None:
    """Delete the record, the file referenced by `ubicacion` (the processed
    text for completed documents, the original binary otherwise — the
    binary is purged at processing time) and the pipeline state (D-24);
    409 while the worker is processing it (D-15)."""
    document = _accessible_document(repository.get_document(document_id), user)
    state = states.get(document_id)
    if state is not None and state.status == "processing":
        raise HTTPException(
            status_code=409,
            detail="El documento está en procesamiento; no se puede eliminar.",
        )
    repository.delete_document(document_id)
    storage.delete(document.location)
    states.delete(document_id)


# PUT y PATCH guardan el mismo recurso: PUT es el contrato ya integrado en
# el frontend; PATCH lo usa la vista de detalle (guardado automático).
@router.put("/{document_id}/text", status_code=204)
@router.patch("/{document_id}/text", status_code=204)
def update_document_text(
    document_id: int,
    payload: UpdateTextRequest,
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    states: DocumentStateStore = Depends(get_state_store),
    storage: FileStorage = Depends(get_storage),
) -> None:
    """Edited text overwrites the original extraction file (D-25/D-11);
    only completed documents are editable (D-10)."""
    _accessible_document(repository.get_document(document_id), user)
    state = states.get(document_id)
    if state is None or state.status != "completed":
        raise HTTPException(
            status_code=409,
            detail="Solo se puede editar el texto de un documento completado.",
        )
    if state.text_path:
        storage.write_text(state.text_path, payload.text)
    else:
        # Texto original vacío (D-09): la primera edición crea el archivo.
        states.set(
            document_id,
            DocumentState("completed", text_path=storage.save_text(payload.text)),
        )


@router.post("/{document_id}/summary", response_model=SummaryResponse)
def summarize(
    document_id: int,
    payload: SummarizeRequest,
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    state_store: DocumentStateStore = Depends(get_state_store),
    storage: FileStorage = Depends(get_storage),
    summarizer: Summarizer = Depends(get_summarizer),
) -> SummaryResponse:
    """Generate a summary from the extracted text of a completed document."""
    _accessible_document(repository.get_document(document_id), user)
    try:
        result = summarize_document(
            repository=repository,
            state_store=state_store,
            storage=storage,
            summarizer=summarizer,
            document_id=document_id,
            depth=payload.depth,
        )
    except DocumentNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except DocumentNotCompleted as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except OSError as exc:
        raise HTTPException(
            status_code=409, detail="El texto extraído ya no está disponible."
        ) from exc
    except SummarizerUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except SummarizerFailed as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return SummaryResponse(
        id=f"summary-{document_id}",
        executive_summary=result.executive_summary,
        key_points=result.key_points,
        action_items=result.action_items,
        topics=result.topics,
        word_count_original=result.word_count_original,
        word_count_summary=result.word_count_summary,
        reading_time_minutes=result.reading_time_minutes,
        source_excerpt=result.source_excerpt,
    )
@router.post(
    "/{document_id}/reprocess", response_model=DocumentResponse, status_code=202
)
def reprocess_document(
    document_id: int,
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    states: DocumentStateStore = Depends(get_state_store),
    storage: FileStorage = Depends(get_storage),
) -> DocumentResponse:
    """Regenerate the derived artifacts from the edited text: the document
    shows `processing` like the normal pipeline (409 if not `completed` or
    without text)."""
    document = _accessible_document(repository.get_document(document_id), user)
    try:
        document_usecases.reprocess_document(storage, states, document.id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return _to_response(document, states)


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
def status(
    document_id: int,
    user: AuthContext = Depends(current_user),
    repository: DocumentRepository = Depends(get_repository),
    states: DocumentStateStore = Depends(get_state_store),
) -> DocumentStatusResponse:
    """Polling of the pipeline state; 404 uniform for unknown or foreign
    documents (CA-5, CA-15)."""
    document = _accessible_document(repository.get_document(document_id), user)
    state = states.get(document_id)
    if state is None:
        # Sin estado en Redis (o perdido): todavía no procesado → pending.
        return DocumentStatusResponse(id=document_id, status="pending")
    return DocumentStatusResponse(
        id=document_id, status=state.status, error=state.error
    )
