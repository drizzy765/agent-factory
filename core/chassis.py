import yaml
import importlib
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_aws import ChatBedrock
from langchain_groq import ChatGroq
from langchain_core.tools import StructuredTool
from langgraph.prebuilt import create_react_agent
from core.config import settings
from tools.crm_data_fetcher import crm_data_fetcher
from tools.pii_regex_masker import pii_regex_masker

class AgentChassis:
    """
    Unified engine infrastructure. Spawns distinct persona states
    by swapping runtime configurations dynamically without mutating code.
    """
    def __init__(self, profile_name: str):
        self.profile = self._load_profile(profile_name) or {}
        self.engine = self._initialize_llm_routing()
        
        # Tool registry dictionary mapping strings to actual tool functions
        self.tool_registry = {
            "crm_data_fetcher": crm_data_fetcher
        }
        self.tool_registry = {
            "execute_secure_python": execute_secure_python,
            "crm_data_fetcher": crm_data_fetcher,
            "pii_regex_masker": pii_regex_masker  # <-- Add this line!
        }

    def _load_profile(self, profile_name: str) -> Dict[str, Any]:
        profile_path = f"profiles/{profile_name}.yaml"
        with open(profile_path, "r") as file:
            return yaml.safe_load(file)

    def _initialize_llm_routing(self):
        # AI-300 Standard Router: Default to zero-cost Azure-native tier/fallback models
        # Also check if GROQ_API_KEY is provided for local dev bypass
        tier = self.profile.get("tier", "standard")
        if settings.GROQ_API_KEY:
            return ChatGroq(
                model="llama-3.3-70b-versatile",
                api_key=settings.GROQ_API_KEY
            )
        elif tier == "standard":
            return ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_base="https://any-free-fallback-route-or-azure-foundry-endpoint",
                api_key=settings.OPENROUTER_API_KEY
            )
        # Premium Track: Route on-demand analytical workloads straight to AWS Bedrock
        elif tier == "premium":
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
                # 1. Resolve from internal tool registry if present
                if hasattr(self, "tool_registry") and tool_path in self.tool_registry:
                    tool_func = self.tool_registry[tool_path]
                    # If it is already a LangChain tool (e.g. decorated with @tool)
                    if hasattr(tool_func, "args_schema"):
                        resolved.append(tool_func)
                    else:
                        langchain_tool = StructuredTool.from_function(
                            func=tool_func,
                            name=tool_path,
                            description=tool_func.__doc__ or f"Execute {tool_path}"
                        )
                        resolved.append(langchain_tool)
                # 2. Otherwise fall back to dynamic module loading from mcp_servers
                elif "." in tool_path:
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
        persona = self.profile.get("personality") or {}
        system_prompt = persona.get("system_prompt") or self.profile.get("system_prompt") or ""
        
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

