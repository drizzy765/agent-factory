import os
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

# Define local persistence directory for Chroma vector database
CHROMA_DB_DIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db")
)

# Initialize Hugging Face local embeddings
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Global vector store instance, lazily initialized
_vector_store = None

def get_vector_store() -> Chroma:
    """
    Returns the singleton Chroma vector store instance, initializing it if necessary.
    """
    global _vector_store
    if _vector_store is None:
        os.makedirs(os.path.dirname(CHROMA_DB_DIR), exist_ok=True)
        _vector_store = Chroma(
            persist_directory=CHROMA_DB_DIR,
            embedding_function=embeddings
        )
    return _vector_store

def add_document(text: str, filename: str):
    """
    Splits document text into overlapping chunks and stores them in the local Chroma database.
    """
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_text(text)
    
    docs = [
        Document(page_content=chunk, metadata={"source": filename})
        for chunk in chunks
    ]
    
    db = get_vector_store()
    db.add_documents(docs)
    
    # Persist changes to disk if supported by the Chroma version
    if hasattr(db, "persist"):
        db.persist()

def query_knowledge(query: str, k: int = 3) -> str:
    """
    Queries the local Chroma vector store for similar document chunks.
    """
    db = get_vector_store()
    try:
        results = db.similarity_search(query, k=k)
        if not results:
            return "No relevant company knowledge found in the database. The database may be empty."
        
        formatted_results = []
        for idx, doc in enumerate(results):
            source = doc.metadata.get("source", "Unknown")
            formatted_results.append(f"[Source: {source} (Chunk {idx+1})]\n{doc.page_content}")
            
        return "\n\n---\n\n".join(formatted_results)
    except Exception as e:
        return f"Error querying company knowledge base: {str(e)}"
