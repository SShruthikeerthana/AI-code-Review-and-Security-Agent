import os
import sys
import pytest

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.remediation import generate_remediations, get_mock_remediations
from app.agents.pr_summary import generate_pr_summary, calculate_health_score
from app.agents.conversational_assistant import generate_assistant_response
from app.agents.orchestrator import orchestrator_app

SAMPLES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "samples"))

@pytest.fixture
def sample_findings():
    return [
        {
            "id": "test-finding-1",
            "agent_source": "security_vulnerability",
            "category": "sql_injection",
            "severity": "critical",
            "title": "SQL Injection in User Query",
            "description": "Raw string concatenation in SQL query allows SQL Injection.",
            "line_number": 3,
            "cwe_id": "CWE-89",
            "owasp_category": "A03:2021-Injection"
        },
        {
            "id": "test-finding-2",
            "agent_source": "code_analysis",
            "category": "complexity",
            "severity": "medium",
            "title": "High Cyclomatic Complexity",
            "description": "Deeply nested conditional structures in logic.",
            "line_number": 10,
            "cwe_id": None,
            "owasp_category": None
        }
    ]

def test_remediation_agent(sample_findings):
    """Test Remediation Agent generates corrected code and best practices."""
    source_code = "def get_user(user_id):\n    query = f'SELECT * FROM users WHERE id = {user_id}'\n    return query"
    enriched = generate_remediations(source_code, "python", sample_findings)
    assert isinstance(enriched, list)
    assert len(enriched) == len(sample_findings)
    
    for f in enriched:
        assert "remediation_summary" in f
        assert "corrected_code" in f
        assert "best_practice_explanation" in f
        assert len(f["corrected_code"]) > 0

def test_pr_summary_agent(sample_findings):
    """Test PR Summary Agent calculates health score and generates PR summary."""
    source_code = "def test(): pass"
    severity_counts = {"critical": 1, "high": 0, "medium": 1, "low": 0, "info": 0}
    
    score = calculate_health_score(severity_counts)
    assert score == 100 - (30 * 1) - (8 * 1) # 62
    
    summary = generate_pr_summary(source_code, "python", sample_findings, severity_counts)
    assert "title" in summary
    assert "executive_overview" in summary
    assert "health_score" in summary
    assert summary["health_score"] == score
    assert "owasp_mapping" in summary
    assert len(summary["owasp_mapping"]) > 0

def test_conversational_assistant():
    """Test Conversational Assistant RAG query response."""
    # 1. SQL Injection query
    res = generate_assistant_response(
        user_message="How do I prevent SQL Injection in Python?",
        submission_context=None
    )
    assert "reply" in res
    assert len(res["reply"]) > 0
    assert "sql" in res["reply"].lower() or "parameter" in res["reply"].lower()

    # 2. Command Injection query
    res_cmd = generate_assistant_response(
        user_message="How do I prevent command injection in subprocess?",
        submission_context=None
    )
    assert "command injection" in res_cmd["reply"].lower() or "cwe-78" in res_cmd["reply"].lower()
    assert "subprocess" in res_cmd["reply"].lower()
    # Ensure command injection is not hijacked by SQL injection block
    assert "sql injection" not in res_cmd["reply"].lower()[:200]

    # 3. Cross-Site Scripting query
    res_xss = generate_assistant_response(
        user_message="Tell me about XSS prevention.",
        submission_context=None
    )
    assert "cross-site scripting" in res_xss["reply"].lower() or "xss" in res_xss["reply"].lower()

    # 4. Unknown/Dynamic query using retrieved ChromaDB context
    res_dyn = generate_assistant_response(
        user_message="owasp guide rules",
        submission_context=None
    )
    assert "owasp" in res_dyn["reply"].lower()
    assert "rag_sources" in res_dyn
    assert len(res_dyn["rag_sources"]) > 0

@pytest.mark.asyncio
async def test_full_orchestrator_pipeline_milestone3():
    """Test full LangGraph orchestration graph execution containing Remediation and PR Summary nodes."""
    source_code = (
        "def process_user(user_id):\n"
        "    API_SECRET_KEY = 'sk-secret-12345'\n"
        "    query = 'SELECT * FROM users WHERE id = ' + str(user_id)\n"
        "    return query\n"
    )
    
    initial_state = {
        "submission_id": "test-m3-id",
        "source_code": source_code,
        "language": "python",
        "code_findings": [],
        "security_findings": [],
        "merged_findings": [],
        "remediated_findings": [],
        "pr_summary": {},
        "health_score": 100,
        "errors": []
    }
    
    result_state = await orchestrator_app.ainvoke(initial_state)
    assert "remediated_findings" in result_state
    assert "pr_summary" in result_state
    assert "health_score" in result_state
    
    rem_findings = result_state["remediated_findings"]
    assert len(rem_findings) > 0
    for f in rem_findings:
        assert "corrected_code" in f
        assert "remediation_summary" in f


def test_report_generator_exports(sample_findings):
    """Test Report Generator for PDF, Markdown, and JSON exports."""
    from app.services.report_generator import report_generator
    from app.models.submission import CodeSubmission, Language, SubmissionType, SubmissionStatus
    import uuid

    mock_sub = CodeSubmission(
        id=uuid.uuid4(),
        source_code="def login(): pass",
        language=Language.python,
        submission_type=SubmissionType.paste,
        filename="login.py",
        status=SubmissionStatus.completed,
        health_score=85,
        severity_scores={"critical": 0, "high": 1, "medium": 0, "low": 0, "info": 0},
        findings=sample_findings,
        pr_summary={
            "title": "PR Review",
            "executive_overview": "Security review completed.",
            "health_score": 85,
            "severity_breakdown": {"critical": 0, "high": 1, "medium": 0, "low": 0, "info": 0},
            "owasp_mapping": [{"category": "A03:2021-Injection", "finding_title": "SQLi", "risk_level": "High"}],
            "prioritized_fix_list": [{"priority": 1, "issue_title": "SQLi", "action_item": "Use param queries"}]
        }
    )

    pdf_bytes = report_generator.generate_submission_pdf(mock_sub)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0

    md_str = report_generator.generate_submission_markdown(mock_sub)
    assert isinstance(md_str, str)
    assert "Development of Smart Code Inspection Platform" in md_str
    assert "OWASP Standard Vulnerability Mapping" in md_str

    json_dict = report_generator.generate_submission_json(mock_sub)
    assert isinstance(json_dict, dict)
    assert json_dict["health_score"] == 85
    assert json_dict["language"] == "python"

