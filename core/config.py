import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Deployment Environment
    ENV: str = os.getenv("ENVIRONMENT", "development")

    # Azure Base Infrastructure
    AZURE_TENANT_ID: str = os.getenv("AZURE_TENANT_ID", "")
    AZURE_CLIENT_ID: str = os.getenv("AZURE_CLIENT_ID", "")
    AZURE_CLIENT_SECRET: str = os.getenv("AZURE_CLIENT_SECRET", "")
    AZURE_DYNAMIC_SESSION_POOL_URL: str = os.getenv("AZURE_DYNAMIC_SESSION_POOL_URL", "")

    # AWS Specialist Infrastructure
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

    # Multi-Cloud Model Routing Fallbacks
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

settings = Settings()
