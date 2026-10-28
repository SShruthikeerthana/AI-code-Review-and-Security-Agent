from app.services.code_validator import validate_code
from app.agents.remediation import heal_syntax_and_quality_code

java_missing_brace = open("C:/tmp/sub_latest.txt", "r", encoding="utf-8").read()

val_initial = validate_code(java_missing_brace, "java")
print("INITIAL JAVA VALIDATION IS VALID:", val_initial.is_valid)

healed = heal_syntax_and_quality_code(java_missing_brace, "java")
val_healed = validate_code(healed, "java")
print("HEALED JAVA VALIDATION IS VALID:", val_healed.is_valid)
print("HEALED CODE:\n", healed)
