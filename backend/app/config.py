from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./data/app.db"
    cors_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"

    chroma_persist_dir: str = "./data/chroma"
    knowledge_base_dir: str = "./knowledge_base"
    embedding_model: str = "BAAI/bge-small-en-v1.5"

    gemini_api_key: str = ""
    xai_api_key: str = ""
    portkey_api_key: str = ""
    portkey_backup_gemini_key: str = ""
    portkey_virtual_key: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:3000/auth/github/callback"
    logfire_token: str = ""
    langsmith_api_key: str = ""
    enable_observability: bool = True
    llm_model: str = "gemini-flash-latest"  # gemini-1.5/2.0 models are RETIRED by Google (404); resolver falls back to live models
    secret_key: str = "super-secret-key-for-development-spotlight-ai"
    access_token_expire_minutes: int = 10080  # 7 days in minutes

    @property
    def sync_database_url(self) -> str:
        if self.database_url.startswith("sqlite:///./"):
            rel_path = self.database_url.replace("sqlite:///./", "")
            abs_path = (BASE_DIR / rel_path).resolve()
            return f"sqlite:///{abs_path}"
        elif self.database_url.startswith("sqlite:///") and not self.database_url.startswith("sqlite:////") and not self.database_url.startswith("sqlite:///:memory:"):
            rel_path = self.database_url.replace("sqlite:///", "")
            if not Path(rel_path).is_absolute():
                abs_path = (BASE_DIR / rel_path).resolve()
                return f"sqlite:///{abs_path}"
        return self.database_url

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def knowledge_base_path(self) -> Path:
        return (BASE_DIR / self.knowledge_base_dir).resolve() if not Path(self.knowledge_base_dir).is_absolute() else Path(self.knowledge_base_dir).resolve()

    @property
    def chroma_path(self) -> Path:
        return (BASE_DIR / self.chroma_persist_dir).resolve() if not Path(self.chroma_persist_dir).is_absolute() else Path(self.chroma_persist_dir).resolve()


settings = Settings()
