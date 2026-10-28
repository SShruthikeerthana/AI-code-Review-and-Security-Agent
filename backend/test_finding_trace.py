import json
from app.agents.security_vulnerability import scan_security_vulnerabilities
from app.agents.code_analysis import analyze_code_quality
from app.agents.remediation import run_self_healing_remediation, generate_full_remediated_code, _generate_dynamic_full_remediated_code

code = """d = {"P":"S", "R":"P", "S":"R"}

a, b = input().split()

if a == b:
    print("D")
elif d[a] == b:
    print(b)
else:
    print(a)"""

sec = scan_security_vulnerabilities(code, "python")
qual = analyze_code_quality(code, "python")

print("=== SECURITY FINDINGS ===")
print(json.dumps(sec, indent=2))

print("=== QUALITY FINDINGS ===")
print(json.dumps(qual, indent=2))

merged = sec + qual
print("=== MERGED FINDINGS COUNT ===", len(merged))

rem_res = run_self_healing_remediation(code, "python", merged)
print("=== REMEDIATION RESULT METADATA ===")
print(json.dumps({k: v for k, v in rem_res.items() if k not in ("remediated_code", "full_remediated_code")}, indent=2))

print("=== CANDIDATE REMEDIATED CODE ===")
print(rem_res.get("full_remediated_code"))
