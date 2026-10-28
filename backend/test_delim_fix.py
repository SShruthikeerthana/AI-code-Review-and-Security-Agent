from app.services.code_validator import validate_code
from app.agents.remediation import heal_syntax_and_quality_code

src = open("C:/tmp/sub_delim_err.txt", "r", encoding="utf-8").read()

val_initial = validate_code(src, "python")
print("INITIAL VALIDATION IS VALID:", val_initial.is_valid)
print("INITIAL ERRORS:", val_initial.errors)

healed = heal_syntax_and_quality_code(src, "python")
val_healed = validate_code(healed, "python")
print("HEALED VALIDATION IS VALID:", val_healed.is_valid)
for err in val_healed.errors:
    print(f"ERROR line {err.get('line')}: {err.get('message')}")

h_lines = healed.splitlines()
for idx in range(68, 77):
    print(f"LINE {idx+1}: {h_lines[idx]}")


