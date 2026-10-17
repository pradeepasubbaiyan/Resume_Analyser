from __future__ import annotations

import os
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = 'VerityHire AI'
    app_env: str = Field(default='development', alias='APP_ENV')
    database_url: str = Field(default='sqlite:///./verityhire.db', alias='DATABASE_URL')
    redis_url: str = Field(default='redis://localhost:6379/0', alias='REDIS_URL')
    secret_key: str = Field(default='local-dev-secret-key-change-me', alias='SECRET_KEY')
    allowed_origins: str = Field(
        default='http://localhost:5173,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5175',
        alias='ALLOWED_ORIGINS',
    )
    github_token: str | None = Field(default=None, alias='GITHUB_TOKEN')
    ai_provider: str = 'local-dev'
    ai_model: str = 'mock-llm'

    class Config:
        env_file = '.env'
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
