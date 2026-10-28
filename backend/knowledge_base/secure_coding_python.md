# Secure Coding Guidelines — Python

## Input Validation

Always validate and sanitize external input at system boundaries. Use allowlists over denylists.

```python
import re

def validate_email(email: str) -> bool:
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))
```

Use Pydantic models for API input validation in FastAPI applications.

## SQL Injection Prevention

Never use string formatting or concatenation for SQL queries.

**Vulnerable:**
```python
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)
```

**Secure:**
```python
cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
```

With SQLAlchemy ORM:
```python
user = session.query(User).filter(User.username == username).first()
```

## Command Injection Prevention

Never pass user input directly to shell commands.

**Vulnerable:**
```python
import os
os.system(f"ping -c 1 {user_input}")
```

**Secure:**
```python
import subprocess
subprocess.run(["ping", "-c", "1", validated_host], check=True)
```

## Secrets Management

Never hardcode secrets, API keys, or credentials in source code.

**Vulnerable:**
```python
API_KEY = "sk-abc123secret"
DATABASE_PASSWORD = "admin123"
```

**Secure:**
```python
import os
API_KEY = os.environ["API_KEY"]
```

Use `.env` files locally (never commit them) and secret managers in production (AWS Secrets Manager, HashiCorp Vault).

## Password Hashing

Use bcrypt, scrypt, or Argon2 — never MD5 or SHA1 for passwords.

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

## Deserialization Safety

Never deserialize untrusted data with `pickle`.

**Vulnerable:**
```python
import pickle
data = pickle.loads(user_supplied_bytes)
```

**Secure:** Use JSON for data interchange. If pickle is required, only deserialize trusted, signed data.

## Path Traversal Prevention

Validate file paths and reject directory traversal sequences.

```python
from pathlib import Path

def safe_join(base: Path, user_path: str) -> Path:
    resolved = (base / user_path).resolve()
    if not str(resolved).startswith(str(base.resolve())):
        raise ValueError("Path traversal detected")
    return resolved
```

## Logging Best Practices

- Never log passwords, tokens, session IDs, or PII
- Use structured logging with appropriate log levels
- Log security events: failed logins, permission denials, validation failures

```python
import logging
logger = logging.getLogger(__name__)
logger.warning("Failed login attempt for user_id=%s", user_id)  # Don't log password
```

## Error Handling

Do not expose stack traces or internal details to users in production.

```python
# Production: return generic message
return {"error": "An internal error occurred"}

# Log full details server-side only
logger.exception("Unhandled error processing request")
```

## Dependency Security

Regularly audit dependencies:
```bash
pip install pip-audit
pip-audit
```

Pin dependency versions in `requirements.txt` and review updates before applying.

## Flask/Django Security Checklist

- Enable CSRF protection on all state-changing forms
- Set `DEBUG = False` in production
- Configure `SECRET_KEY` from environment variable
- Use HTTPS-only cookies: `SESSION_COOKIE_SECURE = True`
- Set Content Security Policy headers
