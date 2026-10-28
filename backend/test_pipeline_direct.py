import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath("."))

from app.database import SessionLocal
from app.models.submission import CodeSubmission, Language, SubmissionStatus
from app.agents.orchestrator import run_agent_analysis_pipeline

async def test():
    db = SessionLocal()
    sub = CodeSubmission(
        source_code="""import java.sql.*;
public class Test {
    private static final String KEY = "sk-proj-1234567890abcdef1234567890abcdef";
    public void run(Connection conn, String input) throws Exception {
        Statement stmt = conn.createStatement();
        stmt.executeQuery("SELECT * FROM users WHERE name = '" + input + "'");
    }
}""",
        language=Language.java,
        filename="Test.java",
        submission_type="paste",
        status=SubmissionStatus.pending
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    print("Created submission:", sub.id)

    print("Running pipeline...")
    await run_agent_analysis_pipeline(sub.id)

    db.refresh(sub)
    print("Pipeline finished!")
    print("Status:", sub.status.value)
    print("PR Summary Keys:", list(sub.pr_summary.keys()) if sub.pr_summary else None)
    if sub.pr_summary:
        print("Full Remediated Code:\n", sub.pr_summary.get("full_remediated_code"))
        print("Self-Healing Metadata:\n", sub.pr_summary.get("self_healing_metadata"))
    if sub.validation_errors:
        print("Validation Errors:\n", sub.validation_errors)

asyncio.run(test())
