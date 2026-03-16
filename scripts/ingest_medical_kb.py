import asyncio
import sys
import os

# Add root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.services.rag_service import RAGIngestor

async def main():
    print("Initializing ICD-10-CM Ingestion Suite...")
    ingestor = RAGIngestor()
    success = await ingestor.ingest_medical_kb()
    if success:
        print("✅ Ingestion Complete. Vector store is live on Supabase pgvector.")
    else:
        print("❌ Ingestion Failed. Check database connection strings and pgvector extension.")

if __name__ == "__main__":
    asyncio.run(main())
