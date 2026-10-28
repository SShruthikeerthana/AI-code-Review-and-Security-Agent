import requests
import json
import time

url = "http://127.0.0.1:8000/api/v1/submissions/paste"
payload = {
    "source_code": """import java.util.*;

public class main {

    public static int binarySearch(int[] arr, int target) {
        int left = 0;
        int right = arr.length - 1;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (arr[mid] == target) {
                return mid;
            } else if arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return -1;
    }

    public static void main(String[] args) {
        int[] arr = {2, 5, 8, 12, 16, 23, 38, 56, 72};
        int target = 23;

        int index = binarySearch(arr, target);

        if (index != -1) {
            system.out.println("Element found at index: " + index);
        } else {
            System.out.println("Element not found");
        }
    }
}
""",
    "language": "java",
    "filename": "main.java"
}

print("Posting Binary Search snippet to backend...")
res = requests.post(url, json=payload)
sub_id = res.json()["id"]

for _ in range(30):
    time.sleep(1)
    status_res = requests.get(f"http://127.0.0.1:8000/api/v1/submissions/{sub_id}")
    data = status_res.json()
    if data.get("status") == "completed":
        break

print("Status:", data.get("status"))
pr_summary = data.get("pr_summary")
if pr_summary:
    with open("neat_remediated_output.txt", "w", encoding="utf-8") as f:
        f.write("=== LIVE REMEDIATED CODE Output ===\n")
        f.write(pr_summary.get("full_remediated_code", ""))
        f.write("\n\n=== SELF-HEALING METADATA ===\n")
        f.write(json.dumps(pr_summary.get("self_healing_metadata"), indent=2))
    print("Wrote neat_remediated_output.txt")
