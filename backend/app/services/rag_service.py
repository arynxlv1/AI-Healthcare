"""
RAG service — keyword search over the local synthetic medical KB JSON.
PGVector is used when a PostgreSQL DATABASE_URL is configured; otherwise
falls back to the local JSON file at scripts/synthetic_medical_kb.json.
"""
import json
import os
from pathlib import Path
from ..core.config import settings


class RAGIngestor:
    def __init__(self):
        # Root is four levels up: app/services/ -> app/ -> backend/ -> root
        self.root_path = Path(__file__).resolve().parent.parent.parent.parent
        self._kb: list[dict] | None = None

    def _load_kb(self) -> list[dict]:
        """Load and cache the local knowledge base JSON."""
        if self._kb is not None:
            return self._kb
        kb_path = self.root_path / "scripts" / "synthetic_medical_kb.json"
        if not kb_path.exists():
            print(f"[RAG] KB not found at {kb_path}")
            self._kb = []
            return self._kb
        with open(kb_path, "r", encoding="utf-8") as f:
            self._kb = json.load(f)
        return self._kb

    def _get_vector_store(self):
        """Return a PGVector store if PostgreSQL is configured, else None."""
        if "sqlite" in settings.DATABASE_URL:
            return None
        try:
            from langchain_community.vectorstores import PGVector
            from langchain_community.embeddings import OllamaEmbeddings
            conn = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")
            embeddings = OllamaEmbeddings(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.EMBEDDING_MODEL,
            )
            return PGVector(
                embedding_function=embeddings,
                collection_name="medical_kb",
                connection_string=conn,
            )
        except Exception as e:
            print(f"[RAG] PGVector unavailable: {e}")
            return None

    async def search(self, query: str, k: int = 3) -> list[dict]:
        """Return top-k relevant KB entries for the query."""
        # Try vector search first
        try:
            store = self._get_vector_store()
            if store:
                docs = store.similarity_search(query, k=k)
                return [{"content": d.page_content, "metadata": d.metadata} for d in docs]
        except Exception as e:
            print(f"[RAG] Vector search failed, using fallback: {e}")

        return self._fallback_search(query, k=k)

    def _fallback_search(self, query: str, k: int = 3) -> list[dict]:
        """Keyword-overlap search over the local JSON KB."""
        kb = self._load_kb()
        if not kb:
            return [{"content": "Medical knowledge base unavailable.", "metadata": {}}]

        query_words = set(query.lower().split())
        scored = []
        for entry in kb:
            content = entry.get("content") or entry.get("description", "")
            entry_words = set(content.lower().split())
            score = len(query_words & entry_words)
            scored.append((score, {"content": content, "metadata": {"code": entry.get("code", "")}}))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored[:k]]

    async def ingest_medical_kb(self) -> bool:
        """Ingest the local KB JSON into PGVector (no-op for SQLite)."""
        if "sqlite" in settings.DATABASE_URL:
            print("[RAG] SQLite detected — skipping PGVector ingestion.")
            return True
        try:
            from langchain_community.vectorstores import PGVector
            from langchain_community.embeddings import OllamaEmbeddings
            from langchain.text_splitter import RecursiveCharacterTextSplitter

            kb = self._load_kb()
            texts = [e.get("content") or e.get("description", "") for e in kb if e.get("content") or e.get("description")]
            if not texts:
                print("[RAG] No texts to ingest.")
                return False

            splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            docs = splitter.create_documents(texts)

            conn = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")
            embeddings = OllamaEmbeddings(base_url=settings.OLLAMA_BASE_URL, model=settings.EMBEDDING_MODEL)
            PGVector.from_documents(
                embedding=embeddings,
                documents=docs,
                collection_name="medical_kb",
                connection_string=conn,
                pre_delete_collection=True,
            )
            print(f"[RAG] Ingested {len(docs)} chunks into PGVector.")
            return True
        except Exception as e:
            print(f"[RAG] Ingestion failed: {e}")
            return False


rag_ingestor = RAGIngestor()
