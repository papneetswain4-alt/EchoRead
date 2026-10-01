import os
from typing import List
from pydantic import BaseModel

class Settings(BaseModel):
    """Application configuration settings."""
    PROJECT_NAME: str = "EchoRead API"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    
    # Allowed CORS origins for development (e.g. Vite dev server)
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

settings = Settings()
