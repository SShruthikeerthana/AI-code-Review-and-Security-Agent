from app.database import SessionLocal
from app.models.submission import Language
from app.services.submission_service import submission_service

db = SessionLocal()

# Indented pasted code snippet (e.g. copied from inside an IDE class)
indented_paste = "    def hello():\r\n        print('Hello World')"

submission = submission_service.create_paste_submission(
    db=db,
    source_code=indented_paste,
    language=Language.python,
    filename="test.py"
)

print("PASTE SUBMISSION IS VALID SYNTAX:", submission.is_valid_syntax)
print("DEDENTED SOURCE CODE:\n", repr(submission.source_code))
