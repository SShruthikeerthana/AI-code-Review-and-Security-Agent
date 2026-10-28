from app.services.code_validator import validate_code
from app.agents.remediation import heal_syntax_and_quality_code

# Test Unexpected Indent Code
bad_indent_code = """SECURITY_RULES = []
    {
        "id": "SECRETS_HARDCODED",
        "category": "secrets",
        "severity": "critical"
    }
"""

val_initial = validate_code(bad_indent_code, "python")
print("INITIAL VALIDATION IS VALID:", val_initial.is_valid)

healed = heal_syntax_and_quality_code(bad_indent_code, "python")
val_healed = validate_code(healed, "python")
print("HEALED VALIDATION IS VALID:", val_healed.is_valid)
print("HEALED CODE:\n", healed)
