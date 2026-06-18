# <img src="assets/icon-512.png" width="60" valign="middle"> Outpost - Offline AI Station

![Status](https://img.shields.io/badge/status-active--development-red)

**Run LLMs locally. No internet. No limits. No cost per token.**

A self-hosted AI workstation with a native desktop app, full CLI, document Q&A (RAG), and multi-model support.

---

## Quick Start

### Requirements
- Python 3.10+, Node.js 18+, Rust (stable)
- Ollama + Qdrant (installed automatically)
- NVIDIA GPU recommended (RTX 3070 = sweet spot)

### Install

**Linux / macOS:**
```bash
chmod +x install.sh && ./install.sh
```

**Windows (PowerShell as Admin):**
```powershell
.\install.ps1
```

### First run
```bash
~/.Outpost/start.sh          # start services
Outpost models pull llama3.1:8b
Outpost chat
```

---

## CLI
```bash
Outpost serve                          # start backend
Outpost chat                           # interactive chat
Outpost chat --model deepseek-coder-v2:16b
Outpost models list / pull / delete
Outpost docs add ./file.pdf
Outpost docs list
Outpost status
```

---

## Architecture
```
Tauri Desktop App (React)
        │
FastAPI Backend :8765
  ├── /chat  (streaming SSE)
  ├── /v1/*  (OpenAI-compatible)
  ├── /models
  └── /documents (RAG)
        │
   Ollama :11434    Qdrant :6333
```

## Recommended Models (RTX 3070 / 8GB VRAM)
| Model | VRAM | Best for |
|-------|------|----------|
| llama3.2:3b | ~3 GB | Fast tasks |
| llama3.1:8b | ~6 GB | General (recommended) |
| deepseek-coder-v2:16b | ~10 GB* | Coding |
| nomic-embed-text | ~1 GB | **Required for RAG** |

## OpenAI-Compatible API
```python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:8765/v1", api_key="local")
```

Config: `~/.Outpost/config.json`

## Project Structure

```
project-name/
├── README.md
├── LICENSE
├── .gitignore
│
├── backend/
│   ├── server.py
│   ├── rag.py
│   ├── config.py
│   └── requirements.txt
│
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx
│   │   │   ├── ModelsPage.jsx
│   │   │   ├── DocumentsPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   └── components/
│   │       └── Sidebar.jsx
│   └── public/
│
├── cli/
│   └── cli.py
│
├── install.sh
├── install.ps1
│
├── docs/
│
└── data/
    ├── documents/
    ├── embeddings/
    └── models/
```