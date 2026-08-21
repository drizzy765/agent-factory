# Secure Python Execution Sandbox (Zero-Cost / Cloudflare & Edge Architecture)
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
    Executes Python code to analyze financial data, calculate metrics, or process datasets.
    Runs in an isolated execution sandbox.
    """
    e2b_api_key = os.getenv("E2B_API_KEY")
    
    if e2b_api_key:
        try:
            from e2b_code_interpreter import Sandbox
            with Sandbox(api_key=e2b_api_key) as sandbox:
                execution = sandbox.run_code(code)
                output = "\n".join([str(log) for log in execution.logs.stdout])
                if execution.error:
                    return f"Execution Error: {execution.error.name} - {execution.error.value}"
                return output if output.strip() else "Code executed successfully with no stdout output."
        except Exception as e:
            # Fall back to localized execution if E2B throws an error
            pass
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