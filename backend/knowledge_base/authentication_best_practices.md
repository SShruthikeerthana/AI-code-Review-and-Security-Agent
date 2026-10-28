# Authentication and Session Security Best Practices

## Core Principles

1. **Verify identity** — authenticate users with strong credentials
2. **Maintain session state securely** — protect session tokens
3. **Authorize every request** — authentication ≠ authorization
4. **Fail securely** — deny access on any authentication error

## Password Requirements

- Minimum 12 characters (NIST SP 800-63B recommendation)
- Check against breached password lists (Have I Been Pwned API)
- No forced periodic password rotation unless compromise suspected
- Support password managers (allow all printable characters)

## Secure Password Storage

| Algorithm | Recommended |
|-----------|-------------|
| bcrypt | Yes — cost factor 12+ |
| Argon2id | Yes — preferred for new systems |
| scrypt | Yes |
| PBKDF2 | Acceptable with 600,000+ iterations |
| MD5 / SHA1 | Never |

## Session Management

### Session Token Generation
```python
import secrets
session_id = secrets.token_urlsafe(32)
```

### Session Cookie Attributes
```
Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800
```

- **HttpOnly:** Prevents JavaScript access (XSS mitigation)
- **Secure:** HTTPS only
- **SameSite=Strict:** CSRF mitigation
- **Max-Age:** Session timeout (15-30 min for sensitive apps)

### Session Fixation Prevention

Regenerate session ID after successful authentication:
```python
request.session.cycle_key()  # Django
session.regenerate()         # General pattern
```

## Multi-Factor Authentication (MFA)

Implement MFA for:
- Administrative accounts (mandatory)
- Access to sensitive data (recommended)
- All user accounts (best practice)

TOTP (Time-based One-Time Password) via authenticator apps is preferred over SMS.

## Brute Force Protection

- Rate limit login attempts (e.g., 5 attempts per 15 minutes per IP/username)
- Implement account lockout or progressive delays
- Use CAPTCHA after repeated failures
- Log and alert on brute force patterns

```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/login")
@limiter.limit("5/minute")
async def login(request: Request):
    ...
```

## JWT Best Practices

If using JWT for authentication:

- Use strong signing algorithms (RS256, ES256) — avoid HS256 with shared secrets in distributed systems
- Set short expiration times (15 minutes for access tokens)
- Use refresh tokens with rotation
- Store tokens in HttpOnly cookies, not localStorage (XSS risk)
- Validate `iss`, `aud`, `exp`, and `nbf` claims
- Never include sensitive data in JWT payload (it's base64, not encrypted)

```python
# Vulnerable — token in localStorage
localStorage.setItem('token', jwt_token)

# Better — HttpOnly cookie set by server
response.set_cookie("access_token", token, httponly=True, secure=True, samesite="strict")
```

## Broken Authentication Indicators

- Credentials transmitted over HTTP
- Passwords logged or displayed in error messages
- Session tokens in URL parameters
- Missing logout functionality (session not invalidated)
- Predictable session IDs (sequential integers)
- Default credentials in production

## OAuth 2.0 / OpenID Connect

- Use authorization code flow with PKCE for SPAs and mobile apps
- Validate `state` parameter to prevent CSRF
- Verify token issuer and audience
- Never expose client secrets in frontend code

## Severity Guide

| Issue | Severity |
|-------|----------|
| Plaintext password storage | Critical |
| Missing authentication on sensitive endpoint | Critical |
| Session token in URL | High |
| Weak password hashing (MD5) | High |
| Missing rate limiting on login | Medium |
| Missing MFA on admin accounts | Medium |
