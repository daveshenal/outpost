"""
RAG Service
Ingests documents → chunks → embeds via Ollama → stores in Qdrant
Retrieves relevant chunks for query augmentation
"""

import io
import uuid
from pathlib import Path
from typing import Optional

import httpx

try:
    from qdrant_client import AsyncQdrantClient
    from qdrant_client.models import (
        Distance, VectorParams, PointStruct, Filter,
        FieldCondition, MatchValue
    )
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False

COLLECTION = "localai_docs"
EMBED_DIM  = 768  # nomic-embed-text output size


class RAGService:
    def __init__(self, cfg):
        self.cfg = cfg
        self.client: Optional[object] = None
        self._doc_meta: dict = {}  # doc_id -> {name, chunks, size}

    async def init(self):
        if not QDRANT_AVAILABLE:
            print("[RAG] qdrant-client not installed, RAG disabled")
            return
        try:
            self.client = AsyncQdrantClient(
                host=self.cfg.qdrant_host,
                port=self.cfg.qdrant_port,
            )
            collections = await self.client.get_collections()
            names = [c.name for c in collections.collections]
            if COLLECTION not in names:
                await self.client.create_collection(
                    collection_name=COLLECTION,
                    vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
                )
            print(f"[RAG] Connected to Qdrant, collection '{COLLECTION}' ready")
        except Exception as e:
            print(f"[RAG] Qdrant not available: {e} — RAG disabled")
            self.client = None

    # ── Embedding ─────────────────────────────────────────────────────────────

    async def _embed(self, texts: list[str]) -> list[list[float]]:
        """Embed text using Ollama's embedding API"""
        vectors = []
        async with httpx.AsyncClient(timeout=60) as client:
            for text in texts:
                r = await client.post(
                    f"{self.cfg.ollama_url}/api/embeddings",
                    json={"model": self.cfg.embed_model, "prompt": text}
                )
                data = r.json()
                vectors.append(data.get("embedding", [0.0] * EMBED_DIM))
        return vectors

    # ── Text extraction ───────────────────────────────────────────────────────

    def _extract_text(self, filename: str, content: bytes) -> str:
        ext = Path(filename).suffix.lower()

        if ext == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(content))
                return "\n".join(p.extract_text() or "" for p in reader.pages)
            except Exception as e:
                return f"[PDF parse error: {e}]"

        if ext in (".docx",):
            try:
                import docx
                doc = docx.Document(io.BytesIO(content))
                return "\n".join(p.text for p in doc.paragraphs)
            except Exception as e:
                return f"[DOCX parse error: {e}]"

        # Plain text fallback (txt, md, csv, etc.)
        try:
            return content.decode("utf-8", errors="replace")
        except Exception:
            return ""

    # ── Chunking ──────────────────────────────────────────────────────────────

    def _chunk(self, text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        try:
            from langchain_text_splitters import RecursiveCharacterTextSplitter
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=overlap,
            )
            return splitter.split_text(text)
        except ImportError:
            # Fallback manual chunking
            words = text.split()
            chunks, i = [], 0
            while i < len(words):
                chunks.append(" ".join(words[i:i+chunk_size]))
                i += chunk_size - overlap
            return chunks

    # ── Public API ────────────────────────────────────────────────────────────

    async def ingest(self, doc_id: str, filename: str, content: bytes) -> dict:
        if not self.client:
            return {"error": "Qdrant not available"}

        text = self._extract_text(filename, content)
        if not text.strip():
            return {"error": "No text extracted from document"}

        chunks = self._chunk(text)
        if not chunks:
            return {"error": "No chunks produced"}

        vectors = await self._embed(chunks)

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vec,
                payload={"doc_id": doc_id, "filename": filename, "text": chunk, "chunk_idx": i}
            )
            for i, (chunk, vec) in enumerate(zip(chunks, vectors))
        ]

        await self.client.upsert(collection_name=COLLECTION, points=points)

        size_str = f"{len(content) / 1024:.1f} KB" if len(content) < 1e6 else f"{len(content) / 1e6:.1f} MB"
        self._doc_meta[doc_id] = {"id": doc_id, "name": filename, "chunks": len(chunks), "size": size_str}
        return {"doc_id": doc_id, "chunks": len(chunks), "status": "indexed"}

    async def retrieve(self, query: str, top_k: int = 5) -> str:
        if not self.client:
            return ""
        try:
            vectors = await self._embed([query])
            results = await self.client.search(
                collection_name=COLLECTION,
                query_vector=vectors[0],
                limit=top_k,
                score_threshold=0.4,
            )
            if not results:
                return ""
            chunks = [r.payload.get("text", "") for r in results]
            return "\n\n---\n\n".join(chunks)
        except Exception as e:
            print(f"[RAG] Retrieve error: {e}")
            return ""

    async def list_documents(self) -> list[dict]:
        if not self.client:
            return []
        return list(self._doc_meta.values())

    async def delete(self, doc_id: str):
        if not self.client:
            return
        from qdrant_client.models import FilterSelector
        await self.client.delete(
            collection_name=COLLECTION,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]
                )
            )
        )
        self._doc_meta.pop(doc_id, None)
