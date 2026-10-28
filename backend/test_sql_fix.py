from app.agents.code_analysis import analyze_code_quality
from app.agents.security_vulnerability import scan_security_vulnerabilities
from app.agents.remediation import run_self_healing_remediation, heal_syntax_and_quality_code
from app.services.code_validator import validate_code

user_code = """import os
import hashlib
import sqlite3
import subprocess

API_KEY = os.environ.get('API_KEY')

def hash_password(password):
    # Security issue: insecure MD5 hashing
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')

def get_user(username):
    # Security issue: SQL Injection
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()

    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)

    return cursor.fetchone()

def ping_server(host):
    subprocess.run(["ping", "-c", "1", host], check=True)
"""

print("--- TESTING USER SQL INJECTION SNIPPET ---")
val_init = validate_code(user_code, "python")
print("INITIAL VALID SYNTAX:", val_init.is_valid)

findings = scan_security_vulnerabilities(user_code, "python") + analyze_code_quality(user_code, "python")
print(f"INITIAL FINDINGS ({len(findings)}):", [f.get("title") for f in findings])

res = run_self_healing_remediation(user_code, "python", findings)
print("\n--- REMEDIATION RESULT ---")
print("RESCAN PASSED:", res["rescan_passed"])
print("REMAINING FINDINGS COUNT:", len(res["remaining_findings"]))
print("REMAINING FINDINGS:", res["remaining_findings"])
print("\nREMEDIATED CODE:\n", res["full_remediated_code"])

val_rem = validate_code(res["full_remediated_code"], "python")
print("REMEDIATED CODE VALID SYNTAX:", val_rem.is_valid)
if not val_rem.is_valid:
    print("SYNTAX ERRORS:", val_rem.errors)
