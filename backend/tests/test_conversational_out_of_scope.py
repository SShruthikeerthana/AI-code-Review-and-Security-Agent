import os
import sys
import pytest

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.conversational_assistant import generate_assistant_response, OUT_OF_SCOPE_RESPONSE


def test_out_of_scope_queries_return_refusal():
    """Verify that non-technical and off-topic queries return the exact refusal message."""
    out_of_scope_samples = [
        "what is iphone",
        "what is iphone 15 price",
        "what is the weather in London today?",
        "recipe for pepperoni pizza",
        "who is the president of US?",
        "tell me a funny joke",
        "what is the capital of France?",
    ]

    mock_submission_context = {
        "id": "mock-sub-id",
        "language": "python",
        "source_code": "cursor.execute('SELECT * FROM users WHERE id = ' + user_id)",
        "findings": [
            {
                "title": "SQL Injection in User Query",
                "severity": "critical",
                "line_number": 1,
                "description": "Raw string concatenation in SQL query allows SQL Injection.",
                "remediation_summary": "Use parameterized query placeholders."
            }
        ]
    }

    for query in out_of_scope_samples:
        # Test without submission context
        res_no_ctx = generate_assistant_response(user_message=query, submission_context=None)
        assert res_no_ctx["reply"] == OUT_OF_SCOPE_RESPONSE, f"Failed for query '{query}' without context"
        assert res_no_ctx["rag_sources"] == []

        # Test WITH active submission context open (should STILL reject out-of-scope questions)
        res_with_ctx = generate_assistant_response(user_message=query, submission_context=mock_submission_context)
        assert res_with_ctx["reply"] == OUT_OF_SCOPE_RESPONSE, f"Failed for query '{query}' with submission context"
        assert res_with_ctx["rag_sources"] == []


def test_in_scope_technical_queries_succeed():
    """Verify that technical, code, security, and OWASP queries receive technical answers."""
    in_scope_samples = [
        "what is sql injection and is it present in my code",
        "How do I prevent SQL Injection in Python?",
        "Explain guard clauses and Arrow Anti-Pattern",
        "How to securely manage hardcoded API keys and secrets?",
        "What are OWASP Top 10 security guidelines?",
    ]

    for query in in_scope_samples:
        res = generate_assistant_response(user_message=query, submission_context=None)
        assert res["reply"] != OUT_OF_SCOPE_RESPONSE, f"In-scope query '{query}' was incorrectly rejected!"
        assert len(res["reply"]) > 50


def test_specific_issue_and_line_number_queries():
    """Verify that queries referencing issue numbers (e.g. 22nd issue) or line numbers (line 397) are accepted and answered."""
    findings = []
    for i in range(1, 41):
        findings.append({
            "title": f"Security Smell Issue #{i}",
            "severity": "medium",
            "line_number": 300 + i,
            "description": f"Detailed description for issue #{i} at line {300 + i}.",
            "remediation_summary": f"Fix for issue #{i}"
        })

    mock_submission = {
        "id": "mock-40-findings",
        "language": "python",
        "source_code": "def process(): pass\n" * 450,
        "findings": findings
    }

    # Query for 22nd issue
    res_22 = generate_assistant_response(user_message="what is 22nd issue about?", submission_context=mock_submission)
    assert res_22["reply"] != OUT_OF_SCOPE_RESPONSE, "22nd issue query was incorrectly rejected as out of scope!"
    assert "22" in res_22["reply"] or "Issue #22" in res_22["reply"]

    # Query for line 397
    res_line = generate_assistant_response(user_message="what is the issue at line 397?", submission_context=mock_submission)
    assert res_line["reply"] != OUT_OF_SCOPE_RESPONSE, "Line 397 query was incorrectly rejected as out of scope!"
    assert "397" in res_line["reply"]


def test_conversational_followup_queries():
    """Verify conversational follow-up queries like 'can u explain in depth' are accepted and return in-depth explanations."""
    mock_submission = {
        "id": "mock-sub-1",
        "language": "python",
        "source_code": "cursor.execute('SELECT * FROM users WHERE id = ' + user_id)",
        "findings": [
            {
                "title": "SQL Injection in Query",
                "severity": "critical",
                "line_number": 1,
                "description": "Raw string concatenation in SQL query allows SQL Injection.",
                "remediation_summary": "Use parameterized query placeholders.",
                "corrected_code": "cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))"
            }
        ]
    }

    followup_queries = [
        "can u explain in depth",
        "explain in depth",
        "can you explain",
        "explain more",
        "tell me more",
        "give details"
    ]

    for q in followup_queries:
        res = generate_assistant_response(user_message=q, submission_context=mock_submission)
        assert res["reply"] != OUT_OF_SCOPE_RESPONSE, f"Follow-up query '{q}' was incorrectly rejected as out of scope!"
        assert "SQL Injection" in res["reply"] or "In-Depth" in res["reply"] or "Technical Risk" in res["reply"]


if __name__ == "__main__":
    print("--- TESTING CHATBOT OUT-OF-SCOPE GUARD & IN-SCOPE QUERY RESPONSES ---")
    print("\n1. Testing Out-of-Scope Queries...")
    test_out_of_scope_queries_return_refusal()
    print("✅ All Out-of-Scope queries successfully returned expected refusal message!")

    print("\n2. Testing In-Scope Technical Queries...")
    test_in_scope_technical_queries_succeed()
    print("✅ All In-Scope queries successfully received technical guidance!")

    print("\n3. Testing Specific Issue Number & Line Number Queries...")
    test_specific_issue_and_line_number_queries()
    print("✅ Issue #22 and Line 397 queries successfully received detailed finding answers!")

    print("\n4. Testing Conversational Follow-Up Queries...")
    test_conversational_followup_queries()
    print("✅ 'can u explain in depth' and follow-up queries successfully returned in-depth guidance!")

    print("\n--- ALL OUT-OF-SCOPE AND IN-SCOPE CHATBOT TESTS PASSED! ---")



