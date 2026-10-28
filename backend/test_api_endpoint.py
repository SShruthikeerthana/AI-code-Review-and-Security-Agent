import requests
import json
import time

url = "http://127.0.0.1:8000/api/v1/submissions/paste"
payload = {
    "source_code": """import java.sql.Connection;
import java.sql.Statement;
import java.sql.ResultSet;

public class SecuritySample {
    private static final String API_KEY = "sk-proj-1234567890abcdef1234567890abcdef";

    public void getUser(Connection conn, String username) throws Exception {
        Statement stmt = conn.createStatement();
        String sql = "SELECT * FROM users WHERE username = '" + username + "'";
        ResultSet rs = stmt.executeQuery(sql);
        system.out.println("User queried");
    }

    public boolean authorizeTransaction(String userId, double amount, boolean isValidated) {
        if (userId != null) {
            if (!userId.isEmpty()) {
                if (amount > 0) {
                    if (amount <= 10000) {
                        if (isValidated) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
}
""",
    "language": "java",
    "filename": "SecuritySample.java"
}

print("1. Submitting code to live API endpoint...")
res = requests.post(url, json=payload)
sub_id = res.json()["id"]
print(f"Submission ID: {sub_id}")

print("2. Polling backend endpoint until completed...")
for _ in range(30):
    time.sleep(1)
    status_res = requests.get(f"http://127.0.0.1:8000/api/v1/submissions/{sub_id}")
    data = status_res.json()
    status = data.get("status")
    print(f"Status: {status}")
    if status == "completed":
        break

with open("live_api_output.txt", "w", encoding="utf-8") as f:
    f.write("=== REMEDIATED CODE RETURNED BY LIVE BACKEND ===\n")
    pr_summary = data.get("pr_summary")
    if pr_summary:
        f.write(f"{pr_summary.get('full_remediated_code')}\n")
        f.write("\n=== SELF-HEALING METADATA ===\n")
        f.write(json.dumps(pr_summary.get("self_healing_metadata"), indent=2))
    else:
        f.write("No PR summary found.\n")
print("Wrote live_api_output.txt")

