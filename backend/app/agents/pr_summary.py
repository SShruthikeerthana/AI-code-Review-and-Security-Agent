import os
import json
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from pydantic import BaseModel, Field
from app.config import settings
from app.services.model_resolver import get_active_llm_model


class OWASPMappingItem(BaseModel):
    category: str = Field(description="OWASP category ID and title, e.g. A03:2021-Injection")
    finding_title: str = Field(description="Title of the flagged finding mapped to this OWASP category")
    risk_level: str = Field(description="Risk level: Critical, High, Medium, or Low")


class PrioritizedFixItem(BaseModel):
    priority: int = Field(description="Priority rank (1 being highest priority)")
    issue_title: str = Field(description="Title of the issue")
    action_item: str = Field(description="Recommended action to remediate")


class PRSummaryResult(BaseModel):
    title: str = Field(description="Pull Request Code Review Title")
    executive_overview: str = Field(description="Executive summary of security vulnerabilities, quality smells, and overall code health")
    health_score: int = Field(description="Overall code health score from 0 (very insecure) to 100 (clean)")
    owasp_mapping: List[OWASPMappingItem] = Field(description="Mapping of findings to OWASP Top 10 categories")
    prioritized_fix_list: List[PrioritizedFixItem] = Field(description="Prioritized roadmap of fixes to apply")
    full_remediated_code: Optional[str] = Field(default=None, description="Full complete refactored production-ready code file")



SYSTEM_PROMPT = """
You are an expert PR Summary Agent and Lead Security Architect.
Your job is to synthesize all findings from Code Analysis, Security Vulnerabilities, and Remediation agents into a structured, executive-grade Pull Request Review Summary.

Generate a comprehensive review summary containing:
1. title: Professional PR review title (e.g. "Security & Code Quality Review: Issues Detected").
2. executive_overview: Concise overview detailing critical security risks, architectural concerns, and maintainability impacts.
3. health_score: Calculated Code Health Score between 0 and 100 based on flagged severities.
4. owasp_mapping: List of flagged security findings mapped to official OWASP Top 10 standards.
5. prioritized_fix_list: Ranked list of actionable fixes in order of urgency.

Return strictly conforming to the JSON schema.
"""


def calculate_health_score(severity_counts: Dict[str, int]) -> int:
    score = 100
    score -= severity_counts.get("critical", 0) * 30
    score -= severity_counts.get("high", 0) * 15
    score -= severity_counts.get("medium", 0) * 8
    score -= severity_counts.get("low", 0) * 3
    score -= severity_counts.get("info", 0) * 1
    return max(0, min(100, score))


def get_mock_pr_summary(source_code: str, language: str, findings: List[Dict], severity_counts: Dict[str, int]) -> Dict[str, Any]:
    health_score = calculate_health_score(severity_counts)
    
    if not findings:
        return {
            "title": f"PR Code Review: Clean & Secure ({language.upper()})",
            "executive_overview": (
                f"Automated multi-agent analysis completed cleanly with a Code Health Score of {health_score}/100. "
                "No critical OWASP security vulnerabilities, compiler syntax errors, or code smells were detected. "
                "The code complies with secure development standards and is safe for merging."
            ),
            "health_score": health_score,
            "severity_breakdown": severity_counts,
            "owasp_mapping": [],
            "prioritized_fix_list": []
        }

    # Extract OWASP mappings
    owasp_mapping = []
    prioritized_fix_list = []
    
    rank = 1
    for f in findings:
        owasp_cat = f.get("owasp_category")
        cwe_id = f.get("cwe_id")
        sev = f.get("severity", "medium").capitalize()
        
        if owasp_cat:
            owasp_mapping.append({
                "category": owasp_cat,
                "finding_title": f.get("title", "Security Vulnerability"),
                "risk_level": sev
            })
            
        prioritized_fix_list.append({
            "priority": rank,
            "issue_title": f.get("title", "Issue"),
            "action_item": f.get("remediation_summary") or f.get("description", "Apply refactoring fix")
        })
        rank += 1

    crit_count = severity_counts.get("critical", 0)
    high_count = severity_counts.get("high", 0)
    
    if crit_count > 0 or high_count > 0:
        overview = (
            f"Code Review Flagged Critical Vulnerabilities (Health Score: {health_score}/100). "
            f"Found {crit_count} Critical and {high_count} High severity security issue(s) violating OWASP standards. "
            "Immediate remediation is required before merging into production."
        )
    else:
        overview = (
            f"Code Review Complete (Health Score: {health_score}/100). "
            f"Identified {len(findings)} quality smell(s) and minor best practice violation(s). "
            "Review the prioritized fix roadmap below for recommended refactorings."
        )

    return {
        "title": f"PR Code Review: {len(findings)} Issue(s) Detected (Score: {health_score}/100)",
        "executive_overview": overview,
        "health_score": health_score,
        "severity_breakdown": severity_counts,
        "owasp_mapping": owasp_mapping,
        "prioritized_fix_list": prioritized_fix_list
    }


def generate_pr_summary(
    source_code: str, 
    language: str, 
    findings: List[Dict], 
    severity_counts: Dict[str, int]
) -> Dict[str, Any]:
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY not set. Falling back to PR Summary Agent mock data.")
        return get_mock_pr_summary(source_code, language, findings, severity_counts)

    genai.configure(api_key=api_key)
    
    model = genai.GenerativeModel(
        model_name=get_active_llm_model(),
        system_instruction=SYSTEM_PROMPT
    )

    prompt = (
        f"Language: {language}\n"
        f"Severity Counts: {json.dumps(severity_counts)}\n"
        f"Findings:\n{json.dumps(findings, indent=2)}\n\n"
        "Generate a structured Pull Request Review Summary."
    )

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=PRSummaryResult
            )
        )
        
        result = PRSummaryResult.model_validate_json(response.text)
        data = result.model_dump()
        data["severity_breakdown"] = severity_counts
        # Ensure health score is within bounds
        data["health_score"] = calculate_health_score(severity_counts)
        return data

    except Exception as e:
        print(f"PR Summary Agent LLM call failed ({e}). Falling back to mock PR summary.")
        return get_mock_pr_summary(source_code, language, findings, severity_counts)
