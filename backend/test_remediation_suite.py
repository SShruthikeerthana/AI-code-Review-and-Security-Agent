import json
import unittest.mock as mock
from app.agents.remediation import (
    run_self_healing_remediation,
    filter_security_vulnerabilities,
    generate_full_remediated_code,
    normalize_code
)
from app.agents.security_vulnerability import scan_security_vulnerabilities
from app.agents.code_analysis import analyze_code_quality


def test_case_1_clean_code():
    print("\n========================================================")
    print("TEST CASE 1: CLEAN CODE (Binary Search)")
    print("========================================================")
    code = """def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
"""
    sec = scan_security_vulnerabilities(code, "python")
    qual = analyze_code_quality(code, "python")
    merged = sec + qual

    res = run_self_healing_remediation(code, "python", merged)
    print(f"Original Findings: {len(merged)}, Security: {len(sec)}, Quality: {len(qual)}")
    print(f"Remediation Status: '{res['remediation_status']}'")
    print(f"Security Required: {res['security_remediation_required']}")
    print(f"Rescan Passed: {res['rescan_passed']}")
    print(f"Code Unchanged: {res['remediated_code'] == code}")

    assert res['security_remediation_required'] is False, "Clean code should not require security remediation"
    assert res['rescan_passed'] is True, "Clean code should pass rescan"
    assert res['remediated_code'] == code, "Clean code should remain unchanged"
    print("✅ TEST CASE 1 PASSED!")


def test_case_2_quality_only_code():
    print("\n========================================================")
    print("TEST CASE 2: QUALITY ONLY CODE (Rock-Paper-Scissors)")
    print("========================================================")
    code = """d = {"P":"S", "R":"P", "S":"R"}
a, b = input().split()
if a == b:
    print("D")
elif d[a] == b:
    print(b)
else:
    print(a)
"""
    # Quality-only finding
    quality_finding = [{
        "id": "qual-1",
        "agent_source": "code_analysis",
        "category": "poor_practice",
        "severity": "low",
        "title": "Missing input validation guard",
        "description": "Ensure input string contains exactly two valid characters.",
        "line_number": 2
    }]

    res = run_self_healing_remediation(code, "python", quality_finding)
    print(f"Remediation Status: '{res['remediation_status']}'")
    print(f"Security Required: {res['security_remediation_required']}")
    print(f"Rescan Passed: {res['rescan_passed']}")
    print(f"Code Unchanged: {res['remediated_code'] == code}")

    assert res['remediation_status'] in ("quality_only", "no_vulnerabilities"), "Should classify as quality_only"
    assert res['security_remediation_required'] is False, "Security remediation should not be required"
    assert res['rescan_passed'] is True, "Rescan should pass"
    assert res['remediated_code'] == code, "Code should remain unchanged"
    print("✅ TEST CASE 2 PASSED!")


def test_case_3_vulnerable_code():
    print("\n========================================================")
    print("TEST CASE 3: VULNERABLE CODE (SQLi, Secrets, MD5, Command Injection)")
    print("========================================================")
    code = """import sqlite3
import hashlib
import os

API_SECRET_KEY = "sk-proj-secret-api-key-9988776655"

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()

def get_user(username):
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchone()

def ping(server_ip):
    os.system("ping -c 1 " + server_ip)
"""
    sec = scan_security_vulnerabilities(code, "python")
    qual = analyze_code_quality(code, "python")
    merged = sec + qual

    print(f"Detected Initial Security Findings: {len(sec)}")
    for f in sec:
        print(f" - [{f.get('cwe_id')}] {f.get('title')} (Line {f.get('line_number')})")

    res = run_self_healing_remediation(code, "python", merged)
    print(f"\nRemediation Status: '{res['remediation_status']}'")
    print(f"Security Required: {res['security_remediation_required']}")
    print(f"Rescan Passed: {res['rescan_passed']}")
    print(f"Fixed Findings Count: {res['fixed_findings_count']}")
    print(f"Remaining Security Findings Count: {res['rescan_findings_count']}")
    
    remediated = res["full_remediated_code"]
    print("\n--- REMEDIATED CODE OUTPUT ---")
    print(remediated)

    assert res['security_remediation_required'] is True, "Security remediation must be required"
    assert res['remediated_code'] != code, "Remediated code must differ from original"
    assert "os.environ.get" in remediated or "API_SECRET_KEY = os.environ" in remediated, "Secret must be remediated"
    assert "bcrypt" in remediated, "MD5 must be remediated to bcrypt"
    assert "subprocess.run" in remediated, "Command injection must be remediated"
    print("✅ TEST CASE 3 PASSED!")


def test_case_4_invariant_failure():
    print("\n========================================================")
    print("TEST CASE 4: INVARIANT FAILURE (Identical Code Return)")
    print("========================================================")
    code = """API_SECRET_KEY = "sk-proj-secret-api-key-9988776655" """
    sec_finding = [{
        "id": "sec-1",
        "agent_source": "security_vulnerability",
        "category": "secrets",
        "severity": "critical",
        "title": "Hardcoded Secret",
        "description": "API key hardcoded",
        "line_number": 1,
        "cwe_id": "CWE-798"
    }]

    with mock.patch("app.agents.remediation.generate_full_remediated_code", return_value=code):
        res = run_self_healing_remediation(code, "python", sec_finding)
        print(f"Remediation Status: '{res['remediation_status']}'")
        print(f"Rescan Passed: {res['rescan_passed']}")
        print(f"Error Message: '{res['remediation_error']}'")

        assert res['rescan_passed'] is False, "Rescan must FAIL when candidate is identical to original code"
        assert res['remediation_status'] == "remediation_failed", "Status must be 'remediation_failed'"
        assert "unchanged" in res['remediation_error'].lower(), "Error message must state unchanged code"
        print("✅ TEST CASE 4 PASSED!")


if __name__ == "__main__":
    test_case_1_clean_code()
    test_case_2_quality_only_code()
    test_case_3_vulnerable_code()
    test_case_4_invariant_failure()
    print("\n🎉 ALL 4 REMEDIATION TEST CASES PASSED SUCCESSFULLY!")
