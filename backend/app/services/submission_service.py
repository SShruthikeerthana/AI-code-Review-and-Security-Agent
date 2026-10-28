import textwrap
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.submission import CodeSubmission, Language, SubmissionStatus, SubmissionType
from app.services.code_validator import validate_source_code


def normalize_input_code(source_code: str) -> str:
    if not source_code:
        return ""
    code = source_code.replace("\r\n", "\n").replace("\r", "\n")
    lines = code.split("\n")
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    if not lines:
        return ""
    return textwrap.dedent("\n".join(lines))


class SubmissionService:
    def create_paste_submission(
        self,
        db: Session,
        source_code: str,
        language: Language,
        filename: str | None = None,
        user_id: UUID | None = None,
    ) -> CodeSubmission:
        source_code = normalize_input_code(source_code)
        validation = validate_source_code(source_code, language)
        submission = CodeSubmission(
            user_id=user_id,
            language=language,
            source_code=source_code,
            filename=filename,
            submission_type=SubmissionType.paste,
            is_valid_syntax=validation.is_valid,
            validation_errors=validation.errors or None,
            status=SubmissionStatus.pending,
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission

    def create_upload_submission(
        self,
        db: Session,
        source_code: str,
        language: Language,
        filename: str,
        user_id: UUID | None = None,
    ) -> CodeSubmission:
        source_code = normalize_input_code(source_code)
        validation = validate_source_code(source_code, language)
        submission = CodeSubmission(
            user_id=user_id,
            language=language,
            source_code=source_code,
            filename=filename,
            submission_type=SubmissionType.upload,
            is_valid_syntax=validation.is_valid,
            validation_errors=validation.errors or None,
            status=SubmissionStatus.pending,
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission

    def get_submission(self, db: Session, submission_id: UUID) -> CodeSubmission | None:
        return db.query(CodeSubmission).filter(CodeSubmission.id == submission_id).first()

    def list_submissions(self, db: Session, skip: int = 0, limit: int = 20) -> tuple[list[CodeSubmission], int]:
        query = db.query(CodeSubmission).order_by(CodeSubmission.created_at.desc())
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def list_user_submissions(self, db: Session, user_id: UUID, skip: int = 0, limit: int = 20) -> tuple[list[CodeSubmission], int]:
        query = db.query(CodeSubmission).filter(CodeSubmission.user_id == user_id).order_by(CodeSubmission.created_at.desc())
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total


submission_service = SubmissionService()
