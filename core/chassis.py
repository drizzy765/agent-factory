import yaml
import importlib
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_aws import ChatBedrock
from langchain_groq import ChatGroq
from langchain_core.tools import StructuredTool
from langgraph.prebuilt import create_react_agent
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
        # Also check if GROQ_API_KEY is provided for local dev bypass
        if settings.GROQ_API_KEY:
            return ChatGroq(
                model="llama-3.3-70b-versatile",
                api_key=settings.GROQ_API_KEY
            )
        elif self.profile.get("tier") == "standard":
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

    def _resolve_tools(self):
        resolved = []
        allocated_tools = self.profile.get("tools") or []
        for tool_path in allocated_tools:
            try:
                # Expected format: "module_name.func_name" e.g., "aws_bridge.read_s3_data_lake"
                if "." in tool_path:
                    module_name, func_name = tool_path.split(".", 1)
                    module = importlib.import_module(f"mcp_servers.{module_name}")
                    func = getattr(module, func_name)
                    # Wrap function as StructuredTool
                    langchain_tool = StructuredTool.from_function(
                        func=func,
                        name=func_name,
                        description=func.__doc__ or f"Execute {func_name}"
                    )
                    resolved.append(langchain_tool)
                else:
                    print(f"Skipping invalid tool path format: {tool_path}")
            except Exception as e:
                print(f"Error loading tool {tool_path}: {e}")
        return resolved

    def run(self, user_prompt: str) -> str:
        """
        Executes the agent loop autonomously using LangGraph's prebuilt react agent.
        """
        # 1. Resolve assigned tools
        tools = self._resolve_tools()
        
        # 2. Extract personality configurations
        persona = self.profile.get("personality", {})
        system_prompt = persona.get("system_prompt", "")
        
        # 3. Create the LangGraph react agent
        agent_executor = create_react_agent(
            model=self.engine,
            tools=tools,
            prompt=system_prompt
        )
        
        # 4. Invoke the agent
        response = agent_executor.invoke({"messages": [("user", user_prompt)]})
        
        # 5. Extract and return the final AI message content
        messages = response.get("messages", [])
        if messages:
            return messages[-1].content
        return "No response generated."

