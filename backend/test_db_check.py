import sys
import os
from uuid import UUID

sys.path.insert(0, os.path.abspath("."))

from app.database import get_db, SessionLocal
from app.models.submission import CodeSubmission

db = SessionLocal()
try:
    sub_id = UUID("610cc954-ad91-42b6-889f-992363033856")
    sub = db.query(CodeSubmission).filter(CodeSubmission.id == sub_id).first()
    if sub:
        print("Submission found:")
        print("Filename:", sub.filename)
        print("Language:", sub.language)
        print("Status:", sub.status)
        pr_sum = sub.pr_summary or {}
        print("Has PR Summary:", bool(pr_sum))
        print("Has full_remediated_code:", bool(pr_sum.get("full_remediated_code")))
        print("\n--- pr_summary keys ---")
        for k in pr_sum.keys():
            if k == "full_remediated_code":
                print(f"full_remediated_code (len={len(pr_sum[k])})")
            elif k == "self_healing_metadata":
                print(f"self_healing_metadata: {pr_sum[k]}")
            else:
                print(f"{k}: {pr_sum[k]}")
        print("\n--- source_code ---")
        print(sub.source_code[:500])
        print("\n--- full_remediated_code ---")
        print(pr_sum.get("full_remediated_code")[:500] if pr_sum.get("full_remediated_code") else "None")
    else:
        print("Submission ID not found in database.")
finally:
    db.close()
