from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str
    
    # AI
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"
    EMBEDDING_MODEL: str = "nomic-embed-text"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Federated Learning
    FL_SERVER_URL: str = "localhost:8080"
    MIN_CLIENTS_PER_ROUND: int = 2
    DP_EPSILON: float = 0.5
    DP_DELTA: float = 1e-5
    MAX_GRAD_NORM: float = 1.0

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"), 
        extra="ignore"
    )

settings = Settings()
