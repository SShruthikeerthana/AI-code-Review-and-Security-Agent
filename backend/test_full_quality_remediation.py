from app.agents.remediation import run_self_healing_remediation
from app.agents.code_analysis import perform_dynamic_code_analysis
from app.agents.security_vulnerability import scan_security_vulnerabilities

java_code = """
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.ResultSet;
import java.security.MessageDigest;
import java.io.IOException;

public class SecurityAnalysisSample {

    private static final String API_KEY = System.getenv("API_KEY");

    public String hashPassword(String password) throws Exception {
        return BCrypt.hashpw(password, BCrypt.gensalt(12));
    }

    public ResultSet getAccountDetails(String accountId) throws Exception {
        Connection conn = DriverManager.getConnection("jdbc:sqlite:app.db");
        String sql = "SELECT * FROM accounts WHERE id = ?";
        PreparedStatement stmt = conn.prepareStatement(sql);
        return stmt.executeQuery();
    }

    public void executeDiagnostics(String host) throws IOException {
        ProcessBuilder pb = new ProcessBuilder("ping", "-c", "1", host);
        pb.start();
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

sec = scan_security_vulnerabilities(java_code, "java")
qual = perform_dynamic_code_analysis(java_code, "java")
all_findings = sec + qual

print(f"Total Initial Findings: {len(all_findings)} (Sec: {len(sec)}, Qual: {len(qual)})")
for f in all_findings:
    print(" -", f.get("title"), "line", f.get("line_number"))

res = run_self_healing_remediation(java_code, "java", all_findings)
print("\nRemediation Status:", res["remediation_status"])
print("Rescan Passed:", res["rescan_passed"])
print("Fixed Findings Count:", res["fixed_findings_count"])
print("Remaining Findings Count:", len(res["remaining_findings"]))

rem_code = res["full_remediated_code"]
open("C:/tmp/test_full_qual_out.txt", "w", encoding="utf-8").write(rem_code)
print("\nEXPORT SUCCESSFUL! Output length:", len(rem_code))
