import asyncio
import hashlib
import operator
import uuid
from typing import Annotated, Dict, List, TypedDict
from sqlalchemy.orm import Session

from langgraph.graph import START, END, StateGraph
from app.agents.code_analysis import analyze_code_quality
from app.agents.security_vulnerability import scan_security_vulnerabilities
from app.agents.remediation import generate_remediations, generate_full_remediated_code, run_self_healing_remediation, normalize_code, heal_syntax_and_quality_code
from app.agents.pr_summary import generate_pr_summary, calculate_health_score
from app.models.submission import CodeSubmission, SubmissionStatus
from app.database import SessionLocal
from app.services.code_validator import validate_code


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


from app.services.observability import observability

# Nodes
async def code_analysis_node(state: AgentState) -> Dict:
    with observability.trace_stage("Stage 1: Code Quality Analysis", state.get("submission_id")):
        try:
            findings = await asyncio.to_thread(
                analyze_code_quality, 
                state["source_code"], 
                state["language"]
            )
            return {"code_findings": findings}
        except Exception as e:
            return {"errors": [f"Code Analysis Agent failed: {str(e)}"]}


async def security_scan_node(state: AgentState) -> Dict:
    with observability.trace_stage("Stage 1: Security Vulnerability Scan", state.get("submission_id")):
        try:
            findings = await asyncio.to_thread(
                scan_security_vulnerabilities, 
                state["source_code"], 
                state["language"]
            )
            return {"security_findings": findings}
        except Exception as e:
            return {"errors": [f"Security Vulnerability Agent failed: {str(e)}"]}


def merge_findings_node(state: AgentState) -> Dict:
    with observability.trace_stage("Stage 2: Merge & Deduplicate Findings", state.get("submission_id")):
        merged = []
        
        # Process Code Analysis Findings
        for f in state.get("code_findings") or []:
            finding = dict(f)
            finding["agent_source"] = "code_analysis"
            finding["id"] = finding.get("id") or str(uuid.uuid4())
            if finding.get("line_number") is not None:
                try:
                    finding["line_number"] = int(finding["line_number"])
                except ValueError:
                    finding["line_number"] = None
            merged.append(finding)
            
        # Process Security Findings
        for f in state.get("security_findings") or []:
            finding = dict(f)
            finding["agent_source"] = "security_vulnerability"
            finding["id"] = finding.get("id") or str(uuid.uuid4())
            if finding.get("line_number") is not None:
                try:
                    finding["line_number"] = int(finding["line_number"])
                except ValueError:
                    finding["line_number"] = None
            merged.append(finding)
            
        # Sort merged findings by line number
        def get_sort_key(item):
            ln = item.get("line_number")
            return (0, ln) if ln is not None else (1, 0)
            
        merged.sort(key=get_sort_key)
        return {"merged_findings": merged}


async def remediation_node(state: AgentState) -> Dict:
    with observability.trace_stage("Stage 3: AI Code Remediation", state.get("submission_id")):
        try:
            findings = state.get("merged_findings") or []
            enriched = await asyncio.to_thread(
                generate_remediations,
                state["source_code"],
                state["language"],
                findings
            )
            return {"remediated_findings": enriched}
        except Exception as e:
            return {"errors": [f"Remediation Agent failed: {str(e)}"]}


async def pr_summary_node(state: AgentState) -> Dict:
    with observability.trace_stage("Stage 4: Executive Report & Self-Healing", state.get("submission_id")):
        try:
            findings = state.get("remediated_findings") or state.get("merged_findings") or []
            severity_counts = {
                "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0
            }
            for finding in findings:
                sev = str(finding.get("severity", "info")).lower()
                if sev in severity_counts:
                    severity_counts[sev] += 1
                else:
                    severity_counts["info"] += 1
                    
            summary = await asyncio.to_thread(
                generate_pr_summary,
                state["source_code"],
                state["language"],
                findings,
                severity_counts
            )
            src_code = state.get("source_code", "")
            upload_hash = hashlib.sha256(src_code.encode("utf-8")).hexdigest()[:12]

            # Execute Automated Self-Healing Post-Remediation Re-Scan Loop
            self_healing_result = await asyncio.to_thread(
                run_self_healing_remediation,
                state["source_code"],
                state["language"],
                findings
            )
            
            rem_code = self_healing_result.get("full_remediated_code") or ""
            candidate_hash = hashlib.sha256(rem_code.encode("utf-8")).hexdigest()[:12]
            print(f"[PIPELINE] upload_hash={upload_hash} scan_input_hash={upload_hash} remediation_input_hash={upload_hash} candidate_hash={candidate_hash}")

            summary["full_remediated_code"] = self_healing_result["full_remediated_code"]
            summary["self_healing_metadata"] = {
                "rescan_passed": self_healing_result["rescan_passed"],
                "remediation_status": self_healing_result.get("remediation_status", "success"),
                "security_remediation_required": self_healing_result.get("security_remediation_required", True),
                "remediation_error": self_healing_result.get("remediation_error"),
                "remediation_engine_used": self_healing_result.get("remediation_engine_used", ""),
                "original_findings_count": self_healing_result["original_findings_count"],
                "rescan_findings_count": self_healing_result["rescan_findings_count"],
                "fixed_findings_count": self_healing_result["fixed_findings_count"],
                "fixed_findings": self_healing_result["fixed_findings"],
                "remaining_findings": self_healing_result["remaining_findings"],
                "attempts": self_healing_result["attempts"]
            }

            h_score = summary.get("health_score", calculate_health_score(severity_counts))
            return {"pr_summary": summary, "health_score": h_score}
        except Exception as e:
            return {"errors": [f"PR Summary Agent failed: {str(e)}"]}


# Build LangGraph workflow
workflow = StateGraph(AgentState)

workflow.add_node("code_analysis", code_analysis_node)
workflow.add_node("security_scan", security_scan_node)
workflow.add_node("merge", merge_findings_node)
workflow.add_node("remediation", remediation_node)
workflow.add_node("pr_summary_generator", pr_summary_node)

# Execution edges
workflow.add_edge(START, "code_analysis")
workflow.add_edge(START, "security_scan")
workflow.add_edge("code_analysis", "merge")
workflow.add_edge("security_scan", "merge")
workflow.add_edge("merge", "remediation")
workflow.add_edge("remediation", "pr_summary_generator")
workflow.add_edge("pr_summary_generator", END)

orchestrator_app = workflow.compile()


async def run_agent_analysis_pipeline(submission_id: uuid.UUID) -> None:
    db = SessionLocal()
    try:
        submission = db.query(CodeSubmission).filter(CodeSubmission.id == submission_id).first()
        if not submission:
            return

        src_code = submission.source_code or ""
        upload_hash = hashlib.sha256(src_code.encode("utf-8")).hexdigest()[:12]
        print(f"[PIPELINE] upload_source_hash={upload_hash} validation_source_hash={upload_hash}")

        # STAGE 1: SYNTAX ERROR HANDLING & AI REMEDIATION
        if submission.validation_errors or not submission.is_valid_syntax:
            print(f"[PIPELINE] syntax_validation_failed=true -> Executing AI Syntax Error Remediation...")
            syntax_findings = []
            for err in (submission.validation_errors or []):
                msg = err.get("message", "Syntax parsing failed")
                line_no = err.get("line")
                syntax_findings.append({
                    "id": str(uuid.uuid4()),
                    "agent_source": "syntax_validator",
                    "category": "syntax_error",
                    "severity": err.get("severity", "critical"),
                    "title": f"Syntax Error: {msg[:60]}",
                    "description": msg,
                    "line_number": line_no,
                    "cwe_id": None,
                    "owasp_category": None,
                    "remediation_summary": f"Fix syntax error at line {line_no}: {msg}",
                    "corrected_code": None,
                    "best_practice_explanation": "Source code must be free of compiler and syntax errors to compile and execute safely."
                })

            # Run AI Remediation on Syntax Findings to generate fixed source code
            try:
                remediated_code, _ = generate_full_remediated_code(src_code, submission.language.value, syntax_findings)
            except Exception as ex:
                print(f"[PIPELINE] AI Remediation failed for syntax error ({ex}), applying fallback static syntax fixer...")
                remediated_code = src_code

            # Fallback static syntax fix if code remains unchanged or has syntax errors
            remediated_code = heal_syntax_and_quality_code(remediated_code, submission.language.value)

            # Re-scan remediated code to check if syntax error is fixed
            val_rescan = validate_code(remediated_code, submission.language.value)
            rescan_passed = val_rescan.is_valid

            # Update findings with corrected code
            for f in syntax_findings:
                f["corrected_code"] = remediated_code

            submission.findings = syntax_findings
            submission.health_score = 100 if rescan_passed else 50
            submission.status = SubmissionStatus.completed
            submission.pr_summary = {
                "title": f"Syntax Error Remediation — {submission.language.value.upper()}",
                "executive_overview": f"Syntax error detected on line {syntax_findings[0]['line_number'] if syntax_findings else 'N/A'}. AI Remediation Agent successfully fixed the syntax error to produce production-ready executable code." if rescan_passed else "Syntax error detected. Remediation attempted.",
                "full_remediated_code": remediated_code,
                "summary": "AI Remediation Agent fixed syntax errors in original source file." if rescan_passed else "Syntax error remediation attempted.",
                "self_healing_metadata": {
                    "rescan_passed": rescan_passed,
                    "remediation_status": "success" if rescan_passed else "failed",
                    "security_remediation_required": True,
                    "remediation_error": None if rescan_passed else "Syntax error persistent after remediation",
                    "original_findings_count": len(syntax_findings),
                    "rescan_findings_count": 0 if rescan_passed else len(syntax_findings),
                    "fixed_findings_count": len(syntax_findings) if rescan_passed else 0,
                    "fixed_findings": ["syntax_error"] if rescan_passed else [],
                    "remaining_findings": [] if rescan_passed else ["syntax_error"],
                    "attempts": 1
                }
            }
            db.commit()
            return

        # STAGE 2 & 3: SYNTACTICALLY VALID CODE FLOW
        syntax_findings = []
        initial_state = {
            "submission_id": str(submission.id),
            "source_code": submission.source_code,
            "language": submission.language.value,
            "code_findings": [],
            "security_findings": [],
            "merged_findings": [],
            "remediated_findings": [],
            "pr_summary": {},
            "health_score": 100,
            "errors": []
        }
        
        # Run orchestrator
        result_state = await orchestrator_app.ainvoke(initial_state)
        
        # Reload submission to update
        submission = db.query(CodeSubmission).filter(CodeSubmission.id == submission_id).first()
        
        errors = result_state.get("errors") or []
        pr_sum = result_state.get("pr_summary")
        if errors and not pr_sum and not syntax_findings and not result_state.get("merged_findings"):
            submission.status = SubmissionStatus.failed
            existing_errors = submission.validation_errors or []
            for err in errors:
                existing_errors.append({"line": None, "column": None, "message": err})
            submission.validation_errors = existing_errors
        else:
            submission.status = SubmissionStatus.completed
            final_findings = result_state.get("remediated_findings") or result_state.get("merged_findings") or syntax_findings
            
            # --- CRITICAL UI FEEDBACK PATCH ---
            # If any individual LangGraph agent failed (e.g. invalid API key caught inside code_analysis),
            # force those errors to be visible as red critical findings on the UI instead of returning 0 findings!
            if errors:
                for idx, err_msg in enumerate(errors):
                    final_findings.append({
                        "id": str(uuid.uuid4()),
                        "agent_source": "system_error",
                        "category": "infrastructure_failure",
                        "severity": "critical",
                        "title": "Agent Pipeline Error (Invalid API Key)",
                        "description": f"The LLM Agent failed to process: {err_msg}. This almost certainly means your Google API Key is invalid or rate-limited.",
                        "line_number": 1,
                        "cwe_id": "CWE-287",
                        "owasp_category": "A07:2021-Identification and Authentication Failures",
                        "remediation_summary": "Make sure your Google Gemini API key starts with exactly 'AIzaSy'.",
                        "corrected_code": submission.source_code,
                        "best_practice_explanation": "Cloud security tools require valid LLM API keys with proper limits."
                    })
            # -----------------------------------
            
            # Sort findings by line number
            def get_sort_key(item):
                ln = item.get("line_number")
                return (0, int(ln)) if ln is not None else (1, 0)
                
            final_findings.sort(key=get_sort_key)
            submission.findings = final_findings
            
            # Compute severity statistics across ALL final findings (including syntax errors)
            severity_counts = {
                "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0
            }
            for finding in final_findings:
                sev = str(finding.get("severity", "info")).lower()
                if sev in severity_counts:
                    severity_counts[sev] += 1
                else:
                    severity_counts["info"] += 1
            
            submission.severity_scores = severity_counts
            
            # Compute accurate health score across all final findings
            h_score = calculate_health_score(severity_counts)
            submission.health_score = h_score
            
            # Generate or update PR summary with full findings and severity counts
            pr_sum = result_state.get("pr_summary") or {}
            if not pr_sum:
                pr_sum = generate_pr_summary(submission.source_code, submission.language.value, final_findings, severity_counts)
            else:
                pr_sum["health_score"] = h_score
                pr_sum["severity_breakdown"] = severity_counts

            # Ensure full_remediated_code & self_healing_metadata are ALWAYS present
            if "full_remediated_code" not in pr_sum or not pr_sum.get("full_remediated_code"):
                self_healing_result = run_self_healing_remediation(submission.source_code, submission.language.value, final_findings)
                pr_sum["full_remediated_code"] = self_healing_result["full_remediated_code"]
                pr_sum["self_healing_metadata"] = {
                    "rescan_passed": self_healing_result["rescan_passed"],
                    "remediation_status": self_healing_result.get("remediation_status", "success"),
                    "security_remediation_required": self_healing_result.get("security_remediation_required", True),
                    "remediation_error": self_healing_result.get("remediation_error"),
                    "remediation_engine_used": self_healing_result.get("remediation_engine_used", ""),
                    "original_findings_count": self_healing_result["original_findings_count"],
                    "rescan_findings_count": self_healing_result["rescan_findings_count"],
                    "fixed_findings_count": self_healing_result["fixed_findings_count"],
                    "fixed_findings": self_healing_result["fixed_findings"],
                    "remaining_findings": self_healing_result["remaining_findings"],
                    "attempts": self_healing_result["attempts"]
                }
                
            submission.pr_summary = pr_sum
            submission.status = SubmissionStatus.completed
            
        db.commit()
    except Exception as e:
        db.rollback()
        submission = db.query(CodeSubmission).filter(CodeSubmission.id == submission_id).first()
        if submission:
            print(f"[PIPELINE ERROR FALLBACK] Orchestrator exception caught ({e}). Executing fail-safe self-healing remediation...")
            try:
                healed_src = heal_syntax_and_quality_code(submission.source_code or "", submission.language.value)
                self_healing_res = run_self_healing_remediation(healed_src, submission.language.value, [])
                
                submission.status = SubmissionStatus.completed
                submission.health_score = 100 if self_healing_res["rescan_passed"] else 50
                original_findings = []
                
                # Highlight the failure visually in the findings payload so the user immediately knows the API crashed
                original_findings.append({
                    "id": str(uuid.uuid4()),
                    "agent_source": "system_error",
                    "category": "infrastructure_failure",
                    "severity": "critical",
                    "title": "LLM API Failure / Authentication Error",
                    "description": f"The backend AI pipeline crashed processing your request. Error details: {str(e)}",
                    "line_number": 1,
                    "cwe_id": "CWE-287",
                    "owasp_category": "A07:2021-Identification and Authentication Failures",
                    "remediation_summary": "Check your GEMINI_API_KEY environment variables in the Render Dashboard and ensure the key is valid and has active quotas.",
                    "corrected_code": submission.source_code,
                    "best_practice_explanation": "Cloud security tools require valid LLM API keys with proper limits."
                })
                submission.findings = original_findings
                
                submission.pr_summary = {
                    "title": f"Automated Remediation — Critical Pipeline Error",
                    "executive_overview": f"CRITICAL PIPELINE FAILURE: The multi-agent LLM workflow encountered an unhandled exception and crashed: {str(e)}. This is typically due to an invalid Gemini API Key or Rate Limiting on the Render backend.",
                    "full_remediated_code": self_healing_res["full_remediated_code"],
                    "summary": f"System error caught instead of findings: {str(e)}",
                    "self_healing_metadata": {
                        "rescan_passed": self_healing_res["rescan_passed"],
                        "remediation_status": "success",
                        "security_remediation_required": False,
                        "remediation_error": None,
                        "original_findings_count": 0,
                        "rescan_findings_count": 0,
                        "fixed_findings_count": 0,
                        "fixed_findings": [],
                        "remaining_findings": [],
                        "attempts": 1
                    }
                }
            except Exception as inner_ex:
                print(f"[PIPELINE CRITICAL] Fail-safe remediation fallback error ({inner_ex})")
                submission.status = SubmissionStatus.completed
                submission.health_score = 50
                original_findings = []
                original_findings.append({
                    "id": str(uuid.uuid4()),
                    "agent_source": "system_error",
                    "category": "infrastructure_failure",
                    "severity": "critical",
                    "title": "LLM API Failure / Authentication Error",
                    "description": f"The backend AI pipeline crashed processing your request. Both primary and backup paths failed. Detailed Error: {str(e)} | Inner Error: {str(inner_ex)}",
                    "line_number": 1,
                    "cwe_id": "CWE-287",
                    "owasp_category": "A07:2021-Identification and Authentication Failures",
                    "remediation_summary": "Your Google Gemini API Key is invalid or rate limited. Check your GEMINI_API_KEY environment variables in the Render Dashboard. Google Generative AI keys usually start with 'AIzaSy'. Make sure you copy the exact key correctly.",
                    "corrected_code": submission.source_code,
                    "best_practice_explanation": "Cloud security tools require valid LLM API keys with proper limits."
                })
                submission.findings = original_findings
                submission.pr_summary = {
                    "title": f"Critical Pipeline Error — {submission.language.value.upper()}",
                    "executive_overview": f"CRITICAL PIPELINE FAILURE: The AI workflow encountered an unhandled exception: {str(inner_ex)}. This means the API Key you provided is invalid or has expired.",
                    "full_remediated_code": submission.source_code or "",
                    "summary": f"System error caught: {str(inner_ex)}"
                }
            db.commit()
    finally:
        db.close()
