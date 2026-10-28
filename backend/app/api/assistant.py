from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.submission import CodeSubmission
from app.schemas.submission import (
    ConversationalChatRequest,
    ConversationalChatResponse,
    RetrievedChunk,
)
from app.agents.conversational_assistant import generate_assistant_response

router = APIRouter()


@router.post("/chat", response_model=ConversationalChatResponse)
def assistant_chat(
    payload: ConversationalChatRequest,
    db: Session = Depends(get_db)
):
    submission_context = None
    if payload.submission_id:
        submission = db.query(CodeSubmission).filter(CodeSubmission.id == payload.submission_id).first()
        if submission:
            submission_context = {
                "id": str(submission.id),
                "language": submission.language.value,
                "source_code": submission.source_code,
                "findings": submission.findings,
                "severity_scores": submission.severity_scores,
                "health_score": submission.health_score,
                "pr_summary": submission.pr_summary,
            }

    try:
        result = generate_assistant_response(
            user_message=payload.message,
            submission_context=submission_context,
            chat_history=payload.chat_history
        )
        
        sources = [RetrievedChunk(**s) for s in result.get("rag_sources", [])]
        return ConversationalChatResponse(
            reply=result["reply"],
            rag_sources=sources
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Assistant failed: {str(exc)}") from exc
