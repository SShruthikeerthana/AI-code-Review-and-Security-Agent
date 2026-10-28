# Secure Coding Guidelines — Java

## Input Validation

Validate all external input at entry points. Use Bean Validation (JSR 380) annotations.

```java
import jakarta.validation.constraints.*;

public class UserRegistration {
    @NotBlank
    @Size(min = 3, max = 50)
    @Pattern(regexp = "^[a-zA-Z0-9_]+$")
    private String username;

    @Email
    @NotBlank
    private String email;
}
```

## SQL Injection Prevention

Always use PreparedStatement — never concatenate user input into SQL.

**Vulnerable:**
```java
String query = "SELECT * FROM users WHERE id = " + userId;
Statement stmt = connection.createStatement();
ResultSet rs = stmt.executeQuery(query);
```

**Secure:**
```java
String query = "SELECT * FROM users WHERE id = ?";
PreparedStatement pstmt = connection.prepareStatement(query);
pstmt.setInt(1, userId);
ResultSet rs = pstmt.executeQuery();
```

Prefer JPA/Hibernate with parameterized queries:
```java
@Query("SELECT u FROM User u WHERE u.id = :id")
Optional<User> findById(@Param("id") Long id);
```

## XSS Prevention

Escape output in web contexts. Use OWASP Java Encoder.

```java
import org.owasp.encoder.Encode;

String safe = Encode.forHtml(userInput);
```

In JSP, avoid scriptlets; use JSTL `<c:out>` which auto-escapes by default.

## Authentication and Session Management

- Use `java.security.SecureRandom` for session token generation
- Set session timeout appropriately (15-30 minutes for sensitive apps)
- Invalidate sessions on logout
- Regenerate session ID after authentication

```java
HttpSession session = request.getSession(false);
if (session != null) {
    session.invalidate();
}
request.getSession(true); // New session after login
```

## Password Storage

Use BCrypt or Argon2 via Spring Security's `BCryptPasswordEncoder`.

```java
BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
String hashed = encoder.encode(rawPassword);
boolean matches = encoder.matches(rawPassword, hashed);
```

Never store passwords in plaintext or use unsalted MD5/SHA1.

## Deserialization Safety

Java deserialization of untrusted data can lead to remote code execution.

**Prevention:**
- Avoid deserializing untrusted data entirely
- Use JSON (Jackson, Gson) instead of Java serialization
- Implement `ObjectInputFilter` (JEP 290) to allowlist classes
- Keep libraries updated (Apache Commons Collections CVE history)

## Path Traversal Prevention

```java
Path basePath = Paths.get("/app/uploads").normalize();
Path userPath = basePath.resolve(userFilename).normalize();
if (!userPath.startsWith(basePath)) {
    throw new SecurityException("Path traversal attempt detected");
}
```

## Logging Security

Use SLF4J with parameterized messages — never concatenate user input into log messages (log injection).

```java
// Secure
logger.warn("Failed login for user: {}", username);

// Avoid — log injection risk
logger.warn("Failed login for user: " + username);
```

Never log passwords, credit card numbers, or session tokens.

## Spring Security Best Practices

- Enable CSRF protection for state-changing operations
- Configure CORS explicitly — do not use `*` with credentials
- Use method-level security: `@PreAuthorize("hasRole('ADMIN')")`
- Disable default Spring Boot error whitelabel page in production
- Externalize secrets via environment variables or Spring Cloud Config

## Dependency Management

Use OWASP Dependency-Check Maven/Gradle plugin:
```xml
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
</plugin>
```

Keep Spring Framework and Log4j versions current — monitor CVE advisories.

## Exception Handling

Do not expose stack traces to end users.

```java
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(500)
            .body(new ErrorResponse("An internal error occurred"));
    }
}
```
