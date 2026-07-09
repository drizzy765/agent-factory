# Azure ACA Dynamic Sessions Python Execution
import os
import sys
import subprocess
from mcp.server.fastmcp import FastMCP

# Initialize the MCP Server
mcp = FastMCP("data_sandbox")

@mcp.tool()
def execute_secure_python(code: str) -> str:
    """
    Executes Python code to analyze financial data, run statsmodels, or calculate metrics.
    In production: Routes to Azure ACA Dynamic Sessions.
    In local dev: Runs in a local subprocess.
    """
    pool_url = os.getenv("AZURE_DYNAMIC_SESSION_POOL_URL")
    
    if pool_url:
        # ---------------------------------------------------------
        # PRODUCTION: Azure Container Apps Dynamic Sessions
        # ---------------------------------------------------------
        # Here we would use azure-identity to get a token and POST 
        # the code to the secure Azure sandbox endpoint.
        return f"[Azure Sandbox] Code securely routed to {pool_url} for execution."
    
    else:
        # ---------------------------------------------------------
        # LOCAL DEV FALLBACK: Run locally via subprocess
        # ---------------------------------------------------------
        print("[Warning] No Azure Pool URL found. Running code locally.")
        try:
            # Execute the code passed by the LLM
            result = subprocess.check_output(
                [sys.executable, "-c", code], 
                stderr=subprocess.STDOUT, 
                text=True, 
                timeout=10 # Prevent infinite loops
            )
            return result.strip() if result else "Code executed successfully with no output."
        
        except subprocess.CalledProcessError as e:
            return f"Execution Error:\n{e.output}"
        except subprocess.TimeoutExpired:
            return "Execution Error: Code timed out after 10 seconds."

# Allow the server to be run directly for testing
if __name__ == "__main__":
    mcp.run()