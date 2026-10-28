from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class LanguageEnum(str, Enum):
    python = "python"
    java = "java"


class SubmissionTypeEnum(str, Enum):
    paste = "paste"
    upload = "upload"


class SubmissionStatusEnum(str, Enum):
    pending = "pending"
    analyzing = "analyzing"
    completed = "completed"
    failed = "failed"


class ValidationErrorDetail(BaseModel):
    line: int | None = None
    column: int | None = None
    message: str
    severity: str | None = None
    category: str | None = None


class FindingDetail(BaseModel):
    id: str
    agent_source: str
    category: str
    severity: str
    title: str
    description: str
    line_number: int | None = None
    cwe_id: str | None = None
    owasp_category: str | None = None
    remediation_summary: str | None = None
    corrected_code: str | None = None
    best_practice_explanation: str | None = None


class PRSummaryDetail(BaseModel):
    title: str
    executive_overview: str
    health_score: int
    severity_breakdown: dict[str, int]
    owasp_mapping: list[dict[str, str]]
    prioritized_fix_list: list[dict[str, str]]


class PasteSubmissionRequest(BaseModel):
    source_code: str = Field(..., min_length=1, max_length=500_000)
    language: LanguageEnum | None = None
    filename: str | None = Field(default=None, max_length=255)

    @field_validator("source_code")
    @classmethod
    def strip_code(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Source code cannot be empty")
        return value


class SubmissionResponse(BaseModel):
    id: UUID
    language: LanguageEnum
    source_code: str
    filename: str | None
    submission_type: SubmissionTypeEnum
    is_valid_syntax: bool
    validation_errors: list[ValidationErrorDetail] | None
    findings: list[FindingDetail] | None = None
    severity_scores: dict[str, int] | None = None
    health_score: int | None = None
    pr_summary: dict | None = None
    status: SubmissionStatusEnum
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SubmissionListResponse(BaseModel):
    items: list[SubmissionResponse]
    total: int


class KnowledgeBaseStatusResponse(BaseModel):
    is_indexed: bool
    total_documents: int
    total_chunks: int
    documents: list[dict]
    collection_name: str


class KnowledgeBaseQueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=1000)
    top_k: int = Field(default=4, ge=1, le=10)


class RetrievedChunk(BaseModel):
    content: str
    source: str
    category: str
    score: float | None = None


class KnowledgeBaseQueryResponse(BaseModel):
    query: str
    results: list[RetrievedChunk]


class ConversationalChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    submission_id: UUID | None = None
    chat_history: list[dict[str, str]] | None = None


class ConversationalChatResponse(BaseModel):
    reply: str
    rag_sources: list[RetrievedChunk] | None = None

