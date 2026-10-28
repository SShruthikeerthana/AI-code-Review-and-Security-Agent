from app.services.code_validator import validate_code
from app.agents.remediation import heal_syntax_and_quality_code

code_unindented = """import sys

def calculate_total(a, b):
return a + b
"""

val_initial = validate_code(code_unindented, "python")
print("INITIAL VALIDATION IS VALID:", val_initial.is_valid)

healed = heal_syntax_and_quality_code(code_unindented, "python")
val_healed = validate_code(healed, "python")
print("HEALED VALIDATION IS VALID:", val_healed.is_valid)
print("HEALED CODE:\n", healed)
