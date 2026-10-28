# Path Traversal Prevention

## Overview

Path traversal (also known as directory traversal) vulnerabilities occur when user input is used to access files and directories outside the intended directory structure. This can lead to unauthorized access to sensitive files.

## Common Patterns

### Python Vulnerable Examples

```python
import os

# Vulnerable: Direct path concatenation
filename = "../../etc/passwd"
with open("/var/www/uploads/" + filename, "r") as f:
    content = f.read()

# Vulnerable: Using os.path.join without validation
import os.path
user_path = "../../../etc/passwd"
full_path = os.path.join("/var/www/uploads", user_path)

# Vulnerable: No path normalization
filename = "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts"
with open("C:\\uploads\\" + filename, "r") as f:
    content = f.read()
```

### Python Secure Examples

```python
import os
import os.path

# Secure: Use os.path.abspath and validate
def safe_open(base_dir, filename):
    full_path = os.path.abspath(os.path.join(base_dir, filename))
    if not full_path.startswith(os.path.abspath(base_dir)):
        raise ValueError("Path traversal attempt detected")
    with open(full_path, "r") as f:
        return f.read()

# Secure: Use whitelist validation
ALLOWED_EXTENSIONS = {".txt", ".pdf", ".jpg"}
def validate_filename(filename):
    if not filename.endswith(tuple(ALLOWED_EXTENSIONS)):
        raise ValueError("Invalid file type")
    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValueError("Invalid filename")
    return filename

# Secure: Use pathlib
from pathlib import Path
def safe_path_read(base_dir, filename):
    base = Path(base_dir).resolve()
    target = (base / filename).resolve()
    if not str(target).startswith(str(base)):
        raise ValueError("Path traversal attempt detected")
    return target.read_text()
```

### Java Vulnerable Examples

```java
import java.io.File;
import java.io.FileInputStream;

// Vulnerable: Direct path concatenation
String filename = "../../etc/passwd";
File file = new File("/var/www/uploads/" + filename);
FileInputStream fis = new FileInputStream(file);

// Vulnerable: No validation
String userPath = "../../../windows/system32/drivers/etc/hosts";
File file = new File("C:\\uploads\\" + userPath);
```

### Java Secure Examples

```java
import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

// Secure: Use Path normalization and validation
public File safeOpen(String baseDir, String filename) {
    Path basePath = Paths.get(baseDir).toAbsolutePath().normalize();
    Path targetPath = basePath.resolve(filename).normalize();
    
    if (!targetPath.startsWith(basePath)) {
        throw new SecurityException("Path traversal attempt detected");
    }
    
    return targetPath.toFile();
}

// Secure: Use whitelist validation
private static final Pattern SAFE_FILENAME = Pattern.compile("^[a-zA-Z0-9._-]+$");

public boolean validateFilename(String filename) {
    if (!SAFE_FILENAME.matcher(filename).matches()) {
        return false;
    }
    if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
        return false;
    }
    return true;
}
```

## Prevention Strategies

1. **Never use user input directly in file paths**: Always validate and sanitize
2. **Use path normalization**: Resolve paths to their canonical form before validation
3. **Validate against base directory**: Ensure resolved paths stay within intended directory
3. **Use whitelist validation**: Only allow specific characters and patterns
4. **Use secure libraries**: Use pathlib in Python, java.nio.file in Java
6. **Implement least privilege**: Run applications with minimal file system access

## Detection Patterns

- Look for direct string concatenation with file paths
- Check for missing path normalization before file operations
- Identify absence of base directory validation
- Look for use of user input in File(), open(), or similar functions
- Check for missing ".." detection in filename validation

## Severity: High

Path traversal typically results in:
- Unauthorized access to sensitive files (passwords, configuration files)
- Information disclosure
- Potential system compromise if critical files are accessed
- Data exfiltration

## Common Target Files

- `/etc/passwd`, `/etc/shadow` (Linux)
- `C:\Windows\System32\drivers\etc\hosts` (Windows)
- Configuration files (`.env`, `config.ini`, `web.config`)
- Source code files
- Database files
- Log files containing sensitive information
