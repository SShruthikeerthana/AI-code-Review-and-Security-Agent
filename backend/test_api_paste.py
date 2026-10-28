import time
import requests

# Test 1: Indented Python paste
py_code = """    def process_data(x):
        if x > 10:
            return x * 2
        return x
"""

resp = requests.post("http://127.0.0.1:8000/api/v1/submissions/paste", json={
    "source_code": py_code,
    "language": "python",
    "filename": "sample.py"
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
