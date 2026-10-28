import os
import sys
import pytest

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.code_analysis import analyze_code_quality
from app.agents.security_vulnerability import scan_security_vulnerabilities
from app.agents.orchestrator import run_agent_analysis_pipeline, orchestrator_app

SAMPLES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "samples"))

@pytest.fixture
def vulnerable_python_code():
    file_path = os.path.join(SAMPLES_DIR, "vulnerable_python.py")
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

@pytest.fixture
def vulnerable_java_code():
    file_path = os.path.join(SAMPLES_DIR, "vulnerable_java.java")
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

def test_code_analysis_agent_python(vulnerable_python_code):
    """Test Code Analysis Agent on Python codebase with known quality issues."""
    findings = analyze_code_quality(vulnerable_python_code, "python")
    assert isinstance(findings, list)
    assert len(findings) > 0
    
    # Check that complexity or code smell issue is detected
    categories = [f.get("category") for f in findings]
    severities = [f.get("severity") for f in findings]
    assert any(c in ["complexity", "code_smell", "anti_pattern", "poor_practice"] for c in categories)
    assert any(s in ["critical", "high", "medium", "low", "info"] for s in severities)

def test_security_vulnerability_agent_python(vulnerable_python_code):
    """Test Security Vulnerability Agent on Python codebase with known vulnerabilities."""
    findings = scan_security_vulnerabilities(vulnerable_python_code, "python")
    assert isinstance(findings, list)
    assert len(findings) > 0
    
    # Check for hardcoded secrets, SQL injection, or weak hashes
    cwe_ids = [f.get("cwe_id") for f in findings if f.get("cwe_id")]
    categories = [f.get("category") for f in findings]
    assert any(cwe in ["CWE-798", "CWE-89", "CWE-328"] for cwe in cwe_ids) or \
           any(cat in ["secrets", "sql_injection", "auth_flaw"] for cat in categories)

def test_security_vulnerability_agent_java(vulnerable_java_code):
    """Test Security Vulnerability Agent on Java codebase with known vulnerabilities."""
    findings = scan_security_vulnerabilities(vulnerable_java_code, "java")
    assert isinstance(findings, list)
    assert len(findings) > 0
    
    # Check for SQL injection or Command Injection
    categories = [f.get("category") for f in findings]
    assert any(cat in ["sql_injection", "command_injection"] for cat in categories)

@pytest.mark.asyncio
async def test_orchestrator_parallel_execution(vulnerable_python_code):
    """Test multi-agent orchestration parallel execution and findings merging."""
    initial_state = {
        "submission_id": "test-id",
        "source_code": vulnerable_python_code,
        "language": "python",
        "code_findings": [],
        "security_findings": [],
        "merged_findings": [],
        "errors": []
    }
    
    result_state = await orchestrator_app.ainvoke(initial_state)
    assert "merged_findings" in result_state
    merged = result_state["merged_findings"]
    assert len(merged) > 0
    
    sources = set(f.get("agent_source") for f in merged)
    assert "code_analysis" in sources or "security_vulnerability" in sources
