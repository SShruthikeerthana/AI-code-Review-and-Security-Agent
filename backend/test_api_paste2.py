import time
import requests

# Test: Unindented function block (line 29 syntax error)
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

# Wait 3 seconds for background pipeline to complete
time.sleep(3)

resp_get = requests.get(f"http://127.0.0.1:8000/api/v1/submissions/{sub_id}")
data = resp_get.json()
print("POLL SUBMISSION STATUS:", data["status"])
print("POLL IS_VALID_SYNTAX:", data["is_valid_syntax"])
print("POLL HEALTH_SCORE:", data["health_score"])
print("POLL VALIDATION_ERRORS:", data["validation_errors"])
print("POLL REMEDIATED_CODE:\n", data.get("pr_summary", {}).get("full_remediated_code"))
