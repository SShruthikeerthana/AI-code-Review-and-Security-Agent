# OWASP Top 10 (2021) — Secure Coding Reference

## A01:2021 — Broken Access Control

Broken access control occurs when users can act outside their intended permissions. Common failures include bypassing authorization checks, elevating privileges, and accessing other users' data.

**Prevention:**
- Deny by default — enforce access controls on every request
- Use server-side session management; never trust client-side access control
- Implement role-based access control (RBAC) or attribute-based access control (ABAC)
- Log access control failures and alert on repeated violations
- Disable directory listing and ensure metadata files (`.git`, backup files) are not web-accessible

**Code smell indicators:**
- Missing authorization checks on API endpoints
- Relying on hidden form fields or URL parameters for access decisions
- Using `request.user` without verifying permissions for the specific resource

## A02:2021 — Cryptographic Failures

Previously "Sensitive Data Exposure." Failures related to cryptography lead to exposure of sensitive data such as passwords, health records, and financial information.

**Prevention:**
- Classify data processed, stored, and transmitted; apply controls accordingly
- Encrypt sensitive data at rest using AES-256 or equivalent
- Use TLS 1.2+ for all data in transit
- Never store passwords in plaintext — use bcrypt, scrypt, or Argon2 with unique salts
- Disable caching for responses containing sensitive data
- Do not use weak algorithms (MD5, SHA1) for password hashing

## A03:2021 — Injection

Injection flaws occur when untrusted data is sent to an interpreter as part of a command or query. SQL, NoSQL, OS command, and LDAP injection are common.

**Prevention:**
- Use parameterized queries / prepared statements exclusively
- Use ORM query builders that parameterize inputs
- Validate and sanitize all inputs on the server side
- Use allowlists for input validation, not denylists
- Escape special characters when concatenation is unavoidable
- Limit database account privileges to minimum required

**Python example (vulnerable):**
```python
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")  # SQL Injection
```

**Python example (secure):**
```python
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

## A04:2021 — Insecure Design

Insecure design is a broad category representing missing or ineffective control design. It requires threat modeling, secure design patterns, and reference architectures.

**Prevention:**
- Establish and use a secure development lifecycle
- Perform threat modeling for critical authentication, access control, and business logic flows
- Use secure design patterns (e.g., defense in depth, least privilege)
- Integrate security language and controls into user stories

## A05:2021 — Security Misconfiguration

Security misconfiguration is the most commonly seen issue, often resulting from insecure default configurations, incomplete configurations, or misconfigured HTTP headers.

**Prevention:**
- Implement a repeatable hardening process
- Remove unnecessary features, frameworks, and sample code
- Keep all software up to date
- Configure security headers: `Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`
- Disable detailed error messages in production

## A06:2021 — Vulnerable and Outdated Components

Using components with known vulnerabilities undermines application defenses.

**Prevention:**
- Maintain an inventory of all components and their versions
- Monitor CVE databases and security advisories
- Use dependency scanning tools (pip-audit, npm audit, OWASP Dependency-Check)
- Remove unused dependencies and features

## A07:2021 — Identification and Authentication Failures

Previously "Broken Authentication." Confirmations of the user's identity, authentication, and session management are frequently implemented incorrectly.

**Prevention:**
- Implement multi-factor authentication where possible
- Never ship with default credentials
- Use strong password policies and secure password recovery
- Limit failed login attempts; implement account lockout or rate limiting
- Use secure, random session identifiers; regenerate after login
- Set session cookies with `HttpOnly`, `Secure`, and `SameSite` attributes

## A08:2021 — Software and Data Integrity Failures

Failures related to code and infrastructure that does not protect against integrity violations, including insecure CI/CD pipelines and unsigned updates.

**Prevention:**
- Verify software integrity using digital signatures
- Ensure CI/CD pipelines have appropriate access controls and audit logging
- Do not use unsigned or unverified packages from public repositories without review

## A09:2021 — Security Logging and Monitoring Failures

Insufficient logging, detection, monitoring, and active response enables attackers to persist and pivot.

**Prevention:**
- Log authentication events, access control failures, and input validation failures
- Ensure logs are tamper-resistant and stored securely
- Establish effective monitoring and alerting
- Never log sensitive data (passwords, tokens, PII)

## A10:2021 — Server-Side Request Forgery (SSRF)

SSRF flaws occur when a web application fetches a remote resource without validating the user-supplied URL.

**Prevention:**
- Sanitize and validate all user-supplied URL inputs
- Use allowlists of permitted domains and protocols
- Disable HTTP redirections in the HTTP client
- Segment remote resource access functionality in isolated networks

## Severity Scoring Guide

| Severity | Criteria |
|----------|----------|
| Critical | Remote code execution, authentication bypass, mass data exposure |
| High | SQL injection, stored XSS, privilege escalation |
| Medium | Reflected XSS, CSRF, information disclosure |
| Low | Missing security headers, verbose error messages |
| Info | Style issues, minor best-practice deviations |
