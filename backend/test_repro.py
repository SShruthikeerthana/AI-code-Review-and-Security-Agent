import asyncio
import traceback
from app.database import SessionLocal
from app.models.submission import CodeSubmission
from app.agents.orchestrator import run_agent_analysis_pipeline

db = SessionLocal()
s = db.query(CodeSubmission).order_by(CodeSubmission.created_at.desc()).first()
print("Testing Submission ID:", s.id)
try:
    asyncio.run(run_agent_analysis_pipeline(s.id))
    print("SUCCESS!")
except Exception:
    traceback.print_exc()
