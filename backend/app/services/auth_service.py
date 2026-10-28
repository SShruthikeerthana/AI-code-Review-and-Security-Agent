from datetime import datetime, timedelta, timezone
import bcrypt
import jwt

from app.config import settings

ALGORITHM = "HS256"


class AuthService:
    def hash_password(self, password: str) -> str:
        # bcrypt expects bytes
        salt = bcrypt.gensalt(4)
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8")
            )
        except Exception:
            return False

    def create_access_token(self, subject: str, expires_delta: timedelta | None = None) -> str:
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
        
        to_encode = {
            "exp": expire,
            "sub": str(subject)
        }
        encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
        return encoded_jwt

    def decode_access_token(self, token: str) -> str | None:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
            return payload.get("sub")
        except jwt.InvalidTokenError:
            return None


auth_service = AuthService()
