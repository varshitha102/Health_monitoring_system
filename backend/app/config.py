from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Twilio Configuration
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_phone_number: str

    # Database Configuration
    database_url: str = "sqlite:///./health_monitoring.db"

    # Application Configuration
    app_name: str = "Health Monitoring SMS Service"
    app_version: str = "1.0.0"
    debug: bool = True

    # CORS Configuration
    frontend_url: str = "http://localhost:5173"

    # Mock Mode
    mock_mode: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    return Settings()
