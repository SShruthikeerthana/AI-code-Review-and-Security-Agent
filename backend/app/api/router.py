from fastapi import APIRouter

from app.api import assistant, auth, github, knowledge_base, submissions

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(github.router, prefix="/github", tags=["github"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(knowledge_base.router, prefix="/knowledge-base", tags=["knowledge-base"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["assistant"])

