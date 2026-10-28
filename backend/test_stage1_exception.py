import traceback
from app.database import SessionLocal
from app.models.submission import CodeSubmission
from app.agents.remediation import generate_full_remediated_code, heal_syntax_and_quality_code
from app.services.code_validator import validate_code

db = SessionLocal()
s = db.query(CodeSubmission).order_by(CodeSubmission.created_at.desc()).first()
print("ID:", s.id)
print("Language:", s.language.value)
print("Errors:", s.validation_errors)

src_code = s.source_code
syntax_findings = [{
    "id": "123",
    "agent_source": "syntax_validator",
    "category": "syntax_error",
    "severity": "critical",
    "title": "Syntax Error",
    "description": s.validation_errors[0]["message"],
    "line_number": s.validation_errors[0]["line"],
    "cwe_id": None,
    "owasp_category": None,
    "remediation_summary": "Fix syntax error",
    "corrected_code": None,
    "best_practice_explanation": "Source code must be syntactically valid."
}]

try:
    print("Running generate_full_remediated_code...")
    remediated = generate_full_remediated_code(src_code, s.language.value, syntax_findings)
    print("REMEDIATED CODE:\n", remediated)
    rescan = validate_code(remediated, s.language.value)
    print("RESCAN IS VALID:", rescan.is_valid)
except Exception:
    traceback.print_exc()
