"""HTTP endpoints for summarizing pasted text."""

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from src.adapters.http.dependencies import current_user, get_summarizer
from src.adapters.http.schemas import SummaryResponse, TextSummaryRequest
from src.application.ports.summarization import (
    Summarizer,
    SummarizerFailed,
    SummarizerUnavailable,
)
from src.domain.user import AuthContext

router = APIRouter(prefix="/summaries", tags=["summaries"])


@router.post("/text", response_model=SummaryResponse)
def summarize_text(
    payload: TextSummaryRequest,
    _user: AuthContext = Depends(current_user),
    summarizer: Summarizer = Depends(get_summarizer),
) -> SummaryResponse:
    """Generate a summary from text pasted into the frontend."""
    try:
        result = summarizer.summarize(payload.text_content, payload.depth)
    except SummarizerUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except SummarizerFailed as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return SummaryResponse(
        id=f"summary-text-{uuid4().hex}",
        executive_summary=result.executive_summary,
        key_points=result.key_points,
        action_items=result.action_items,
        topics=result.topics,
        word_count_original=result.word_count_original,
        word_count_summary=result.word_count_summary,
        reading_time_minutes=result.reading_time_minutes,
        source_excerpt=result.source_excerpt,
    )
