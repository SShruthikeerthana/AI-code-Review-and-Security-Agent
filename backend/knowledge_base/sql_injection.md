# SQL Injection — Detection and Remediation

## Overview

SQL Injection (SQLi) is an injection attack where an attacker inserts malicious SQL code into input fields, URL parameters, or HTTP headers that are concatenated into SQL queries. It is classified as OWASP A03:2021 — Injection and CWE-89.

## Attack Patterns

- `' OR '1'='1` — authentication bypass
- `'; DROP TABLE users; --` — destructive commands
- `UNION SELECT username, password FROM users` — data exfiltration
- Blind SQLi using time delays: `' AND SLEEP(5)--`

## Vulnerable Patterns

### Python
```python
# String formatting
cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")

# % formatting
cursor.execute("SELECT * FROM users WHERE id = %s" % user_id)  # Still unsafe if not parameterized

# String concatenation
query = "SELECT * FROM products WHERE category = '" + category + "'"
```

### Java
```java
String sql = "SELECT * FROM users WHERE username = '" + username + "'";
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery(sql);
```

## Secure Patterns

### Python — Parameterized Queries
```python
cursor.execute("SELECT * FROM users WHERE name = %s", (name,))
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))  # sqlite3
```

### Python — SQLAlchemy ORM
```python
session.query(User).filter(User.name == name).all()
```

### Java — PreparedStatement
```java
PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE username = ?");
ps.setString(1, username);
ResultSet rs = ps.executeQuery();
```

## Additional Defenses

- Principle of least privilege for database accounts
- Input validation with allowlists where possible
- Use stored procedures with parameterized inputs
- Web Application Firewall (WAF) as defense in depth
- ORM frameworks that parameterize by default

## Detection Checklist

- [ ] Any string concatenation/formatting in SQL context
- [ ] Dynamic table or column names from user input
- [ ] ORDER BY clauses built from user input without allowlist
- [ ] Raw SQL queries in ORM `.execute()` or `.raw()` calls with interpolation

## Remediation Severity

**Severity: Critical** — SQL injection can lead to full database compromise, data theft, and authentication bypass.
