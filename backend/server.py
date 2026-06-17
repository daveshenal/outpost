"""
LocalAI Backend - FastAPI server
Bridges the Tauri UI and CLI to Ollama + Qdrant
"""

import json
import uuid
from typing import AsyncGenerator, Optional

import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .rag import RAGService
from .config import load_config, save_config, Config

app = FastAPI(title="LocalAI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

cfg: Config = load_config()
rag: RAGService = None


@app.on_event("startup")
async def startup():
    global rag
    rag = RAGService(cfg)
    await rag.init()


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


# ── Config ────────────────────────────────────────────────────────────────────

@app.get("/config")
async def get_config():
    return cfg.model_dump()


@app.post("/config")
async def update_config(body: dict):
    global cfg
    cfg = Config(**{**cfg.model_dump(), **body})
    save_config(cfg)
    return {"status": "saved"}


# ── Models ────────────────────────────────────────────────────────────────────

@app.get("/models")
async def list_models():
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(f"{cfg.ollama_url}/api/tags", timeout=5)
            data = r.json()
            models = [
                {"name": m["name"], "size": m.get("size", 0), "modified": m.get("modified_at", "")}
                for m in data.get("models", [])
            ]
            return {"models": models}
        except Exception as e:
            return {"models": [], "error": str(e)}


@app.post("/models/pull")
async def pull_model(body: dict):
    name = body.get("name", "")
    if not name:
        raise HTTPException(400, "Model name required")

    async def stream_pull() -> AsyncGenerator[bytes, None]:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"{cfg.ollama_url}/api/pull",
                                     json={"name": name}) as resp:
                async for line in resp.aiter_lines():
                    if line:
                        yield (line + "\n").encode()

    return StreamingResponse(stream_pull(), media_type="application/x-ndjson")


@app.delete("/models/{name:path}")
async def delete_model(name: str):
    async with httpx.AsyncClient() as client:
        r = await client.delete(f"{cfg.ollama_url}/api/delete", json={"name": name})
        return {"status": "deleted" if r.status_code == 200 else "error"}


# ── Chat (OpenAI-compatible) ──────────────────────────────────────────────────

class ChatRequest(BaseModel):
    model: str
    messages: list[dict]
    stream: bool = True
    temperature: Optional[float] = None
    use_rag: bool = True


@app.post("/chat")
async def chat(req: ChatRequest):
    messages = list(req.messages)

    # RAG: inject context if documents exist and last message is user
    if req.use_rag and cfg.rag_enabled and rag and messages:
        last = next((m for m in reversed(messages) if m["role"] == "user"), None)
        if last:
            context = await rag.retrieve(last["content"], top_k=cfg.rag_top_k)
            if context:
                context_msg = {
                    "role": "system",
                    "content": f"Use the following context to answer the question:\n\n{context}\n\nIf the context is not relevant, answer from general knowledge."
                }
                messages = [context_msg] + messages

    # Prepend system prompt
    if cfg.system_prompt and not any(m["role"] == "system" for m in messages):
        messages = [{"role": "system", "content": cfg.system_prompt}] + messages

    payload = {
        "model": req.model,
        "messages": messages,
        "stream": req.stream,
        "options": {
            "temperature": req.temperature or cfg.temperature,
            "num_ctx": cfg.context_length,
            "num_gpu": cfg.gpu_layers,
        }
    }

    if req.stream:
        async def stream_chat() -> AsyncGenerator[bytes, None]:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("POST", f"{cfg.ollama_url}/api/chat",
                                         json=payload) as resp:
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            done = chunk.get("done", False)
                            # Emit OpenAI-compatible SSE
                            sse = {
                                "choices": [{
                                    "delta": {"content": content},
                                    "finish_reason": "stop" if done else None
                                }]
                            }
                            yield f"data: {json.dumps(sse)}\n\n".encode()
                            if done:
                                yield b"data: [DONE]\n\n"
                        except Exception:
                            continue

        return StreamingResponse(stream_chat(), media_type="text/event-stream")

    else:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(f"{cfg.ollama_url}/api/chat", json=payload)
            data = r.json()
            return {
                "choices": [{
                    "message": data.get("message", {}),
                    "finish_reason": "stop"
                }]
            }


# ── Documents / RAG ───────────────────────────────────────────────────────────

@app.get("/documents")
async def list_documents():
    if not rag:
        return {"documents": []}
    docs = await rag.list_documents()
    return {"documents": docs}


@app.post("/documents/ingest")
async def ingest_document(file: UploadFile = File(...)):
    if not rag:
        raise HTTPException(503, "RAG service not initialized")
    content = await file.read()
    doc_id = str(uuid.uuid4())
    result = await rag.ingest(doc_id, file.filename, content)
    return result


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    if not rag:
        raise HTTPException(503, "RAG service not initialized")
    await rag.delete(doc_id)
    return {"status": "deleted"}


# ── OpenAI-compatible endpoint (for 3rd-party tool support) ──────────────────

@app.post("/v1/chat/completions")
async def openai_chat(req: dict):
    """Drop-in OpenAI API compatibility endpoint"""
    chat_req = ChatRequest(
        model=req.get("model", "llama3.1:8b"),
        messages=req.get("messages", []),
        stream=req.get("stream", False),
        temperature=req.get("temperature"),
        use_rag=False,
    )
    return await chat(chat_req)


@app.get("/v1/models")
async def openai_models():
    result = await list_models()
    return {
        "data": [{"id": m["name"], "object": "model"} for m in result.get("models", [])]
    }
