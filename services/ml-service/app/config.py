import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Database (optional - for fetching training data)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Redis (optional - for caching predictions)
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    # Model settings
    MODEL_DIR: str = os.getenv("MODEL_DIR", "trained_models")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "ensemble")  # poisson | xgboost | ensemble


settings = Settings()
