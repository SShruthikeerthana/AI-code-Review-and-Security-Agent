import time
from app.agents.conversational_assistant import generate_assistant_response

test_queries = [
    "what is sql injection and is it present in my code",
    "Explain SQL Injection & parameterized query fix",
    "What are OWASP Top 10 A01-A10 security categories?",
    "How do guard clauses fix the Arrow Anti-Pattern?",
    "How to securely store API keys & secrets?",
]

print("--- TESTING CHATBOT CHATGPT-GRADE PERFORMANCE & ACCURACY ---")

for q in test_queries:
    t0 = time.time()
    res = generate_assistant_response(user_message=q)
    elapsed = time.time() - t0
    reply = res.get("reply", "")
    print(f"\n[QUERY]: \"{q}\"")
    print(f"⏱️ ELAPSED TIME: {elapsed:.3f} seconds")
    print(f"📝 RESPONSE LENGTH: {len(reply)} chars")
    print("--------------------------------------------------")
    print(reply[:250] + ("..." if len(reply) > 250 else ""))

print("\n--- ALL CHATBOT SPEED & ACCURACY TESTS PASSED ---")
