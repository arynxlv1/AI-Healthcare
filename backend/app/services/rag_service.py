from langchain_community.vectorstores import PGVector
from langchain_community.embeddings import OllamaEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from ..core.config import settings
import httpx
import os

# Source: ICD-10-CM from cms.gov (Mock download/parsing for demo)
class RAGIngestor:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.EMBEDDING_MODEL
        )
        self.connection_string = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

    async def ingest_medical_kb(self):
        print("Starting RAG Ingestion...")
        
        # Mocking the fetch from cms.gov as specified in plan
        # Real world: would use httpx to download zip and parse txt files
        medical_texts = [
            "Influenza, also known as the flu, is a highly contagious respiratory illness caused by influenza viruses.",
            "Common cold is a viral infection of your nose and throat. It's usually harmless.",
            "Pneumonia is an infection that inflames the air sacs in one or both lungs.",
            "COVID-19 is a disease caused by a new strain of coronavirus. Symptoms include fever, cough, and fatigue."
        ]
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        docs = text_splitter.create_documents(medical_texts)
        
        # PGVector initialization
        # COLLECTION_NAME as 'medical_kb'
        # In a real setup, we'd ensure pgvector extension is enabled on Supabase
        try:
            if "sqlite" in settings.DATABASE_URL or not self.connection_string:
                raise ValueError("Using local/mock database - falling back to JSON storage")
            
            vector_store = PGVector.from_documents(
                embedding=self.embeddings,
                documents=docs,
                collection_name="medical_kb",
                connection_string=self.connection_string,
                pre_delete_collection=True
            )
            print("Successfully ingested 4 clinical documents into pgvector.")
            return True
        except Exception as e:
            print(f"RAG Ingestion to PGVector failed: {e}")
            print("Falling back to local synthetic_medical_kb.json for retrieval simulation.")
            # For demo/test purposes, we just ensure the file exists
            if not os.path.exists("scripts/synthetic_medical_kb.json"):
                from scripts.generate_synthetic_medical_kb import generate
                generate()
            return True

rag_ingestor = RAGIngestor()

if __name__ == "__main__":
    import asyncio
    asyncio.run(rag_ingestor.ingest_medical_kb())
