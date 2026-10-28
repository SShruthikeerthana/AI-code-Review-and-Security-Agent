import ast
import re
from dataclasses import dataclass

import javalang

from app.models.submission import Language


@dataclass
class ValidationResult:
    is_valid: bool
    errors: list[dict]


# Extensions that can never contain Python/Java source text
NON_CODE_EXTENSIONS = (
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg", ".ico",
    ".tiff", ".tif", ".heic", ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".ppt", ".pptx", ".zip", ".rar", ".7z", ".tar", ".gz", ".exe", ".dll",
    ".mp4", ".mov", ".avi", ".mp3", ".wav",
)

# Magic bytes of common binary/image formats (checked against decoded latin-1 head)
_BINARY_MAGICS = (
    "\x89PNG",      # PNG
    "\xff\xd8\xff", # JPEG
    "GIF8",         # GIF87a / GIF89a
    "%PDF",         # PDF
    "PK\x03\x04",   # ZIP / docx / xlsx
    "Rar!",         # RAR
    "7z\xbc\xaf",   # 7Z
    "MZ",           # EXE/DLL
    "\x1f\x8b",     # GZIP
    "BM\x00\x00\x00\x00\x00",  # BMP (with size placeholder)
)

_FILENAME_ONLY_RE = re.compile(
    r"^[\w\-\\/ :().]*[\w\- ]+\.(png|jpe?g|gif|bmp|webp|svg|ico|tiff?|heic|pdf|docx?|xlsx?|pptx?|zip|rar|7z|exe|dll|mp[34]|mov|avi|wav)$",
    re.IGNORECASE,
)

_CODE_TOKEN_RE = re.compile(
    r"(?:\bdef\b|\bclass\b|\bimport\b|\bfrom\b|\breturn\b|\bprint\s*\(|\bif\b|\bfor\b|\bwhile\b"
    r"|\bpublic\b|\bprivate\b|\bprotected\b|\bstatic\b|\bvoid\b|\bnew\b|\bSystem\.out\b"
    r"|\bpackage\b|\blambda\b|\belif\b|\bexcept\b|\btry\b|\bcatch\b|\bthrows?\b"
    r"|==|!=|<=|>=|&&|\|\||=>|->|::)",
)

_STRUCTURAL_CHARS = set("=;(){}[]<>:+-*/%")

_ALLOWED_CONTROL_CHARS = set("\t\n\r")


def detect_non_code_input(source_code: str, filename: str | None = None) -> str | None:
    """
    Detects submissions that are not real Python/Java source text (screenshots,
    images, binary blobs, bare filenames, prose). Returns a user-friendly reason
    string when the input should be rejected, or None when acceptable.
    """
    if filename:
        lowered_name = filename.lower()
        if lowered_name.endswith(NON_CODE_EXTENSIONS):
            return (
                f"'{filename}' is not a source code file. Screenshots and images cannot be analyzed - "
                "please paste your Python or Java code as plain text, or upload a .py/.java file."
            )

    if not source_code or not source_code.strip():
        return "Submitted content is empty."

    # Binary image/blob signatures at the start of the payload
    head = source_code[:64].encode("utf-8", errors="ignore").decode("latin-1", errors="ignore")
    for magic in _BINARY_MAGICS:
        if head.startswith(magic):
            return (
                "The submitted content looks like a binary file (image/PDF/archive), not source code. "
                "This tool analyzes Python or Java code as plain text only."
            )

    # Pasted screenshot / embedded image data URI
    if re.search(r"data:image/[a-zA-Z]+;base64,", source_code[:2000]):
        return (
            "Screenshots and embedded images cannot be analyzed. "
            "Please paste your Python or Java code as plain text."
        )

    # Control characters that never appear in legitimate source files
    forbidden_controls = [
        ch for ch in source_code[:5000]
        if ord(ch) < 32 and ch not in _ALLOWED_CONTROL_CHARS
    ]
    if len(forbidden_controls) > 5:
        return (
            "The submitted content contains binary data, not readable source code. "
            "Please paste your Python or Java code as plain text."
        )

    stripped = source_code.strip()
    lines = [ln.strip() for ln in stripped.splitlines() if ln.strip()]

    # Bare filename / dropped-file path artifact (e.g. "image.png" or C:\\...\\image.png)
    non_comment_lines = [ln for ln in lines if not ln.startswith("#") and not ln.startswith("//")]
    if non_comment_lines and all(_FILENAME_ONLY_RE.match(ln) for ln in non_comment_lines):
        sample = non_comment_lines[0]
        return (
            f"'{sample}' looks like a file name, not source code. "
            "Screenshots/images cannot be analyzed - paste your actual Python or Java code as text."
        )

    # No recognizable code tokens AND no structural characters -> prose/garbage
    token_hits = len(_CODE_TOKEN_RE.findall(stripped))
    structural_hits = sum(1 for ch in stripped if ch in _STRUCTURAL_CHARS)
    if token_hits == 0 and structural_hits < 2:
        return (
            "No recognizable Python or Java code was found in the submission. "
            "Please paste actual source code as plain text (images and screenshots are not supported)."
        )

    return None


def validate_python(source_code: str) -> ValidationResult:
    errors: list[dict] = []
    try:
        # Try to parse the code
        ast.parse(source_code)
    except SyntaxError as exc:
        errors.append(
            {
                "line": exc.lineno,
                "column": exc.offset,
                "message": exc.msg or str(exc),
                "severity": "critical",
                "category": "syntax_error",
            }
        )
    except Exception as exc:
        errors.append({
            "line": None,
            "column": None,
            "message": f"Unexpected error: {str(exc)}",
            "severity": "critical",
            "category": "syntax_error",
        })
    
    return ValidationResult(is_valid=len(errors) == 0, errors=errors)


import re

def validate_java(source_code: str) -> ValidationResult:
    errors: list[dict] = []
    
    # Auto-fix common minor syntax typos (e.g., missing '(' in if/else if)
    fixed_code = source_code
    if "system.out" in fixed_code:
        fixed_code = fixed_code.replace("system.out", "System.out")
    if "system.err" in fixed_code:
        fixed_code = fixed_code.replace("system.err", "System.err")
        
    fixed_code = re.sub(r"\b(else\s+if|if)\s+([^(\n]+?\)\s*\{)", r"\1 (\2", fixed_code)

    # Wrap code snippet in class if missing class declaration
    code_to_parse = fixed_code
    if "class " not in fixed_code:
        if any(kw in fixed_code for kw in ["public ", "private ", "protected ", "static ", "void ", "int ", "boolean ", "String "]):
            code_to_parse = f"public class SnippetWrapper {{\n{fixed_code}\n}}"
        else:
            code_to_parse = f"public class SnippetWrapper {{\n    public void snippetMethod() {{\n{fixed_code}\n    }}\n}}"

    try:
        javalang.parse.parse(code_to_parse)
    except javalang.parser.JavaSyntaxError as exc:
        # javalang error structure: exc.at is a token with position info
        line = None
        column = None
        if hasattr(exc, 'at') and exc.at:
            if hasattr(exc.at, 'line'):
                line = exc.at.line
            if hasattr(exc.at, 'column'):
                column = exc.at.column
        
        errors.append(
            {
                "line": line,
                "column": column,
                "message": str(exc.description) if hasattr(exc, "description") else str(exc),
                "severity": "critical",
                "category": "syntax_error",
            }
        )
    except Exception as exc:
        errors.append({
            "line": None,
            "column": None,
            "message": f"Unexpected error: {str(exc)}",
            "severity": "critical",
            "category": "syntax_error",
        })
    return ValidationResult(is_valid=len(errors) == 0, errors=errors)


def validate_source_code(source_code: str, language: Language) -> ValidationResult:
    if language == Language.python:
        return validate_python(source_code)
    if language == Language.java:
        return validate_java(source_code)
    return ValidationResult(is_valid=False, errors=[{"message": f"Unsupported language: {language}"}])


def detect_language_from_filename(filename: str) -> Language | None:
    lowered = filename.lower()
    if lowered.endswith(".py"):
        return Language.python
    if lowered.endswith(".java"):
        return Language.java
    return None


def detect_language(source_code: str, filename: str | None = None) -> Language:
    """
    Automatically detect whether code is Python or Java based on filename extension,
    AST syntax parsing, and structural code heuristics.
    """
    if filename:
        ext_lang = detect_language_from_filename(filename)
        if ext_lang:
            return ext_lang

    code = source_code.strip()
    if not code:
        return Language.python

    # Heuristic indicator lists
    java_indicators = [
        "public class ", "private ", "protected ", "public static void ",
        "System.out.print", "package ", "import java.", "import javax.", "import org.",
        "import com.", "import jakarta.", "String[] ", "void ", "int ", "double ",
        "boolean ", "@Override", "throws ", "implements ", "extends ", "PreparedStatement ",
        "ResultSet ", "Connection ", "DriverManager.", "MessageDigest"
    ]
    
    python_indicators = [
        "def ", "from ", "elif ", "self.", "__init__",
        "print(", "if __name__ ==", "def __", "pass", "None",
        "True", "False", "lambda ", "raise ", "except ", "finally:"
    ]

    java_score = sum(code.count(ind) * 2 for ind in java_indicators)
    python_score = sum(code.count(ind) * 2 for ind in python_indicators)

    lines = [line.strip() for line in code.split("\n") if line.strip()]
    semicolon_lines = sum(1 for line in lines if line.endswith(";"))
    curly_braces = code.count("{") + code.count("}")

    if lines and (semicolon_lines / len(lines) > 0.2):
        java_score += 10
    java_score += curly_braces

    colon_lines = sum(1 for line in lines if line.endswith(":"))
    comment_lines = sum(1 for line in lines if line.startswith("#"))
    if lines and (colon_lines / len(lines) > 0.2):
        python_score += 4
    python_score += comment_lines * 2

    # Check for generic Python 'import ' that does not look like Java import
    py_import_count = sum(1 for line in lines if line.startswith("import ") and not line.endswith(";") and not any(p in line for p in ["java.", "javax.", "org.", "com.", "jakarta."]))
    python_score += py_import_count * 2

    py_valid = validate_python(code).is_valid
    java_valid = validate_java(code).is_valid

    if java_score > python_score:
        return Language.java
    if python_score > java_score:
        return Language.python

    if py_valid and not java_valid:
        return Language.python
    if java_valid and not py_valid:
        return Language.java

    return Language.python


def validate_javascript(source_code: str) -> ValidationResult:
    """Basic JS/TS syntax balance validation."""
    errors = []
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    
    for idx, char in enumerate(source_code, start=1):
        if char in "({[":
            stack.append(char)
        elif char in ")}]" :
            if not stack or stack[-1] != pairs[char]:
                errors.append({
                    "line": 1,
                    "column": idx,
                    "message": f"Mismatched closing bracket '{char}'",
                    "severity": "critical",
                    "category": "syntax_error"
                })
                break
            stack.pop()

    if stack and not errors:
        errors.append({
            "line": 1,
            "column": len(source_code),
            "message": f"Unclosed bracket '{stack[-1]}'",
            "severity": "critical",
            "category": "syntax_error"
        })

    return ValidationResult(is_valid=len(errors) == 0, errors=errors)


def validate_code(source_code: str, language: str) -> ValidationResult:
    """Unified multi-language syntax validator."""
    lang_str = str(language).lower()
    if lang_str == "java":
        return validate_java(source_code)
    elif lang_str in ["javascript", "typescript", "js", "ts"]:
        return validate_javascript(source_code)
    elif lang_str == "python":
        return validate_python(source_code)
    return validate_python(source_code)

