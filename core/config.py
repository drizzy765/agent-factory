import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Deployment Environment
    ENV: str = os.getenv("ENVIRONMENT", "development")

    # Cloudflare Serverless & R2 Storage Infrastructure
    CLOUDFLARE_ACCOUNT_ID: str = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
    CLOUDFLARE_API_TOKEN: str = os.getenv("CLOUDFLARE_API_TOKEN", "")
    CLOUDFLARE_R2_ACCESS_KEY_ID: str = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID", "")
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: str = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "")
    CLOUDFLARE_R2_BUCKET_NAME: str = os.getenv("CLOUDFLARE_R2_BUCKET_NAME", "")
    CLOUDFLARE_R2_ENDPOINT_URL: str = os.getenv("CLOUDFLARE_R2_ENDPOINT_URL", "")

    # AWS / S3 Specialist Infrastructure (Optional)
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

    # Multi-Cloud Zero-Cost Model Routing & Fallbacks
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")
    COHERE_API_KEY: str = os.getenv("COHERE_API_KEY", "")
    E2B_API_KEY: str = os.getenv("E2B_API_KEY", "")

settings = Settings()
