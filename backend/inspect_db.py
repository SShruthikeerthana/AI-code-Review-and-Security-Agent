import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))

from app.database import SessionLocal
from app.models.submission import CodeSubmission

db = SessionLocal()
submissions = db.query(CodeSubmission).order_by(CodeSubmission.created_at.desc()).limit(5).all()

with open("db_output.txt", "w", encoding="utf-8") as f:
    f.write(f"Total Submissions Found: {len(submissions)}\n")
    for idx, s in enumerate(submissions, start=1):
        f.write(f"\n==========================================\n")
        f.write(f"SUBMISSION #{idx} (ID: {s.id})\n")
        f.write(f"Language: {s.language.value} | Status: {s.status.value} | Health: {s.health_score}\n")
        f.write("--- ORIGINAL SOURCE CODE ---\n")
        f.write(f"{s.source_code}\n")
        f.write("--- REMEDIATED CODE ---\n")
        if s.pr_summary:
            f.write(f"{s.pr_summary.get('full_remediated_code')}\n")
        else:
            f.write("None\n")
print("Wrote db_output.txt")


