import os
import sys
import uuid
import pytest

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.code_analysis import analyze_code_quality
from app.agents.security_vulnerability import scan_security_vulnerabilities
from app.agents.remediation import generate_remediations, generate_full_remediated_code
from app.agents.pr_summary import generate_pr_summary, calculate_health_score
from app.agents.conversational_assistant import generate_assistant_response
from app.agents.orchestrator import orchestrator_app
from app.rag.indexer import knowledge_base_retriever
from app.services.report_generator import report_generator
from app.models.submission import CodeSubmission, Language, SubmissionType, SubmissionStatus

SAMPLES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "samples"))

@pytest.fixture
def python_sample_code():
    with open(os.path.join(SAMPLES_DIR, "vulnerable_python.py"), "r", encoding="utf-8") as f:
        return f.read()

@pytest.fixture
def java_sample_code():
    with open(os.path.join(SAMPLES_DIR, "vulnerable_java.java"), "r", encoding="utf-8") as f:
        return f.read()

@pytest.fixture
def banking_sample_code():
    with open(os.path.join(SAMPLES_DIR, "complex_banking_service.py"), "r", encoding="utf-8") as f:
        return f.read()


@pytest.mark.asyncio
async def test_milestone4_e2e_python_sample(python_sample_code):
    """End-to-End pipeline execution on vulnerable Python sample."""
    initial_state = {
        "submission_id": "test-e2e-py",
        "source_code": python_sample_code,
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
    
    assert len(result_state["merged_findings"]) > 0
    assert len(result_state["remediated_findings"]) > 0
    
    # Check security findings for OWASP Top 10 vulnerabilities
    sec_categories = [f.get("category") for f in result_state["security_findings"]]
    assert "sql_injection" in sec_categories or "secrets" in sec_categories
    
    # Check Remediation enrichment
    for f in result_state["remediated_findings"]:
        assert "remediation_summary" in f
        assert "corrected_code" in f
        assert "best_practice_explanation" in f
    
    # Check PR Summary & Health Score
    pr_sum = result_state["pr_summary"]
    assert "title" in pr_sum
    assert "executive_overview" in pr_sum
    assert "health_score" in pr_sum
    assert pr_sum["health_score"] < 100
    assert len(pr_sum.get("owasp_mapping", [])) > 0
    assert len(pr_sum.get("prioritized_fix_list", [])) > 0
    
    # Test Report Generator on Python submission
    submission_model = CodeSubmission(
        id=uuid.uuid4(),
        source_code=python_sample_code,
        language=Language.python,
        submission_type=SubmissionType.paste,
        filename="vulnerable_python.py",
        status=SubmissionStatus.completed,
        health_score=pr_sum["health_score"],
        severity_scores={"critical": 2, "high": 1, "medium": 1, "low": 1, "info": 0},
        findings=result_state["remediated_findings"],
        pr_summary=pr_sum
    )
    
    pdf_bytes = report_generator.generate_submission_pdf(submission_model)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF-")
    
    md_report = report_generator.generate_submission_markdown(submission_model)
    assert "Development of Smart Code Inspection Platform" in md_report
    assert "OWASP Standard Vulnerability Mapping" in md_report
    assert "Prioritized Remediation Roadmap" in md_report
    
    json_report = report_generator.generate_submission_json(submission_model)
    assert json_report["health_score"] == pr_sum["health_score"]
    assert len(json_report["findings"]) > 0


@pytest.mark.asyncio
async def test_milestone4_e2e_java_sample(java_sample_code):
    """End-to-End pipeline execution on vulnerable Java sample."""
    initial_state = {
        "submission_id": "test-e2e-java",
        "source_code": java_sample_code,
        "language": "java",
        "code_findings": [],
        "security_findings": [],
        "merged_findings": [],
        "remediated_findings": [],
        "pr_summary": {},
        "health_score": 100,
        "errors": []
    }
    
    result_state = await orchestrator_app.ainvoke(initial_state)
    
    assert len(result_state["merged_findings"]) > 0
    
    # Verify Java SQLi & Command Injection detection
    categories = [f.get("category") for f in result_state["merged_findings"]]
    assert "sql_injection" in categories or "command_injection" in categories
    
    # Verify report exports for Java
    pr_sum = result_state["pr_summary"]
    submission_model = CodeSubmission(
        id=uuid.uuid4(),
        source_code=java_sample_code,
        language=Language.java,
        submission_type=SubmissionType.upload,
        filename="SecurityAnalysisSample.java",
        status=SubmissionStatus.completed,
        health_score=pr_sum.get("health_score", 70),
        severity_scores={"critical": 2, "high": 0, "medium": 1, "low": 0, "info": 0},
        findings=result_state["remediated_findings"],
        pr_summary=pr_sum
    )
    
    pdf_bytes = report_generator.generate_submission_pdf(submission_model)
    assert len(pdf_bytes) > 500
    
    md_report = report_generator.generate_submission_markdown(submission_model)
    assert "JAVA" in md_report


@pytest.mark.asyncio
async def test_milestone4_e2e_complex_banking_sample(banking_sample_code):
    """End-to-End pipeline execution on high-complexity Python enterprise banking sample."""
    initial_state = {
        "submission_id": "test-e2e-banking",
        "source_code": banking_sample_code,
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
    
    # High-complexity sample should flag multiple findings across security and quality
    assert len(result_state["merged_findings"]) >= 3
    
    # Full remediated code file should be generated
    pr_sum = result_state["pr_summary"]
    assert "full_remediated_code" in pr_sum
    assert len(pr_sum["full_remediated_code"]) > 100


def test_milestone4_rag_retrieval_and_conversational_assistant():
    """Validate RAG retrieval relevance and Conversational Assistant response quality."""
    # Test RAG query against Chroma DB vector store
    chunks = knowledge_base_retriever.query("How to prevent SQL injection?", top_k=3)
    assert len(chunks) > 0
    assert any("sql" in c["content"].lower() or "owasp" in c["content"].lower() for c in chunks)
    
    # Test Conversational Assistant Q&A response
    res = generate_assistant_response(
        user_message="What is the OWASP recommendation for handling hardcoded credentials?",
        submission_context={"language": "python", "source_code": "API_KEY = 'sk-12345'", "findings": []}
    )
    
    assert "reply" in res
    assert len(res["reply"]) > 50
    assert "environment" in res["reply"].lower() or "secret" in res["reply"].lower() or "credential" in res["reply"].lower()
    assert "rag_sources" in res
