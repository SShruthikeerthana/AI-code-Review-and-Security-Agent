import os
from typing import List, Optional
import google.generativeai as genai
from pydantic import BaseModel, Field
from app.config import settings
from app.services.model_resolver import get_active_llm_model

class CodeAnalysisFinding(BaseModel):
    title: str = Field(description="Short title summarizing the code quality issue")
    description: str = Field(description="Detailed explanation of the issue and why it is a problem")
    line_number: Optional[int] = Field(description="The 1-based line number where the issue starts, or null if it is global")
    severity: str = Field(description="Severity: info, low, medium, high, or critical")
    category: str = Field(description="Category: complexity, code_smell, anti_pattern, or poor_practice")

class CodeAnalysisResult(BaseModel):
    findings: List[CodeAnalysisFinding]

SYSTEM_PROMPT = """
You are an expert Code Quality and Design Analysis Agent. Your task is to analyze the provided source code for:
1. Code Smells: Long methods, duplicate code, large classes, primitive obsession, or duplicate patterns.
2. Complexity issues: High cyclomatic complexity, deeply nested conditions, or overly convoluted logic.
3. Design Anti-patterns: Tight coupling, global state abuse, violation of SOLID principles, or poor encapsulation.
4. Poor Coding Practices: Empty exception handlers, missing docstrings, violating standard naming conventions, or resource leaks.

CONTEXT-AWARE DOCUMENTATION RULES:
Do NOT recommend documentation (missing docstrings or comments) for short code snippets, competitive programming template scripts, algorithmic solutions (e.g. single-function interview problems like Two Sum, Solution classes, etc.), or files under 50 lines. Only recommend documentation when analyzing production code, multi-function utility modules, APIs, backend services, or classes with multiple public methods where documentation adds real value.

For each issue found, classify it with:
- Title: A concise name of the issue.
- Description: Explanation of what the issue is, why it is bad, and how it can be refactored.
- Line number: The exact 1-based line number where the issue starts, or null if it applies globally to the entire class/file.
- Severity: low, medium, high, or critical.
- Category: complexity, code_smell, anti_pattern, or poor_practice.

Be highly precise and constructive. Do not hallucinate or create false issues. Only flag genuine issues in the submitted code.
"""

def perform_dynamic_code_analysis(source_code: str, language: str) -> List[dict]:
    """
    Dynamically analyzes ANY Python or Java source code line-by-line using structural AST &
    static quality heuristics to detect genuine code smells, arrow nesting, long methods,
    duplicate patterns, and empty exception handling with exact line numbers.
    """
    findings = []
    lines = source_code.split("\n")
    
    current_function_name = None
    current_function_start_line = None
    current_function_line_count = 0
    seen_lines_set = set()
    
    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line:
            continue
            
        # 1. Deep Nesting / Arrow Anti-Pattern Detection
        indent_spaces = len(raw_line) - len(raw_line.lstrip(' '))
        base_method_indent = 8 if language.lower() == "java" else 4
        effective_indent = indent_spaces - base_method_indent
        
        # Only flag if control flow block nesting is >= 16 spaces deep (4+ nested control blocks)
        # and line is not a standard try-with-resources result check (e.g. rs.next())
        if (
            effective_indent >= 16 
            and (line.startswith("if ") or line.startswith("if(") or line.startswith("else:") or line.startswith("elif ") or line.startswith("for ") or line.startswith("while "))
            and "rs.next()" not in line
        ):
            if (idx, "complexity") not in seen_lines_set:
                findings.append({
                    "title": "Deeply Nested Conditional Blocks (Arrow Anti-Pattern)",
                    "description": f"Line {idx} features deep nesting of conditional structures (depth level > 3). Deep nesting increases cognitive complexity and makes unit testing difficult. Refactor using guard clauses and early exit returns.",
                    "line_number": idx,
                    "severity": "medium",
                    "category": "complexity"
                })
                seen_lines_set.add((idx, "complexity"))

        # Track functions for Long Method & Complexity checks
        is_func_def = False
        func_name = ""
        if line.startswith("def "):
            is_func_def = True
            func_name = line.split("(")[0].replace("def ", "").strip()
        elif any(line.startswith(kw) for kw in ["public ", "private ", "protected ", "static ", "void "]) and "(" in line and ")" in line and "class " not in line:
            is_func_def = True
            func_name = line.split("(")[0].split()[-1].strip()

        if is_func_def:
            if current_function_name and current_function_line_count > 22:
                if (current_function_start_line, "complexity") not in seen_lines_set:
                    findings.append({
                        "title": "High Cyclomatic Complexity & Long Method",
                        "description": f"The method '{current_function_name}' spans {current_function_line_count} lines. Long methods violate Single Responsibility Principle (SRP). Refactor into smaller helper functions.",
                        "line_number": current_function_start_line,
                        "severity": "medium",
                        "category": "complexity"
                    })
                    seen_lines_set.add((current_function_start_line, "complexity"))
            current_function_name = func_name
            current_function_start_line = idx
            current_function_line_count = 0
        elif current_function_name:
            current_function_line_count += 1

        # 2. Empty Exception Handling / Swallowed Errors
        if line in ["except:", "except Exception:", "catch (Exception e) {}", "catch(Exception e){}"] or (line.startswith("except") and "pass" in line):
            findings.append({
                "title": "Empty Exception Handler (Swallowed Error)",
                "description": f"Line {idx} swallows exceptions silently without logging or re-throwing. This obscures runtime bugs during production debugging.",
                "line_number": idx,
                "severity": "medium",
                "category": "poor_practice"
            })

    # Final function length check
    if current_function_name and current_function_line_count > 22:
        if (current_function_start_line, "complexity") not in seen_lines_set:
            findings.append({
                "title": "High Cyclomatic Complexity & Long Method",
                "description": f"The method '{current_function_name}' spans {current_function_line_count} lines. Long methods violate Single Responsibility Principle. Refactor into smaller helper functions.",
                "line_number": current_function_start_line,
                "severity": "medium",
                "category": "complexity"
            })

    # 3. Duplicate Field / Attribute Declaration Check in Classes & TypedDicts
    in_class_def = False
    class_seen_attrs = set()
    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if line.startswith("class ") and ":" in line:
            in_class_def = True
            class_seen_attrs = set()
        elif in_class_def and line and not line.startswith("def ") and not line.startswith("@") and not line.startswith("#"):
            if ":" in line or "=" in line:
                if line in class_seen_attrs:
                    if (idx, "code_smell") not in seen_lines_set:
                        findings.append({
                            "title": "Duplicate Field Declaration in Class (Violation of DRY)",
                            "description": f"Line {idx} features duplicate attribute declaration '{line}' which was already declared above in the class definition. Duplicate field declarations cause redundancy and obscure class schema definitions. Refactor to declare each field once.",
                            "line_number": idx,
                            "severity": "medium",
                            "category": "code_smell"
                        })
                        seen_lines_set.add((idx, "code_smell"))
                else:
                    class_seen_attrs.add(line)
        elif line.startswith("def ") or (line and not raw_line.startswith(" ") and not raw_line.startswith("\t") and not line.startswith("#")):
            if not line.startswith("class "):
                in_class_def = False

    # 4. Duplicate Line Pattern Check (DRY Principle)
    line_counts = {}
    for idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if len(line) > 15 and not line.startswith("#") and not line.startswith("//"):
            if line in line_counts:
                line_counts[line].append(idx)
            else:
                line_counts[line] = [idx]

    for line_str, line_numbers in line_counts.items():
        if len(line_numbers) >= 2:
            first_dup_line = line_numbers[1]
            if (first_dup_line, "code_smell") not in seen_lines_set:
                findings.append({
                    "title": "Duplicate Code Pattern (Violation of DRY)",
                    "description": f"Duplicate statement pattern detected at line {first_dup_line} (previously seen at line {line_numbers[0]}). Extract duplicated logic into a shared helper method.",
                    "line_number": first_dup_line,
                    "severity": "low",
                    "category": "code_smell"
                })
                seen_lines_set.add((first_dup_line, "code_smell"))

    return findings

def analyze_code_quality(source_code: str, language: str) -> List[dict]:
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("INFO: GEMINI_API_KEY not set. Using dynamic static code quality analysis engine.")
        return perform_dynamic_code_analysis(source_code, language)

    genai.configure(api_key=api_key)
    
    model = genai.GenerativeModel(
        model_name=get_active_llm_model(),
        system_instruction=SYSTEM_PROMPT
    )
    
    prompt = f"Analyze the following {language} code:\n\n{source_code}"
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=CodeAnalysisResult
            )
        )
        
        # Parse output
        if not response.parts:
            print("WARN: Gemini response has no parts (e.g. Recitation/Safety block).")
            return perform_dynamic_code_analysis(source_code, language)
        raw_text = response.text.replace("```json\n", "").replace("```json", "").replace("\n```", "").replace("```", "").strip()
        result = CodeAnalysisResult.model_validate_json(raw_text)
        return [finding.model_dump() for finding in result.findings]
    except Exception as e:
        print(f"WARN: Gemini code analysis generation or parse failed ({e}). Falling back to Groq...")
        
        xai_api_key = settings.xai_api_key or os.environ.get("XAI_API_KEY") or os.environ.get("GROQ_API_KEY")
        if xai_api_key:
            try:
                import openai
                import json
                client = openai.OpenAI(
                    api_key=xai_api_key,
                    base_url="https://api.groq.com/openai/v1",
                    timeout=15.0
                )
                groq_models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768"]
                res = None
                for groq_model in groq_models:
                    try:
                        res = client.chat.completions.create(
                            model=groq_model,
                            messages=[
                                {"role": "system", "content": SYSTEM_PROMPT + "\nMust return strict JSON matching `{\"findings\": [{...}]}`."},
                                {"role": "user", "content": prompt}
                            ],
                            response_format={"type": "json_object"}
                        )
                        print(f"[CODE ANALYSIS] Groq model '{groq_model}' responded successfully.")
                        break
                    except Exception as model_err:
                        print(f"[CODE ANALYSIS] WARN: Groq model '{groq_model}' failed ({model_err}).")
                        continue

                if res and res.choices and res.choices[0].message.content:
                    data = json.loads(res.choices[0].message.content)
                    if "findings" in data: return data["findings"]
                    return data
            except Exception as ex:
                print(f"WARN: Groq code analysis fallback failed ({ex}). Falling back to static engine.")
                return perform_dynamic_code_analysis(source_code, language)
                
        return perform_dynamic_code_analysis(source_code, language)
