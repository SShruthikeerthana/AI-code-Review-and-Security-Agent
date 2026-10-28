from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.rag.indexer import knowledge_base_indexer, knowledge_base_retriever
from app.schemas.submission import (
    KnowledgeBaseQueryRequest,
    KnowledgeBaseQueryResponse,
    KnowledgeBaseStatusResponse,
    RetrievedChunk,
)

router = APIRouter()


@router.post("/index")
def index_knowledge_base(db: Session = Depends(get_db)):
    try:
        result = knowledge_base_indexer.index_all(db)
        return {"message": "Knowledge base indexed successfully", **result}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {exc}") from exc


@router.get("/status", response_model=KnowledgeBaseStatusResponse)
def knowledge_base_status(db: Session = Depends(get_db)):
    status = knowledge_base_indexer.get_status(db)
    return KnowledgeBaseStatusResponse(**status)


@router.post("/query", response_model=KnowledgeBaseQueryResponse)
def query_knowledge_base(payload: KnowledgeBaseQueryRequest, db: Session = Depends(get_db)):
    status = knowledge_base_indexer.get_status(db)
    if not status["is_indexed"]:
        raise HTTPException(
            status_code=400,
            detail="Knowledge base is not indexed. POST /api/v1/knowledge-base/index first.",
        )

    results = knowledge_base_retriever.query(payload.query, top_k=payload.top_k)
    return KnowledgeBaseQueryResponse(
        query=payload.query,
        results=[RetrievedChunk(**r) for r in results],
    )
