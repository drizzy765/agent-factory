# Amazon S3 & Bedrock Integrations
import os
import boto3
from botocore.exceptions import NoCredentialsError
from mcp.server.fastmcp import FastMCP

# Initialize the MCP Server
mcp = FastMCP("aws_bridge")

@mcp.tool()
def read_s3_data_lake(bucket_name: str, file_key: str, max_rows: int = 100) -> str:
    """
    Reads a CSV dataset from an AWS S3 data lake.
    Use this to pull historical commodity prices or financial data for analysis.
    """
    # Ensure AWS region is set
    region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
    
    try:
        # Check for Cloudflare R2 endpoint configuration first (Zero Egress storage)
        r2_endpoint = os.getenv("CLOUDFLARE_R2_ENDPOINT_URL")
        r2_key = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
        r2_secret = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
        
        if r2_endpoint and r2_key and r2_secret:
            s3 = boto3.client(
                's3',
                endpoint_url=r2_endpoint,
                aws_access_key_id=r2_key,
                aws_secret_access_key=r2_secret,
                region_name="auto"
            )
        else:
            # Fallback to standard AWS S3 client
            s3 = boto3.client('s3', region_name=region)
        
        # In a real environment, you'd use AWS IAM roles. 
        # For local testing, ensure your AWS credentials are set in environment variables.
        response = s3.get_object(Bucket=bucket_name, Key=file_key)
        
        # Read the content
        content = response['Body'].read().decode('utf-8')
        
        # Basic parsing to return a preview (preventing token overflow)
        lines = content.split('\n')
        preview = '\n'.join(lines[:max_rows])
        
        return f"Successfully retrieved {len(lines)} rows from s3://{bucket_name}/{file_key}.\n\nPreview (Top {max_rows} rows):\n{preview}"
        
    except NoCredentialsError:
        return "AWS Error: Credentials not found. Please check your IAM configuration or environment variables."
    except Exception as e:
        return f"S3 Error: {str(e)}"

# Allow the server to be run directly for testing
if __name__ == "__main__":
    mcp.run()