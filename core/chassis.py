import yaml
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_aws import ChatBedrock
from core.config import settings

class AgentChassis:
    """
    Unified engine infrastructure. Spawns distinct persona states
    by swapping runtime configurations dynamically without mutating code.
    """
    def __init__(self, profile_name: str):
        self.profile = self._load_profile(profile_name)
        self.engine = self._initialize_llm_routing()

    def _load_profile(self, profile_name: str) -> Dict[str, Any]:
        profile_path = f"profiles/{profile_name}.yaml"
        with open(profile_path, "r") as file:
            return yaml.safe_load(file)

    def _initialize_llm_routing(self):
        # AI-300 Standard Router: Default to zero-cost Azure-native tier/fallback models
        if self.profile.get("tier") == "standard":
            return ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_base="https://any-free-fallback-route-or-azure-foundry-endpoint",
                api_key=settings.OPENROUTER_API_KEY
            )
        # Premium Track: Route on-demand analytical workloads straight to AWS Bedrock
        elif self.profile.get("tier") == "premium":
            return ChatBedrock(
                model_id="anthropic.claude-3-5-sonnet-20240620-v1:0",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
