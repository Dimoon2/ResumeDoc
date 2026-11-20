"""Summarization port: generate a structured summary from extracted text."""

from dataclasses import dataclass
from typing import Literal, Protocol


SynthesisDepth = Literal["executive", "detailed", "bullets"]


@dataclass(frozen=True)
class SummaryResult:
    """Outcome of a summarization run."""

    executive_summary: str
    key_points: list[str]
    action_items: list[dict[str, str]]
    topics: list[str]
    word_count_original: int
    word_count_summary: int
    reading_time_minutes: int
    source_excerpt: str


class SummarizerError(Exception):
    """Base error raised when a summarizer cannot produce a result."""


class SummarizerUnavailable(SummarizerError):
    """Gemini is not configured or cannot be reached."""


class SummarizerFailed(SummarizerError):
    """Gemini returned an error or an unusable response."""


class Summarizer(Protocol):
    """Port: turn extracted text into a structured summary."""

    def summarize(self, text: str, depth: SynthesisDepth) -> SummaryResult:
        """Produce a summary of `text` at the requested `depth`."""
        ...
