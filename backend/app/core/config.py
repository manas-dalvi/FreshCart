import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SQLITE_DB_PATH = BASE_DIR / "freshcart.db"

class Settings:
    PROJECT_NAME: str = "FreshCart API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{SQLITE_DB_PATH}")
    # Demonstration-level admin authentication secret (configured via environment variable)
    ADMIN_SECRET_KEY: str = os.getenv("FRESHCART_ADMIN_SECRET", "freshcart-demo-admin-key-2026")
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
