import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "EduRAG"
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Security
    JWT_SECRET: str = "edurag_jwt_secret_super_secure_key_2025_academic_intelligence"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./edurag.db"

    # LLM Provider
    LLM_PROVIDER: str = "mistral"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "open-mistral-7b"
    LLM_BASE_URL: str = "https://api.mistral.ai/v1"

    # Embeddings & Vector DB
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    VECTOR_DB_TYPE: str = "chroma"
    CHROMA_PERSIST_DIR: str = "./vectorstore"

    # RAG Settings
    TOP_K: int = 5
    SIMILARITY_THRESHOLD: float = 0.05
    CHUNK_SIZE: int = 1200
    CHUNK_OVERLAP: int = 200

    # Uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
