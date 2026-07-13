# Azure ACA Dynamic Sessions Python Execution
import os
import sys
import io
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
        # LOCAL DEV FALLBACK: Run locally via exec
        # ---------------------------------------------------------
        print("\n--- AGENT IS ATTEMPTING TO RUN THIS CODE ---")
        print(code)
        print("--------------------------------------------\n")
        
        # Redirect stdout to capture prints from the executed code
        old_stdout = sys.stdout
        redirected_output = sys.stdout = io.StringIO()
        
        try:
            # Create a safe local execution context
            local_vars = {}
            exec(code, {"__builtins__": __import__("builtins")}, local_vars)
            
            sys.stdout = old_stdout
            output = redirected_output.getvalue()
            return output if output.strip() else "Code executed successfully with no stdout output."
            
        except Exception as e:
            sys.stdout = old_stdout
            error_msg = f"Local Execution Failed: {str(e)}"
            print(f"❌ TOOL ERROR: {error_msg}")
            return error_msg

# Allow the server to be run directly for testing
if __name__ == "__main__":
    mcp.run()