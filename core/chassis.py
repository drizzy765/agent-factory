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
from tools.query_company_knowledge import query_company_knowledge
from mcp_servers.data_sandbox import execute_secure_python

class AgentChassis:
    """
    Unified engine infrastructure. Spawns distinct persona states
    by swapping runtime configurations dynamically without mutating code.
    """
    def __init__(self, profile_name: str, client_openrouter_key: str = None, client_cerebras_key: str = None):
        self.profile = self._load_profile(profile_name) or {}
        self.engine = self._initialize_llm_routing(client_openrouter_key, client_cerebras_key)
        
        # Tool registry dictionary mapping strings to actual tool functions
        self.tool_registry = {
            "execute_secure_python": execute_secure_python,
            "crm_data_fetcher": crm_data_fetcher,
            "pii_regex_masker": pii_regex_masker,
            "query_company_knowledge": query_company_knowledge
        }

    def _load_profile(self, profile_name: str) -> Dict[str, Any]:
        profile_path = f"profiles/{profile_name}.yaml"
        with open(profile_path, "r") as file:
            return yaml.safe_load(file)

    def _initialize_llm_routing(self, client_openrouter_key: str = None, client_cerebras_key: str = None):
        # Initialize primary engine (Groq) with max_retries=0 for instant failure on 429
        primary_llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            api_key=settings.GROQ_API_KEY,
            max_retries=0
        )
        
        # Build fallbacks dynamically based on environment keys for graceful degradation
        fallbacks = []
        
        # Check client Cerebras key, fallback to settings
        cerebras_key = client_cerebras_key if client_cerebras_key else settings.CEREBRAS_API_KEY
        if cerebras_key:
            cerebras_llm = ChatOpenAI(
                model="llama-3.1-70b",
                base_url="https://api.cerebras.ai/v1",
                api_key=cerebras_key,
                temperature=0
            )
            fallbacks.append(cerebras_llm)
            
        # Check client OpenRouter key, fallback to settings
        openrouter_key = client_openrouter_key if client_openrouter_key else settings.OPENROUTER_API_KEY
        if openrouter_key:
            openrouter_llm = ChatOpenAI(
                model="meta-llama/llama-3.3-70b-instruct",
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key,
                temperature=0
            )
            fallbacks.append(openrouter_llm)
            
        if fallbacks:
            robust_llm = primary_llm.with_fallbacks(fallbacks)
        else:
            robust_llm = primary_llm
            
        return robust_llm

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

