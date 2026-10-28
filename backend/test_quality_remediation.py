from app.agents.code_analysis import analyze_code_quality
from app.agents.security_vulnerability import scan_security_vulnerabilities
from app.agents.remediation import run_self_healing_remediation

# Python sample with SQL Injection & Deep Nesting
py_input = """import os
import sqlite3

def process_user(user_id, data):
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    # SQL Injection
    query = "SELECT * FROM users WHERE id = '" + str(user_id) + "'"
    cursor.execute(query)
    
    if user_id is not None:
        if data is not None:
            if len(data) > 0:
                if "email" in data:
                    if data["email"]:
                        if data["email"].endswith("@gmail.com"):
                            print("Valid user email")
                        else:
                            print("Invalid email")
                    else:
                        print("Empty email")
                else:
                    print("No email key")
            else:
                print("Empty data")
        else:
            print("No data")
    else:
        print("No user ID")
"""

sec_py = scan_security_vulnerabilities(py_input, "python")
qual_py = analyze_code_quality(py_input, "python")
all_py = sec_py + qual_py
print(f"INITIAL PYTHON FINDINGS: {len(all_py)} (Security: {len(sec_py)}, Quality: {len(qual_py)})")

res_py = run_self_healing_remediation(py_input, "python", all_py)
print("PYTHON REMEDIATION RESCAN PASSED:", res_py["rescan_passed"])
print("PYTHON REMEDIATION REMAINING FINDINGS:", len(res_py["remaining_findings"]))
print("PYTHON REMEDIATED CODE:\n", res_py["full_remediated_code"])

# Re-scan remediated Python code
sec_py_re = scan_security_vulnerabilities(res_py["full_remediated_code"], "python")
qual_py_re = analyze_code_quality(res_py["full_remediated_code"], "python")
print(f"POST-REMEDIATION PYTHON FINDINGS: Total={len(sec_py_re + qual_py_re)} (Security: {len(sec_py_re)}, Quality: {len(qual_py_re)})")

# Java sample with SQL Injection & Deep Nesting
java_input = """public class UserProcessor {
    public boolean processUser(String userId, String data, String email) {
        String query = "SELECT * FROM accounts WHERE id = '" + userId + "'";
        if (userId != null) {
            if (!userId.isEmpty()) {
                if (data != null) {
                    if (!data.isEmpty()) {
                        if (email != null) {
                            if (email.contains("@")) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
}
"""

sec_ja = scan_security_vulnerabilities(java_input, "java")
qual_ja = analyze_code_quality(java_input, "java")
all_ja = sec_ja + qual_ja
print(f"\nINITIAL JAVA FINDINGS: {len(all_ja)} (Security: {len(sec_ja)}, Quality: {len(qual_ja)})")

res_ja = run_self_healing_remediation(java_input, "java", all_ja)
sec_ja_re = scan_security_vulnerabilities(res_ja["full_remediated_code"], "java")
qual_ja_re = analyze_code_quality(res_ja["full_remediated_code"], "java")
print(f"POST-REMEDIATION JAVA FINDINGS: Total={len(sec_ja_re + qual_ja_re)} (Security: {len(sec_ja_re)}, Quality: {len(qual_ja_re)})")
print("JAVA REMEDIATED CODE:\n", res_ja["full_remediated_code"])

