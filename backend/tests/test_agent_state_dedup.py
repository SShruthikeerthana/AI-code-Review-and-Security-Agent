import sys
import os

sys.path.insert(0, os.path.abspath('backend'))

from app.agents.remediation import heal_syntax_and_quality_code, _generate_dynamic_full_remediated_code
from app.agents.code_analysis import perform_dynamic_code_analysis

USER_SUBMITTED_CODE = """import asyncio
import hashlib
import operator
import uuid
from typing import Annotated, Dict, List, TypedDict

class AgentState(TypedDict):
    submission_id: str
    source_code: str
    language: str
    code_findings: List[dict]
    security_findings: List[dict]
    merged_findings: List[dict]
    remediated_findings: List[dict]
    pr_summary: dict
    health_score: int
    errors: Annotated[List[str], operator.add]

    security_findings: List[dict]
    merged_findings: List[dict]
    remediated_findings: List[dict]
    pr_summary: dict
    health_score: int
    errors: Annotated[List[str], operator.add]

def process(state: AgentState):
    return state
"""

def test_code_analysis_detects_duplicate_fields():
    findings = perform_dynamic_code_analysis(USER_SUBMITTED_CODE, "python")
    dup_findings = [f for f in findings if "Duplicate Field" in f.get("title", "") or "Duplicate Code Pattern" in f.get("title", "")]
    assert len(dup_findings) >= 1, "Expected duplicate field finding to be flagged!"
    print(f"✅ Code Analysis detected {len(dup_findings)} duplicate field/pattern issue(s).")

def test_remediation_heals_duplicate_fields():
    healed = heal_syntax_and_quality_code(USER_SUBMITTED_CODE, "python")
    assert healed.count("security_findings: List[dict]") == 1, f"Expected 1 occurrence of security_findings, got {healed.count('security_findings: List[dict]')}"
    assert healed.count("merged_findings: List[dict]") == 1
    assert healed.count("remediated_findings: List[dict]") == 1
    assert healed.count("pr_summary: dict") == 1
    assert healed.count("health_score: int") == 1
    assert healed.count("errors: Annotated[List[str], operator.add]") == 1
    print("✅ heal_syntax_and_quality_code successfully deduplicated AgentState fields!")

def test_dynamic_remediator_deduplicates_class_fields():
    findings = perform_dynamic_code_analysis(USER_SUBMITTED_CODE, "python")
    remediated = _generate_dynamic_full_remediated_code(USER_SUBMITTED_CODE, "python", findings)
    assert remediated.count("security_findings: List[dict]") == 1
    assert remediated.count("merged_findings: List[dict]") == 1
    assert remediated.count("remediated_findings: List[dict]") == 1
    assert remediated.count("pr_summary: dict") == 1
    print("✅ _generate_dynamic_full_remediated_code successfully produced clean deduplicated AgentState class!")

if __name__ == "__main__":
    print("--- RUNNING DUP FIELD REMEDIATION TEST SUITE ---")
    test_code_analysis_detects_duplicate_fields()
    test_remediation_heals_duplicate_fields()
    test_dynamic_remediator_deduplicates_class_fields()
    print("\n🎉 ALL CLASS ATTRIBUTE DEDUPLICATION TESTS PASSED SUCCESSFULLY!")
