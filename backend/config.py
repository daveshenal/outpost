import json
from pathlib import Path
from pydantic import BaseModel

CONFIG_PATH = Path.home() / ".localai" / "config.json"


class Config(BaseModel):
    ollama_host: str = "localhost"
    ollama_port: int = 11434
    backend_port: int = 8765
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    context_length: int = 4096
    temperature: float = 0.7
    gpu_layers: int = 99
    system_prompt: str = "You are a helpful AI assistant running locally." # Prompt management will be added later...
    rag_enabled: bool = True
    rag_top_k: int = 5
    stream_enabled: bool = True
    embed_model: str = "nomic-embed-text"

    @property
    def ollama_url(self) -> str:
        return f"http://{self.ollama_host}:{self.ollama_port}"

    @property
    def qdrant_url(self) -> str:
        return f"http://{self.qdrant_host}:{self.qdrant_port}"


def load_config() -> Config:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if CONFIG_PATH.exists():
        try:
            data = json.loads(CONFIG_PATH.read_text())
            return Config(**data)
        except Exception:
            pass
    cfg = Config()
    save_config(cfg)
    return cfg


def save_config(cfg: Config):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(cfg.model_dump_json(indent=2))
