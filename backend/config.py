import json
from pathlib import Path
from pydantic import BaseModel

CONFIG_PATH = Path.home() / ".localai" / "config.json"


class Config(BaseModel):
    ollama_host: str =
    ollama_port: int =
    backend_port: int =
    qdrant_host: str =
    qdrant_port: int =
    context_length: int =
    temperature: float =
    gpu_layers: int =
    system_prompt: str = "You are a helpful AI assistant running locally." # Prompt management will be added later...
    rag_enabled: bool =
    rag_top_k: int =
    stream_enabled: bool =
    embed_model: str =

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
