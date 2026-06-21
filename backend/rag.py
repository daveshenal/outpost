"""
RAG Service
Ingests documents → chunks → embeds via Ollama → stores in ChromaDB
Retrieves relevant chunks for query augmentation
"""

import io
import uuid
from pathlib import Path

import httpx
import chromadb
from chromadb.config import Settings

COLLECTION = "outpost_docs"
EMBED_DIM  = 768  # nomic-embed-text output size
DB_PATH    = Path.home() / ".outpost" / "chromadb"


class RAGService:
    def __init__(self, cfg):
        self.cfg = cfg
        self.client = None
        self.collection = None

    async def init(self):
        try:
            DB_PATH.mkdir(parents=True, exist_ok=True)
            self.client = chromadb.PersistentClient(
                path=str(DB_PATH),
                settings=Settings(anonymized_telemetry=False)
            )
            self.collection = self.client.get_or_create_collection(
                name=COLLECTION,
                metadata={"hnsw:space": "cosine"}
            )
            print(f"[RAG] ChromaDB ready at {DB_PATH}, collection '{COLLECTION}'")
        except Exception as e:
            print(f"[RAG] ChromaDB failed: {e} - RAG disabled")
            self.client = None
            self.collection = None

    # ── Embedding ─────────────────────────────────────────────────────────────

    async def _embed(self, texts: list[str]) -> list[list[float]]:
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

        if ext == ".docx":
            try:
                import docx
                doc = docx.Document(io.BytesIO(content))
                return "\n".join(p.text for p in doc.paragraphs)
            except Exception as e:
                return f"[DOCX parse error: {e}]"

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
            words = text.split()
            chunks, i = [], 0
            while i < len(words):
                chunks.append(" ".join(words[i:i+chunk_size]))
                i += chunk_size - overlap
            return chunks

    # ── Public API ────────────────────────────────────────────────────────────

    async def ingest(self, doc_id: str, filename: str, content: bytes) -> dict:
        if not self.collection:
            return {"error": "RAG not available"}

        text = self._extract_text(filename, content)
        if not text.strip():
            return {"error": "No text extracted from document"}

        chunks = self._chunk(text)
        if not chunks:
            return {"error": "No chunks produced"}

        vectors = await self._embed(chunks)

        ids = [str(uuid.uuid4()) for _ in chunks]
        size_str = f"{len(content)/1024:.1f} KB" if len(content) < 1e6 else f"{len(content)/1e6:.1f} MB"
        metadatas = [
            {"doc_id": doc_id, "filename": filename, "chunk_idx": i, "size": size_str}
            for i in range(len(chunks))
        ]

        self.collection.upsert(
            ids=ids,
            embeddings=vectors,
            documents=chunks,
            metadatas=metadatas,
        )

        return {"doc_id": doc_id, "chunks": len(chunks), "size": size_str, "status": "indexed"}

    async def retrieve(self, query: str, top_k: int = 5) -> str:
        if not self.collection:
            return ""
        try:
            vectors = await self._embed([query])
            results = self.collection.query(
                query_embeddings=vectors,
                n_results=top_k,
                include=["documents", "distances"]
            )
            docs = results.get("documents", [[]])[0]
            distances = results.get("distances", [[]])[0]

            # Filter by similarity threshold (distance < 0.6 for cosine)
            filtered = [doc for doc, dist in zip(docs, distances) if dist < 0.6]
            if not filtered:
                return ""
            return "\n\n---\n\n".join(filtered)
        except Exception as e:
            print(f"[RAG] Retrieve error: {e}")
            return ""

    async def list_documents(self) -> list[dict]:
        if not self.collection:
            return []
        try:
            results = self.collection.get(include=["metadatas"])
            metadatas = results.get("metadatas", [])

            # Aggregate by doc_id
            docs = {}
            for m in metadatas:
                doc_id = m.get("doc_id")
                if doc_id not in docs:
                    docs[doc_id] = {
                        "id": doc_id,
                        "name": m.get("filename", "unknown"),
                        "chunks": 0,
                        "size": m.get("size", "-")
                    }
                docs[doc_id]["chunks"] += 1
            return list(docs.values())
        except Exception as e:
            print(f"[RAG] list_documents error: {e}")
            return []

    async def delete(self, doc_id: str) -> None:
        if not self.collection:
            return
        try:
            self.collection.delete(where={"doc_id": doc_id})
        except Exception as e:
            print(f"[RAG] Delete error: {e}")