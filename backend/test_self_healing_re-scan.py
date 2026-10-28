import sys
import os

sys.path.insert(0, os.path.abspath("."))

from app.agents.remediation import run_self_healing_remediation
from app.agents.security_vulnerability import scan_security_vulnerabilities
from app.agents.code_analysis import analyze_code_quality
from app.services.code_validator import validate_code

test_java_code = """import java.sql.Connection;
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
"""

print("=== 1. SCANNING JAVA CODE ===")
initial_java = scan_security_vulnerabilities(test_java_code, "java") + analyze_code_quality(test_java_code, "java")
result_java = run_self_healing_remediation(test_java_code, "java", initial_java)

val_java = validate_code(result_java['full_remediated_code'], "java")
print(f"Java Rescan Passed: {result_java['rescan_passed']}")
print(f"Java Is Valid: {val_java.is_valid} | Errors: {val_java.errors}")

test_python_code = """import os
import sqlite3

API_SECRET = "sk-proj-9876543210fedcba9876543210"

def get_user_data(username):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchall()
"""

print("\n=== 3. SCANNING BINARY SEARCH SNIPPET ===")
binary_search_code = """import java.util.*;

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
"""

initial_bs = scan_security_vulnerabilities(binary_search_code, "java") + analyze_code_quality(binary_search_code, "java")
result_bs = run_self_healing_remediation(binary_search_code, "java", initial_bs)

val_bs = validate_code(result_bs['full_remediated_code'], "java")
print(f"Binary Search Rescan Passed: {result_bs['rescan_passed']}")
print(f"Binary Search Is Valid Java: {val_bs.is_valid} | Errors: {val_bs.errors}")
print(f"Remediated Code:\n{result_bs['full_remediated_code']}")



