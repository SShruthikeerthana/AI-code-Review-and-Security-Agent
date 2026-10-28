import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))

from app.database import SessionLocal
from app.models.submission import CodeSubmission

db = SessionLocal()
submissions = db.query(CodeSubmission).order_by(CodeSubmission.created_at.desc()).limit(5).all()

with open("db_submissions.txt", "w", encoding="utf-8") as f:
    f.write(f"Total Submissions found: {len(submissions)}\n\n")

    for idx, s in enumerate(submissions, start=1):
        f.write(f"=== SUBMISSION #{idx} ===\n")
        f.write(f"ID: {s.id}\n")
        f.write(f"Status: {s.status}\n")
        f.write(f"Filename: {s.filename}\n")
        f.write(f"Language: {s.language}\n")
        f.write(f"Created At: {s.created_at}\n")
        f.write("--- SOURCE CODE ---\n")
        f.write(f"{s.source_code}\n")
        f.write("--- PR SUMMARY ---\n")
        if s.pr_summary:
            f.write(f"Keys: {list(s.pr_summary.keys())}\n")
            rem_code = s.pr_summary.get("full_remediated_code")
            if rem_code:
                f.write(f"FULL REMEDIATED CODE:\n{rem_code}\n")
            else:
                f.write("FULL REMEDIATED CODE: None\n")
            f.write(f"SELF HEALING METADATA:\n{json.dumps(s.pr_summary.get('self_healing_metadata'), indent=2)}\n")
        else:
            f.write("PR SUMMARY: None\n")
        f.write("\n" + "="*50 + "\n\n")
print("Wrote db_submissions.txt")

