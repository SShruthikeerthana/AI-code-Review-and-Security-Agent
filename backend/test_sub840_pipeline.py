from app.services.code_validator import validate_code
from app.agents.remediation import heal_syntax_and_quality_code

code_840 = """d = {"P":"S", "R":"P", "S":"R"}

a, b = input).split()

if a == b:
    print("D")
elif d[a] == b:
    print(b)
else:
    print(a)"""

val_initial = validate_code(code_840, "python")
print("INITIAL VALIDATION IS VALID:", val_initial.is_valid)
print("INITIAL ERRORS:", [str(e) for e in val_initial.errors])

healed = heal_syntax_and_quality_code(code_840, "python")
val_healed = validate_code(healed, "python")
print("\nHEALED CODE VALIDATION IS VALID:", val_healed.is_valid)
print("HEALED CODE:\n", healed)
