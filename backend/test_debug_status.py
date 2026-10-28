import asyncio
import traceback
from app.database import SessionLocal
from app.models.submission import CodeSubmission
from app.agents.orchestrator import run_agent_analysis_pipeline
from app.agents.remediation import generate_full_remediated_code

db = SessionLocal()
s = db.query(CodeSubmission).order_by(CodeSubmission.created_at.desc()).first()
print("ID:", s.id)
print("Language:", s.language.value)
print("Validation errors:", s.validation_errors)

try:
    src_code = s.source_code or ""
    print("STEP 1: validation_errors =", s.validation_errors)
    if s.validation_errors or not s.is_valid_syntax:
        print("STEP 2: Executing Stage 1...")
        syntax_findings = []
        for err in (s.validation_errors or []):
            msg = err.get("message", "Syntax parsing failed")
            line_no = err.get("line")
            syntax_findings.append({
                "id": "123",
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
        print("STEP 3: generate_full_remediated_code...")
        remediated_code = generate_full_remediated_code(src_code, s.language.value, syntax_findings)
        print("STEP 4: heal_syntax_and_quality_code...")
        from app.agents.remediation import heal_syntax_and_quality_code
        remediated_code = heal_syntax_and_quality_code(remediated_code, s.language.value)
        print("STEP 5: validate_code...")
        from app.services.code_validator import validate_code
        val_rescan = validate_code(remediated_code, s.language.value)
        rescan_passed = val_rescan.is_valid
        print("STEP 6: rescan_passed =", rescan_passed)
        for f in syntax_findings:
            f["corrected_code"] = remediated_code
        s.findings = syntax_findings
        s.health_score = 100 if rescan_passed else 50
        from app.models.submission import SubmissionStatus
        s.status = SubmissionStatus.completed
        s.pr_summary = {
            "title": f"Syntax Error Remediation — {s.language.value.upper()}",
            "executive_overview": f"Syntax error detected. AI Remediation Agent successfully fixed the syntax error." if rescan_passed else "Syntax error detected. Remediation attempted.",
            "full_remediated_code": remediated_code,
            "summary": "AI Remediation Agent fixed syntax errors." if rescan_passed else "Syntax error remediation attempted.",
            "self_healing_metadata": {
                "rescan_passed": rescan_passed,
                "remediation_status": "success" if rescan_passed else "failed",
                "security_remediation_required": True
            }
        }
        print("STEP 7: db.commit()...")
        db.commit()
        print("STEP 8: DONE! Status =", s.status)
except Exception:
    traceback.print_exc()
