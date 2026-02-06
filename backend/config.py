from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    data_file_path: str = "./data/performance.csv"
    openai_model: str = "gpt-4.1-mini"
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
