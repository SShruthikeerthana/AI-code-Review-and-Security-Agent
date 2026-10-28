import sys
import os

sys.path.insert(0, os.path.abspath('backend'))

from app.services.code_validator import validate_code
from app.agents.remediation import heal_syntax_and_quality_code

# Exact user submitted code snippet with triple quoted raw regex strings
FULL_USER_CODE = '''import os
import re
from typing import List, Optional
import google.generativeai as genai
from pydantic import BaseModel, Field
 
from app.config import settings
 
class SecurityVulnerabilityFinding(BaseModel):
    title: str = Field(description="Short title summarizing the security vulnerability")
    description: str = Field(description="Detailed explanation of the vulnerability and its security implications")
    line_number: Optional[int] = Field(description="The 1-based line number where the vulnerability is located, or null if it applies globally")
    severity: str = Field(description="Severity: info, low, medium, high, or critical")
    category: str = Field(description="Category: sql_injection, xss, secrets, auth_flaw, access_control, csrf, insecure_deserialization, command_injection, path_traversal, or other")
    cwe_id: Optional[str] = Field(description="CWE identifier, e.g., CWE-89, CWE-79, CWE-798, CWE-22, etc.")
    owasp_category: Optional[str] = Field(description="OWASP Top 10 category, e.g., A03:2021-Injection, A01:2021-Broken Access Control, etc.")
 
class SecurityVulnerabilityResult(BaseModel):
    findings: List[SecurityVulnerabilityFinding]
 
SYSTEM_PROMPT = """
You are an expert Security Vulnerability Agent. Your task is to perform static security analysis on the provided source code to identify security vulnerabilities.
"""
 
SECURITY_RULES = [
    {
        "id": "SECRETS_HARDCODED",
        "category": "secrets",
        "severity": "critical",
        "cwe_id": "CWE-798",
        "owasp_category": "A07:2021-Identification and Authentication Failures",
        "title": "Use of Hardcoded API Secret Key or Credentials",
        "description": "Hardcoded API secret keys or credentials were detected.",
        "patterns": [
            r"""(?i)(api_secret_key|api_key|secret_key|auth_token|access_token|private_key|jwt_secret)\s*[:=]\s*["'][^"']{4,}["']""",
            r"""(?i)["'](xoxb-[a-zA-Z0-9_-]+|sk-[a-zA-Z0-9]{15,}|AKIA[0-9A-Z]{16})["']""",
            r"""(?i)password\s*[:=]\s*["'][^"']+["']""",
        ]
    },
    {
        "id": "SQL_INJECTION",
        "category": "sql_injection",
        "cwe_id": "CWE-89",
        "owasp_category": "A03:2021-Injection",
        "title": "SQL Injection via String Concatenation",
        "description": "Direct concatenation or formatting of user-provided inputs into SQL query strings enables SQL Injection (SQLi) attacks.",
            r"""(?i)(select|insert|update|delete|drop|alter)\s+.*?\s+(from|into|where|set|table)\s+.*?(?:\+|%|f["']|\$\{)""",
            r"""(?i)(query|sql|stmt)\s*=\s*f["'].*?(select|insert|update|delete).*?\{.*?\}["']""",
            r"""(?i)(query|sql)\s*=\s*["'].*?(select|insert|update|delete).*?["']\s*\+""",
            r"""(?i)execute\(\s*f["'].*?["']\)""",
            r"""(?i)execute\(\s*["'].*?["']\s*\+""",
            r"""(?i)executeQuery\(\s*query\s*\)""",
        ]
    },
    {
        "id": "AUTH_WEAK_HASH",
        "category": "auth_flaw",
        "severity": "high",
        "cwe_id": "CWE-328",
        "owasp_category": "A02:2021-Cryptographic Failures",
        "title": "Insecure Cryptographic Hash (MD5/SHA1)",
        "description": "The MD5 or SHA-1 hashing algorithm is cryptographically broken and prone to collision attacks.",
            r"""(?i)hashlib\.md5\(""",
            r"""(?i)hashlib\.sha1\(""",
            r"""(?i)MessageDigest\.getInstance\(["']MD5["']\)""",
            r"""(?i)MessageDigest\.getInstance\(["']SHA-1["']\)""",
            r"""(?i)CryptoJS\.MD5\(""",
        ]
    },
    {
        "id": "COMMAND_INJECTION",
        "category": "command_injection",
        "cwe_id": "CWE-78",
        "title": "OS Command Injection or Unsafe Execution",
        "description": "Executing command strings constructed with raw concatenation of user-supplied arguments enables OS Command Injection.",
            r"""(?i)Runtime\.getRuntime\(\)\.exec\(""",
            r"""(?i)os\.system\(""",
            r"""(?i)subprocess\.call\(""",
            r"""(?i)subprocess\.Popen\(""",
            r"""(?i)shell_exec\(""",
            r"""(?i)eval\(""",
            r"""(?i)exec\(""",
        ]
    },
    {
        "id": "PATH_TRAVERSAL",
        "category": "path_traversal",
        "cwe_id": "CWE-22",
        "owasp_category": "A01:2021-Broken Access Control",
        "title": "Potential Path Traversal in File Operations",
        "description": "Constructing file paths directly from user inputs without validation can lead to path traversal vulnerabilities.",
            r"""(?i)open\(\s*f["'].*?\{.*?\}["']""",
            r"""(?i)new\s+FileInputStream\(\s*.*?\+\s*.*?\)""",
            r"""(?i)new\s+File\(\s*.*?\+\s*.*?\)""",
            r"""(?i)\.\./\.\.""",
        ]
    },
    {
        "id": "XSS_DOM_INJECTION",
        "category": "xss",
        "cwe_id": "CWE-79",
        "title": "Cross-Site Scripting (XSS) via Unsanitized DOM Insertion",
        "description": "Directly assigning user-controlled input to DOM elements without sanitization enables Cross-Site Scripting (XSS).",
            r"""(?i)\.textContent\s*=""",
            r"""(?i)document\.write\(""",
            r"""(?i)dangerouslySetInnerHTML""",
            r"""(?i)v-html\s*=""",
        ]
    }
]

def perform_static_security_scan(source_code: str, language: str) -> List[dict]:
    return []
'''

def test_full_user_code_syntax_remediation():
    val_orig = validate_code(FULL_USER_CODE, "python")
    print(f"Original full code is_valid: {val_orig.is_valid}")
    assert not val_orig.is_valid, "Expected original code to fail syntax validation!"

    healed = heal_syntax_and_quality_code(FULL_USER_CODE, "python")
    val_healed = validate_code(healed, "python")
    print(f"Healed full code is_valid: {val_healed.is_valid}")
    print(f"Healed errors: {val_healed.errors}")

    assert val_healed.is_valid, f"Expected healed full user code to pass syntax validation! Errors: {val_healed.errors}"
    print("\n🎉 FULL USER CODE SYNTAX REMEDIATION TEST PASSED 100%!")

if __name__ == "__main__":
    test_full_user_code_syntax_remediation()
