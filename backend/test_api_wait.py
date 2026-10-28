import time
import requests

code_snippet = """import sys

def calculate_total(a, b):
return a + b
"""

resp = requests.post("http://127.0.0.1:8000/api/v1/submissions/paste", json={
    "source_code": code_snippet,
    "language": "python",
    "filename": "test_syntax.py"
})

print("HTTP SUBMIT RESPONSE:", resp.status_code, resp.json()["id"])
sub_id = resp.json()["id"]

# Poll up to 15 seconds
for i in range(15):
    time.sleep(1)
    r = requests.get(f"http://127.0.0.1:8000/api/v1/submissions/{sub_id}")
    data = r.json()
    status = data.get("status")
    print(f"[{i+1}s] Status: {status}")
    if status in ["completed", "failed"]:
        print("FINAL STATUS:", status)
        print("HEALTH SCORE:", data.get("health_score"))
        print("IS_VALID_SYNTAX:", data.get("is_valid_syntax"))
        print("VALIDATION ERRORS:", data.get("validation_errors"))
        print("PR SUMMARY TITLE:", data.get("pr_summary", {}).get("title") if data.get("pr_summary") else None)
        print("REMEDIATED CODE:\n", data.get("pr_summary", {}).get("full_remediated_code") if data.get("pr_summary") else None)
        break
