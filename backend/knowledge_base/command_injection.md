# Command Injection Prevention

## Overview

Command injection occurs when untrusted user input is used to construct operating system commands. This vulnerability allows attackers to execute arbitrary commands on the host system.

## Common Patterns

### Python Vulnerable Examples

```python
import os

# Vulnerable: Direct string concatenation
user_input = "file.txt; rm -rf /"
os.system("cat " + user_input)

# Vulnerable: Using subprocess with shell=True
import subprocess
user_input = "file.txt; cat /etc/passwd"
subprocess.call("cat " + user_input, shell=True)

# Vulnerable: Using os.popen
user_input = "file.txt && whoami"
os.popen("ls " + user_input)
```

### Python Secure Examples

```python
import subprocess
import shlex

# Secure: Use subprocess without shell
user_input = "file.txt"
subprocess.run(["cat", user_input], check=False)

# Secure: Use shlex.quote for shell commands
user_input = "file.txt"
subprocess.run("cat " + shlex.quote(user_input), shell=True, check=False)

# Secure: Use whitelist validation
ALLOWED_FILES = {"file1.txt", "file2.txt", "file3.txt"}
if user_input in ALLOWED_FILES:
    subprocess.run(["cat", user_input])
```

### Java Vulnerable Examples

```java
import java.lang.Runtime;
import java.lang.Process;

// Vulnerable: Direct string concatenation
String filename = "file.txt; rm -rf /";
Process p = Runtime.getRuntime().exec("cat " + filename);

// Vulnerable: Using ProcessBuilder with shell
String[] cmd = {"/bin/sh", "-c", "cat " + filename};
ProcessBuilder pb = new ProcessBuilder(cmd);
Process p = pb.start();
```

### Java Secure Examples

```java
import java.lang.ProcessBuilder;
import java.util.Arrays;

// Secure: Use ProcessBuilder without shell
String filename = "file.txt";
ProcessBuilder pb = new ProcessBuilder("cat", filename);
Process p = pb.start();

// Secure: Validate input against whitelist
Set<String> ALLOWED_FILES = Set.of("file1.txt", "file2.txt", "file3.txt");
if (ALLOWED_FILES.contains(filename)) {
    ProcessBuilder pb = new ProcessBuilder("cat", filename);
    Process p = pb.start();
}
```

## Prevention Strategies

1. **Avoid shell execution**: Never use shell=True in Python or shell commands in Java when possible
2. **Use parameterized APIs**: Use subprocess.run() with list arguments in Python, ProcessBuilder in Java
3. **Input validation**: Validate all user inputs against strict allowlists
4. **Least privilege**: Run applications with minimal system permissions
5. **Sanitization**: Use proper escaping functions when shell commands are unavoidable

## Detection Patterns

- Look for `os.system()`, `subprocess.call(shell=True)`, `os.popen()` in Python
- Look for `Runtime.exec()`, `ProcessBuilder` with string concatenation in Java
- Check for user input directly concatenated into command strings
- Identify missing input validation before command execution

## Severity: Critical

Command injection typically results in:
- Complete system compromise
- Data exfiltration
- Lateral movement in networks
- Privilege escalation
