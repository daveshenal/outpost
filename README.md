# <img src="assets/icon-512.png" width="60" valign="middle"> Outpost - Offline AI Station

![Status](https://img.shields.io/badge/status-active--development-green)

**Run LLMs locally. No internet. No limits. No cost per token.**

Outpost is a self-hosted AI workstation: a native desktop app that runs language models on your own hardware, answers questions about your own documents, and never sends a byte outside your machine.

---

## Features

- 🖥️ **Native desktop app** - built with Tauri, not a browser tab
- 🧠 **Multi-model support** - download and swap between any [Ollama](https://ollama.com) model
- 📄 **Document Q&A (RAG)** - upload PDFs, CSVs, Markdown, DOCX → ask questions about them
- ⌨️ **Full CLI** - everything the app does, scriptable from the terminal
- 🔌 **OpenAI-compatible API** - point existing tools at `localhost` instead of `api.openai.com`
- 🔒 **100% offline** after setup - no telemetry, no accounts, no rate limits

---

## Requirements

| Tool                         | Version  | Notes                                                                                                |
| ---------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| [Ollama](https://ollama.com) | latest   | Runs the models                                                                                      |
| NVIDIA GPU                   | optional | Recommended for faster inference; available VRAM determines which model sizes can be run comfortably |
| Windows / macOS / Linux      | -        | Native builds for all three                                                                          |

> The desktop app ships with the backend bundled in - no Python install required for end users.

---

## Install (Not available yet)

1. Download the installer for your platform from the [Releases](../../releases) page
2. Install [Ollama](https://ollama.com/download) if you haven't already
3. Launch **Outpost**

That's it. The app starts its own backend automatically.

---

## First Run

1. Open **Models** tab → download a model (start with `llama3.2:3b`, ~2GB)
2. Also download `nomic-embed-text` if you want document Q&A
3. Go to **Chat** and start talking
4. Go to **Documents** to upload files for RAG

---

## Recommended Models

| Model                   | Size   | VRAM     | Best for                      |
| ----------------------- | ------ | -------- | ----------------------------- |
| `llama3.2:3b`           | 2 GB   | ~3 GB    | Fast everyday tasks           |
| `llama3.1:8b`           | 4.7 GB | ~6 GB    | General purpose               |
| `deepseek-coder-v2:16b` | 9 GB   | ~10 GB\* | Coding                        |
| `qwen2.5:7b`            | 4.4 GB | ~6 GB    | Multilingual                  |
| `nomic-embed-text`      | 0.3 GB | ~1 GB    | **Required for document Q&A** |

\*Partial CPU offload on 8GB cards.

---

## Architecture

```
┌─────────────────────────────────┐
│     Outpost (Tauri + React)     │
└────────────────┬────────────────┘
                 │  localhost:8765
┌────────────────▼────────────────┐
│     Backend (bundled, no        │
│     Python required)            │
│     ├── /chat        (SSE)      │
│     ├── /v1/*   (OpenAI compat) │
│     ├── /models                 │
│     └── /documents   (RAG)      │
└───────┬─────────────────┬───────┘
        │                 │
┌───────▼──────┐   ┌──────▼───────┐
│    Ollama    │   │   ChromaDB   │
│   :11434     │   │   (local)    │
└──────────────┘   └──────────────┘
```

---

## Using the OpenAI Compatible API

Point any existing tool at Outpost instead of OpenAI:

```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8765/v1", api_key="local")

response = client.chat.completions.create(
    model="llama3.1:8b",
    messages=[{"role": "user", "content": "Hello"}]
)
```

Works with Continue.dev, LangChain, and most OpenAI SDK-based tools.

---

## Configuration

Settings live at `~/.outpost/config.json` and are also editable from the **Settings** tab in the app:

```json
{
  "ollama_host": "localhost",
  "ollama_port": 11434,
  "backend_port": 8765,
  "context_length": 4096,
  "temperature": 0.7,
  "rag_enabled": true,
  "rag_top_k": 5,
  "system_prompt": "You are a helpful AI assistant running locally."
}
```

## Using the CLI - Under development!

The CLI talks to the same backend the app uses - they share everything.

```bash
outpost status                  # check backend, models, docs
outpost models list             # see installed models
outpost models pull llama3.2:3b # download a model
outpost chat                    # interactive terminal chat
outpost docs add ./notes.pdf    # index a document
outpost docs list               # see indexed documents
```

---

## Want to build it from source?

See [`DEVELOPMENT.md`](./DEVELOPMENT.md) for the full build pipeline, project structure, and debugging guide.

---

## License

MIT
