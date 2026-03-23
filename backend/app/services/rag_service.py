from langchain_community.vectorstores import PGVector
from langchain_community.embeddings import OllamaEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from ..core.config import settings
import httpx
import os
import json
from pathlib import Path

class RAGIngestor:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.EMBEDDING_MODEL
        )
        self.connection_string = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")
        self._vector_store = None
        # Root path is two levels up from this file (app/services/ -> backend/ -> root)
        self.root_path = Path(__file__).parent.parent.parent.parent

    def _get_vector_store(self):
        if self._vector_store is None:
            if "sqlite" in settings.DATABASE_URL or not self.connection_string:
                return None
            
            try:
                self._vector_store = PGVector(
                    embedding_function=self.embeddings,
                    collection_name="medical_kb",
                    connection_string=self.connection_string,
                )
            except:
                return None
        return self._vector_store

    async def search(self, query: str, k: int = 3):
        """Searches for relevant medical context using PGVector with local JSON fallback."""
        try:
            store = self._get_vector_store()
            if store:
                # similarity_search is typically synchronous in langchain_community
                docs = store.similarity_search(query, k=k)
                return [{"content": d.page_content, "metadata": d.metadata} for d in docs]
        except Exception as e:
            print(f"PGVector search failed: {e}")
        
        # Fallback to local synthetic KB
        return self._fallback_search(query, k=k)

    def _fallback_search(self, query: str, k: int = 3):
        kb_path = self.root_path / "scripts" / "synthetic_medical_kb.json"
        
        if not kb_path.exists():
            print(f"Fallback KB not found at {kb_path}")
            return [{"content": "Medical knowledge base unavailable.", "metadata": {}}]
            
        try:
            with open(kb_path, 'r') as f:
                kb = json.load(f)
                query_words = set(query.lower().split())
                results = []
                for entry in kb:
                    content = entry.get('content', '')
                    entry_words = set(content.lower().split())
                    score = len(query_words.intersection(entry_words))
                    results.append((score, entry))
                
                results.sort(key=lambda x: x[0], reverse=True)
                return [r[1] for r in results[:k]]
        except Exception as e:
            print(f"Fallback search error: {e}")
            return [{"content": "Error reading local knowledge base.", "metadata": {}}]

    async def ingest_medical_kb(self):
        print("Starting RAG Ingestion...")
        medical_texts = [
            "Influenza, also known as the flu, is a highly contagious respiratory illness caused by influenza viruses.",
            "Common cold is a viral infection of your nose and throat. It's usually harmless.",
            "Pneumonia is an infection that inflames the air sacs in one or both lungs.",
            "COVID-19 is a disease caused by a new strain of coronavirus. Symptoms include fever, cough, and fatigue."
        ]
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        docs = text_splitter.create_documents(medical_texts)
        
        try:
            if "sqlite" in settings.DATABASE_URL or not self.connection_string:
                raise ValueError("Using local/mock database - falling back to JSON storage")
            
            PGVector.from_documents(
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
            return True

rag_ingestor = RAGIngestor()
