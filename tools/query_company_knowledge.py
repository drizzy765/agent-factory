from langchain_core.tools import tool
from core.rag_engine import query_knowledge

@tool
def query_company_knowledge(query: str) -> str:
    """
    Searches the internal company knowledge base for answers to questions about 
    the company, its operations, semiconductor market research, or any uploaded documents.
    """
    return query_knowledge(query)
