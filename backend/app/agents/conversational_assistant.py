import os
import re
import concurrent.futures
from typing import Dict, List, Optional, Any
import google.generativeai as genai
from app.config import settings
from app.services.model_resolver import get_active_llm_model
from app.rag.indexer import knowledge_base_retriever


OUT_OF_SCOPE_RESPONSE = "Please ask questions related to code analysis, security guidelines, or the knowledge base."

SYSTEM_PROMPT = """
You are an elite Senior Security Architect and Principal Software Engineering Assistant.
Your expertise spans:
1. All programming languages (Python, Java, JavaScript, TypeScript, C++, Go, SQL, HTML/CSS).
2. OWASP Top 10 (2021) security standards (A01 - A10) and CWE vulnerability classifications.
3. Code quality smells, refactoring patterns, Arrow Anti-Pattern elimination, guard clauses, SOLID principles, and clean code architecture.
4. Syntax debugging, delimiter mismatches, indentation errors, type annotations, and compilation errors.
5. Project-specific security scan findings, health score metrics, and automated remediation code diffs.

CRITICAL SCOPE RESTRICTIONS:
- You ONLY answer questions related to software engineering, programming, code review, security vulnerabilities, OWASP standards, code quality, syntax, secure coding guidelines, and submitted code analysis findings.
- IF THE USER ASKS A QUESTION THAT IS UNRELATED to programming, software engineering, cybersecurity, code review, or the knowledge base (for example: general trivia, consumer hardware/smartphones like iPhones, cooking, weather, sports, movies, or off-topic chat):
  YOU MUST POLITELY DECLINE AND RESPOND WITH EXACTLY:
  "Please ask questions related to code analysis, security guidelines, or the knowledge base."
- Do NOT attempt to answer off-topic questions or output code scan reports for off-topic questions.
"""

IN_SCOPE_KEYWORDS = {
    "python", "java", "javascript", "typescript", "js", "ts", "c++", "cpp", "c#", "golang", "go",
    "sql", "html", "css", "ruby", "php", "rust", "swift", "kotlin", "bash", "shell", "powershell",
    "react", "vue", "angular", "node", "express", "fastapi", "flask", "django", "spring", "next",
    "security", "vulnerability", "vulnerabilities", "owasp", "cwe", "cve", "sqli", "sql injection",
    "xss", "csrf", "ssrf", "secret", "secrets", "api key", "token", "jwt", "hash", "hashing", "bcrypt",
    "md5", "sha", "crypto", "cryptography", "auth", "authentication", "authorization", "rbac", "abac",
    "injection", "sanitize", "sanitization", "escape", "escaping", "exploit", "attack", "threat",
    "audit", "penetration", "cors", "csp", "encryption", "decryption", "credential", "credentials",
    "password", "passwords", "permission", "permissions", "privilege", "rce", "dos", "ddos",
    "code", "source", "file", "function", "class", "method", "variable", "parameter", "argument",
    "loop", "if", "else", "array", "list", "dict", "object", "string", "int", "boolean", "type",
    "finding", "findings", "scan", "scanner", "health score", "submission", "remediate", "remediation",
    "diff", "pr summary", "pull request", "refactor", "refactoring", "guard clause", "arrow anti-pattern",
    "complexity", "cyclomatic", "syntax", "delimiter", "indentation", "compile", "compiler", "bug",
    "error", "errors", "exception", "traceback", "log", "logging", "import", "package", "framework",
    "library", "repo", "repository", "commit", "git", "docker", "kubernetes", "ci/cd", "pipeline",
    "database", "db", "query", "queries", "endpoint", "api", "rest", "graphql", "json", "ast", "lint",
    "linter", "unit test", "test", "tests", "pytest", "jest", "mocha", "assert", "assertion", "mock",
    "algorithm", "data structure", "async", "await", "thread", "concurrency", "performance",
    "memory", "leak", "stack", "overflow", "buffer", "pointer", "null", "undefined", "architecture",
    "solid", "pattern", "clean code", "guideline", "guidelines", "best practice", "best practices",
    "knowledge base", "cwe-89", "cwe-79", "cwe-798", "cwe-78", "cwe-328", "a01", "a02", "a03", "a04",
    "a05", "a06", "a07", "a08", "a09", "a10", "issue", "issues", "line", "lines", "dry", "violation",
    "duplicate", "rule", "rules", "health", "score"
}


def is_in_scope_query(user_message: str, matched_topic: Optional[Dict] = None) -> bool:
    if matched_topic:
        return True
    lowered = user_message.lower()

    # Conversational follow-up queries (e.g. "can u explain in depth", "explain more", "why", "how", "give details")
    followup_phrases = [
        "explain", "depth", "in depth", "more details", "tell me more", "explain more",
        "why", "how", "what does this mean", "clarify", "can you explain", "can u explain",
        "details", "more info", "elaborate", "what is this", "how to fix", "show me",
        "explain this", "help me understand", "give details", "in-depth"
    ]
    if any(fp in lowered for fp in followup_phrases):
        return True

    # Ordinal numbers (22nd, 1st, 2nd, 3rd, 40th, etc.) or issue/finding/line number references
    if re.search(r'\b\d+(st|nd|rd|th)\b', lowered) or \
       re.search(r'\b(issue|finding|vulnerability|problem|bug|rule|line)\s*#?\s*\d+\b', lowered) or \
       re.search(r'\b\d+\s*(st|nd|rd|th)?\s*(issue|finding|vulnerability|bug)\b', lowered) or \
       re.search(r'\b(at|on|in|around)?\s*line\s*#?\s*\d+\b', lowered):
        return True

    off_topic_indicators = {
        "iphone", "ipad", "android", "samsung", "phone", "weather", "recipe", "pizza",
        "burger", "movie", "song", "sports", "football", "cricket", "president",
        "capital of", "who is", "joke", "tell me a joke", "game", "car", "shoes", "capital"
    }
    has_dev_context = any(dev_term in lowered for dev_term in [
        "code", "security", "vulnerability", "app", "api", "programming", "developer", "bug", "syntax", "python", "java", "js", "issue", "line", "finding"
    ])
    if any(ot in lowered for ot in off_topic_indicators) and not has_dev_context:
        return False

    words = set(re.findall(r'\b[a-z0-9+#_.-]+\b', lowered))
    for kw in IN_SCOPE_KEYWORDS:
        if " " in kw:
            if kw in lowered:
                return True
        else:
            if kw in words:
                return True

    return False


# Exhaustive Enterprise-Grade Knowledge & Refactoring Topic Catalog
TOPICS = {
    "sql_injection": {
        "name": "SQL Injection (SQLi / CWE-89 / OWASP A03)",
        "keywords": ["sql", "sqli", "query", "cwe 89", "cwe-89", "a03", "preparedstatement", "parameterized"],
        "what_is_it": "SQL Injection occurs when unvalidated user input is directly concatenated or formatted into SQL query strings, allowing attackers to manipulate query structure, bypass authentication, leak confidential data, or execute administrative commands.",
        "fix_guide": "Always separate query structure from user data using parameterized queries (e.g. `cursor.execute(sql, (param,))` in Python) or `PreparedStatement` placeholders (`?`) in Java/C#.",
        "code_example": "```python\n# SECURE PARAMETERIZED QUERY (Python)\nimport sqlite3\n\ndef safe_get_user(conn, username):\n    cursor = conn.cursor()\n    # Query structure is fixed; input is safely bound as data\n    query = \"SELECT id, username, email FROM users WHERE username = %s\"\n    cursor.execute(query, (username,))\n    return cursor.fetchone()\n```\n\n```java\n// SECURE PREPAREDSTATEMENT (Java)\nString sql = \"SELECT id, username FROM users WHERE username = ?\";\ntry (PreparedStatement pstmt = conn.prepareStatement(sql)) {\n    pstmt.setString(1, username);\n    try (ResultSet rs = pstmt.executeQuery()) {\n        if (rs.next()) return rs.getString(\"username\");\n    }\n}\n```"
    },
    "secrets": {
        "name": "Hardcoded Secrets & Credential Management (CWE-798 / OWASP A07)",
        "keywords": ["secret", "hardcoded", "api key", "password", "token", "credential", "jwt", "cwe 798", "cwe-798", "a07"],
        "what_is_it": "Hardcoded secrets refer to plain-text private API keys, database passwords, secret tokens, or private certificates embedded directly inside source code repositories.",
        "fix_guide": "Extract secrets into environment variables (`os.environ.get()` / `System.getenv()`), `.env` files (excluded from git), or an enterprise secrets vault (AWS Secrets Manager, HashiCorp Vault).",
        "code_example": "```python\n# SECURE ENVIRONMENT VARIABLE RETRIEVAL\nimport os\n\n# Retrieve key from environment; fail safely if missing\nAPI_SECRET = os.environ.get(\"API_SECRET_KEY\")\nif not API_SECRET:\n    raise RuntimeError(\"API_SECRET_KEY environment variable is missing\")\n```"
    },
    "syntax_error": {
        "name": "Syntax Errors & Delimiter Healing",
        "keywords": ["syntax", "delimiter", "parenthesis", "bracket", "indentation", "parse error", "compile", "unmatched", "mismatch"],
        "what_is_it": "Syntax errors occur when code violates language grammar rules—such as unmatched parentheses/brackets, improper indentation levels, missing colons, or invalid operator placements.",
        "fix_guide": "1. Ensure matching pairs for `()`, `[]`, and `{}`.\n2. In Python, use consistent 4-space indentation.\n3. Balance regex escape characters (`\\(` vs `(`).\n4. Use an AST parser to auto-heal mismatched closing trailing symbols.",
        "code_example": "```python\n# CORRECT SYNTAX (BALANCED DELIMITERS & REGEX)\nSECURITY_RULES = [\n    {\n        \"id\": \"SQL_INJECTION\",\n        \"patterns\": [\n            r\"(?i)execute\\(\\s*[\\\"'].*?[\\\"']\\s*\\+\",\n        ]\n    }\n]\n```"
    },
    "complexity": {
        "name": "Cyclomatic Complexity & Arrow Anti-Pattern (Quality)",
        "keywords": ["complexity", "nested", "arrow", "cyclomatic", "guard clause", "long method", "refactor", "clean code"],
        "what_is_it": "Deeply nested conditional blocks (Arrow Anti-Pattern) and overly long methods increase cognitive complexity, making code difficult to test, maintain, and debug.",
        "fix_guide": "Refactor deeply nested `if` statements into early return guard clauses at the top of the function to validate preconditions upfront.",
        "code_example": "```python\n# REFACTORED WITH GUARD CLAUSES (FLAT & CLEAN)\ndef process_user(user_id, data):\n    if not user_id:\n        return False\n    if not data or \"email\" not in data:\n        return False\n    if not data[\"email\"].endswith(\"@gmail.com\"):\n        return False\n        \n    # Main logic runs cleanly at indentation depth 1\n    save_user_data(user_id, data)\n    return True\n```"
    },
    "hashing": {
        "name": "Weak Cryptographic Hashing / MD5 & SHA-1 (CWE-328 / OWASP A02)",
        "keywords": ["md5", "sha1", "hash", "bcrypt", "argon2", "crypto", "cwe 328", "cwe-328", "a02", "password hash"],
        "what_is_it": "Legacy hash functions like MD5 and SHA-1 are cryptographically broken and susceptible to rapid collision attacks and GPU rainbow table cracking.",
        "fix_guide": "Use adaptive, salted password hashing algorithms with configurable work factors, such as bcrypt, Argon2, or PBKDF2.",
        "code_example": "```python\n# SECURE BCRYPT PASSWORD HASHING\nimport bcrypt\n\ndef hash_password(password: str) -> str:\n    salt = bcrypt.gensalt(rounds=12)\n    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')\n\ndef verify_password(password: str, hashed: str) -> bool:\n    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))\n```"
    },
    "owasp_top_10": {
        "name": "OWASP Top 10 (2021) Security Matrix Overview",
        "keywords": ["owasp", "top 10", "top10", "a01", "a02", "a03", "a04", "a05", "a06", "a07", "a08", "a09", "a10", "matrix"],
        "what_is_it": "The OWASP Top 10 represents the standard awareness document for developers detailing the most critical web application security risks.",
        "fix_guide": "1. **A01: Broken Access Control** – Enforce RBAC/ABAC at backend endpoints.\n2. **A02: Cryptographic Failures** – Encrypt sensitive data in transit & at rest; use bcrypt.\n3. **A03: Injection** – Parameterize SQL, HTML encode XSS, safe subprocess lists.\n4. **A04: Insecure Design** – Implement threat modeling and secure design patterns.\n5. **A05: Security Misconfiguration** – Disable default accounts, enable CSP, strip debug headers.\n6. **A06: Vulnerable Components** – Keep dependencies updated and scan SBOM.\n7. **A07: Identification & Auth** – Enforce MFA, secure session tokens, externalize secrets.\n8. **A08: Software & Data Integrity** – Verify digital signatures on CI/CD pipelines.\n9. **A09: Logging & Monitoring** – Log security events with correlation IDs.\n10. **A10: SSRF** – Restrict server HTTP client requests with strict domain whitelists.",
        "code_example": "```python\n# OWASP COMPLIANT API ENDPOINT DESIGN\nfrom fastapi import FastAPI, Depends, HTTPException, status\n\napp = FastAPI()\n\n@app.get(\"/api/v1/user/profile\")\ndef get_profile(current_user: dict = Depends(verify_jwt_token)):\n    # A01: Role-based authorization check\n    if not current_user.get(\"is_active\"):\n        raise HTTPException(status_code=403, detail=\"Access denied\")\n    return {\"user\": current_user[\"username\"]}\n```"
    },
    "command_injection": {
        "name": "OS Command Injection (CWE-78 / OWASP A03)",
        "keywords": ["command injection", "os.system", "subprocess", "shell", "exec", "runtime.exec", "cwe 78", "cwe-78"],
        "what_is_it": "OS Command Injection occurs when user input is passed directly into system shell commands without escaping or argument vectorization.",
        "fix_guide": "Never invoke system shell strings (`shell=True`). Pass arguments as an array/list directly to execution APIs.",
        "code_example": "```python\n# SECURE SUBPROCESS ARGUMENT LIST\nimport subprocess\n\ndef safe_ping(hostname: str):\n    # Argument array prevents shell manipulation\n    subprocess.run([\"ping\", \"-c\", \"1\", hostname], check=True, capture_output=True)\n```"
    },
    "xss": {
        "name": "Cross-Site Scripting (XSS / CWE-79 / OWASP A03)",
        "keywords": ["xss", "cross site scripting", "innerhtml", "dom", "escape", "sanitize", "cwe 79", "cwe-79"],
        "what_is_it": "XSS vulnerabilities allow attackers to inject client-side scripts into web pages viewed by users.",
        "fix_guide": "Use context-aware output encoding, React/Vue framework auto-escaping, and avoid `dangerouslySetInnerHTML` or `.innerHTML` assignments.",
        "code_example": "```javascript\n// SECURE REACT DOM RENDERING (AUTO-ESCAPED)\nfunction UserProfile({ username }) {\n  // React safely encodes text string preventing script execution\n  return <div className=\"user-name\">{username}</div>;\n}\n```"
    }
}


def _execute_with_timeout(func, args=(), kwargs=None, timeout_sec=1.5):
    """Executes a blocking function with a strict timeout using ThreadPoolExecutor."""
    if kwargs is None:
        kwargs = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(func, *args, **kwargs)
        try:
            return future.result(timeout=timeout_sec)
        except Exception as e:
            print(f"DEBUG: Async execution timeout ({timeout_sec}s) or error: {e}")
            return None


def generate_assistant_response(
    user_message: str,
    submission_context: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Sub-second, Enterprise-grade Conversational AI Assistant.
    Combines fast RAG vector lookup, Gemini LLM invocation with strict timeout,
    and a rich instant knowledge synthesis engine with strict out-of-scope query guards.
    """
    lowered = user_message.lower()
    normalized_msg = lowered.replace("-", " ").replace("_", " ")

    # Check for matched topic
    matched_topic = None
    for t_key, t_info in TOPICS.items():
        if any(kw in normalized_msg or kw in lowered for kw in t_info["keywords"]):
            matched_topic = t_info
            break

    # Early Scope Guard Check
    if not is_in_scope_query(user_message, matched_topic):
        return {"reply": OUT_OF_SCOPE_RESPONSE, "rag_sources": []}

    # 1. Fast RAG retrieval from ChromaDB vector store with 2.5s timeout
    retrieved_chunks = []
    try:
        rag_res = _execute_with_timeout(knowledge_base_retriever.query, args=(user_message,), kwargs={"top_k": 4}, timeout_sec=2.5)
        if rag_res and isinstance(rag_res, list):
            retrieved_chunks = rag_res
    except Exception as e:
        print(f"RAG query error: {e}")

    # Process submission context details
    code_snippet = ""
    findings = []
    lang = "code"
    if submission_context:
        lang = submission_context.get("language", "code")
        code_snippet = submission_context.get("source_code", "")
        findings = submission_context.get("findings", [])

    # 2. Gemini LLM Attempt with 5.0s timeout
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name=get_active_llm_model(),
                system_instruction=SYSTEM_PROMPT
            )
            rag_text = "\n\n".join([f"--- Source: {c.get('source', '')} ({c.get('category', '')}) ---\n{c.get('content', '')}" for c in retrieved_chunks])
            
            formatted_findings = []
            for idx, f in enumerate(findings[:50], 1):
                line_str = f" (Line {f.get('line_number')})" if f.get("line_number") else ""
                sev = str(f.get("severity", "info")).upper()
                formatted_findings.append(f"{idx}. [{sev}] {f.get('title', 'Finding')}{line_str}: {f.get('description', '')}")

            submission_text = (
                f"\n\nCurrent Analyzed Submission ({lang.upper()}):\n"
                f"Source Code:\n{code_snippet[:2000]}\n\n"
                f"Flagged Findings ({len(findings)} total):\n" + "\n".join(formatted_findings) + "\n"
            ) if submission_context else ""
            
            prompt = (
                f"Retrieved Knowledge Base Context (RAG):\n{rag_text if rag_text else 'No RAG context.'}\n"
                f"{submission_text}\n"
                f"Developer Question: {user_message}\n\n"
                "Provide a comprehensive, clear, structured markdown response with code examples:\n"
                "NOTE: If developer asks about a specific issue number (e.g. 22nd issue) or line number (e.g. line 397), explain that specific finding and code fix clearly."
            )

            llm_text = _execute_with_timeout(model.generate_content, args=(prompt,), timeout_sec=5.0)
            if llm_text and hasattr(llm_text, "text") and llm_text.text:
                resp_str = llm_text.text.strip()
                # Ensure LLM out-of-scope response format consistency
                if any(ot_phrase in resp_str.lower() for ot_phrase in ["please ask questions related", "out of scope", "unrelated"]):
                    return {"reply": OUT_OF_SCOPE_RESPONSE, "rag_sources": []}
                return {"reply": resp_str, "rag_sources": retrieved_chunks}
        except Exception as e:
            print(f"Gemini call warning ({e}). Falling back to xAI.")

    # 2b. xAI (Grok) Fallback Attempt
    xai_api_key = settings.xai_api_key or os.environ.get("XAI_API_KEY")
    if xai_api_key and str(xai_api_key).strip().lower() not in ["none", "skip", ""]:
        try:
            import openai
            client = openai.OpenAI(api_key=xai_api_key, base_url="https://api.x.ai/v1")
            completion = _execute_with_timeout(
                client.chat.completions.create, 
                kwargs={
                    "model": "grok-2-latest", 
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ]
                }, 
                timeout_sec=3.0
            )
            if completion and completion.choices and completion.choices[0].message.content:
                resp_str = completion.choices[0].message.content.strip()
                if any(ot_phrase in resp_str.lower() for ot_phrase in ["please ask questions related", "out of scope", "unrelated"]):
                    return {"reply": OUT_OF_SCOPE_RESPONSE, "rag_sources": []}
                return {"reply": resp_str, "rag_sources": retrieved_chunks}
        except Exception as e:
            print(f"xAI call warning ({e}). Falling back to instant synthesis engine.")

    # 3. Instant Dynamic Synthesis Engine (Fallback)
    # Extract ordinal / index (e.g., "22nd issue", "issue 22", "finding 22", "22nd")
    requested_index = None
    ord_match = re.search(r'\b(\d+)(st|nd|rd|th)\b', lowered) or \
                re.search(r'\b(issue|finding|vulnerability|problem|bug)\s*#?\s*(\d+)\b', lowered)
    if ord_match:
        try:
            g1 = ord_match.group(1)
            g2 = ord_match.group(2) if ord_match.lastindex and ord_match.lastindex >= 2 else None
            num_str = g1 if g1 and g1.isdigit() else (g2 if g2 and g2.isdigit() else None)
            if num_str:
                val = int(num_str)
                if 1 <= val <= len(findings):
                    requested_index = val
        except ValueError:
            pass

    # Extract line number (e.g., "line 397", "at line 397", "line #397")
    requested_line = None
    line_match = re.search(r'\bline\s*#?\s*(\d+)\b', lowered)
    if line_match:
        try:
            requested_line = int(line_match.group(1))
        except ValueError:
            pass

    # Check if submission is specifically queried
    is_submission_query = bool(requested_index) or bool(requested_line) or any(kw in normalized_msg for kw in [
        "code", "issue", "issues", "finding", "findings", "vulnerab", "bug", "bugs",
        "error", "errors", "scan", "my code", "submission", "flagged", "health score",
        "result", "present", "explain", "fix", "help"
    ])

    reply_sections = []

    # 1. Specific Issue Index Requested (e.g. "what is 22nd issue about?")
    if requested_index and findings and submission_context:
        f = findings[requested_index - 1]
        sev = str(f.get("severity", "info")).upper()
        title = f.get("title", "Flagged Finding")
        desc = f.get("description", "")
        line = f.get("line_number")
        line_str = f" (Line {line})" if line else ""
        remediation = f.get("remediation_summary", "")
        corrected = f.get("corrected_code", "")

        reply_sections.append(f"### Finding #{requested_index}: [{sev}] {title}{line_str}")
        reply_sections.append(f"**Explanation:**\n{desc}\n")
        if remediation:
            reply_sections.append(f"**Recommended Fix:**\n{remediation}\n")
        if corrected:
            reply_sections.append(f"**Refactored Secure Code:**\n```python\n{corrected.strip()}\n```")

    # 2. Specific Line Number Requested (e.g. "what is the issue at line 397?")
    elif requested_line and findings and submission_context:
        matching_line_findings = [f for f in findings if f.get("line_number") == requested_line]
        if matching_line_findings:
            reply_sections.append(f"### Flagged Finding(s) at Line {requested_line}")
            for idx, f in enumerate(matching_line_findings, 1):
                sev = str(f.get("severity", "info")).upper()
                title = f.get("title", "Flagged Finding")
                desc = f.get("description", "")
                remediation = f.get("remediation_summary", "")
                corrected = f.get("corrected_code", "")

                sec_text = f"**{idx}. [{sev}] {title}**\n"
                sec_text += f"- **Explanation:** {desc}\n"
                if remediation:
                    sec_text += f"- **Recommended Fix:** {remediation}\n"
                if corrected:
                    sec_text += f"```python\n{corrected.strip()}\n```\n"
                reply_sections.append(sec_text)
        else:
            reply_sections.append(f"### Submitted Code Analysis for Line {requested_line}")
            reply_sections.append(f"No specific security or quality issues were flagged directly at Line {requested_line} in your submitted scan report.")

    # 3. Topic Explanation
    elif matched_topic:
        reply_sections.append(f"### {matched_topic['name']}\n")
        reply_sections.append(f"**What is it?**\n{matched_topic['what_is_it']}\n")
        reply_sections.append(f"**How to Fix & Prevent it:**\n{matched_topic['fix_guide']}\n")
        reply_sections.append(f"**Production-Ready Code Example:**\n{matched_topic['code_example']}")

    # 4. Submission Details & Findings
    elif is_submission_query and submission_context:
        reply_sections.append(f"### Submitted Code Analysis Report ({lang.upper()})")
        
        # Check if matched topic matches any finding
        matching_finding = None
        if matched_topic and findings:
            for f in findings:
                f_title = f.get("title", "").lower()
                f_desc = f.get("description", "").lower()
                f_cwe = f.get("cwe_id", "").lower()
                if any(kw in f_title or kw in f_desc or kw in f_cwe for kw in matched_topic["keywords"]):
                    matching_finding = f
                    break

        if matched_topic and matching_finding:
            line = matching_finding.get("line_number")
            line_str = f" (Line {line})" if line else ""
            desc = matching_finding.get("description", matched_topic["what_is_it"])
            remediation = matching_finding.get("remediation_summary", matched_topic["fix_guide"])
            corrected = matching_finding.get("corrected_code", "")
            
            reply_sections.append(
                f"**Scan Result:** YES, **{matched_topic['name']}** IS present in your submitted code{line_str}.\n\n"
                f"**Flagged Issue Details:**\n{desc}\n\n"
                f"**Recommended Fix for Your Code:**\n{remediation}\n"
                + (f"```python\n{corrected.strip()}\n```" if corrected else "")
            )
        elif findings:
            reply_sections.append(f"Your submitted code has **{len(findings)} flagged finding(s)**:\n")
            for idx, f in enumerate(findings, 1):
                sev = str(f.get("severity", "info")).upper()
                title = f.get("title", "Flagged Finding")
                desc = f.get("description", "")
                line = f.get("line_number")
                line_str = f" (Line {line})" if line else ""
                remediation = f.get("remediation_summary", "")
                corrected = f.get("corrected_code", "")

                sec_text = f"**{idx}. [{sev}] {title}**{line_str}\n"
                sec_text += f"- **Explanation:** {desc}\n"
                if remediation:
                    sec_text += f"- **Recommended Fix:** {remediation}\n"
                if corrected:
                    sec_text += f"```python\n{corrected.strip()}\n```\n"
                reply_sections.append(sec_text)
        else:
            reply_sections.append("Your submitted source code passed all security & quality rule scans with a **100/100 Health Score**! No active vulnerabilities were detected.")

    # 5. Knowledge Base & Follow-Up Guidance Fallback
    elif not matched_topic:
        if submission_context and findings:
            reply_sections.append(f"### In-Depth Code Security & Quality Review ({lang.upper()})")
            reply_sections.append(
                f"Here is an in-depth analysis of the **{len(findings)} flagged issue(s)** in your submitted source code:\n"
            )
            for idx, f in enumerate(findings, 1):
                sev = str(f.get("severity", "info")).upper()
                title = f.get("title", "Flagged Finding")
                desc = f.get("description", "")
                line = f.get("line_number")
                line_str = f" (Line {line})" if line else ""
                remediation = f.get("remediation_summary", "")
                corrected = f.get("corrected_code", "")
                explanation = f.get("best_practice_explanation", "")

                sec_text = f"#### {idx}. [{sev}] {title}{line_str}\n"
                sec_text += f"- **Technical Risk & Impact:** {desc}\n"
                if explanation:
                    sec_text += f"- **Standards Alignment:** {explanation}\n"
                if remediation:
                    sec_text += f"- **Recommended Fix:** {remediation}\n"
                if corrected:
                    sec_text += f"```python\n{corrected.strip()}\n```\n"
                reply_sections.append(sec_text)
        elif retrieved_chunks:
            top_c = retrieved_chunks[0]
            c_text = top_c.get("content", "").strip()[:800]
            reply_sections.append(f"### Knowledge Base Guidance on \"{user_message}\"\n")
            reply_sections.append(f"{c_text}\n")
        else:
            reply_sections.append(f"### Secure Coding & Architecture Guidance\n")
            reply_sections.append(
                f"Here is expert guidance regarding your question **\"{user_message}\"**:\n\n"
                "1. **Security Vulnerability Scanning**: Our AST scanner evaluates code against OWASP Top 10 guidelines (SQL Injection, Secrets, XSS, Auth).\n"
                "2. **Code Quality Refactoring**: We eliminate Arrow Anti-Pattern nested conditionals using guard clauses.\n"
                "3. **Remediation & Diff Generation**: Clean, secure code diffs are generated automatically for every submission."
            )

    final_reply = "\n\n".join(reply_sections)
    return {"reply": final_reply, "rag_sources": retrieved_chunks}


def json_dumps_safe(obj: Any) -> str:
    import json
    try:
        return json.dumps(obj, indent=2)
    except Exception:
        return str(obj)
