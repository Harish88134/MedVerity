# MedVerity API — Configuration

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # Google Cloud Vision (OCR)
    GOOGLE_CLOUD_VISION_KEY: str = os.getenv("GOOGLE_CLOUD_VISION_KEY", "")

    # Gemini API (NLP)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Bhashini / Google Translation
    BHASHINI_API_KEY: str = os.getenv("BHASHINI_API_KEY", "")
    GOOGLE_TRANSLATE_KEY: str = os.getenv("GOOGLE_TRANSLATE_KEY", "")

    # Twilio (stretch — SMS reminders)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    TWILIO_MAIN_ACCOUNT_SID: str = os.getenv("TWILIO_MAIN_ACCOUNT_SID", "")

    # Redis (for Celery)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # App settings
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()
