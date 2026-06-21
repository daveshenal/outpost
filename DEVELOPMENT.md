# Outpost - Development Guide

This document covers building Outpost from source: project structure, the three ways to run it, packaging the backend as a standalone executable, wiring it into Tauri, and debugging the issues you're most likely to hit.

---

## Project Structure

```
outpost/
├── README.md
├── DEVELOPMENT.md          ← you are here
├── LICENSE
├── .gitignore
├── outpost-backend.spec    ← PyInstaller build spec
│
├── backend/
│   ├── main.py             ← PyInstaller entry point (imports app directly)
│   ├── server.py           ← FastAPI app, all routes
│   ├── rag.py              ← document ingestion + retrieval (ChromaDB)
│   ├── config.py           ← persisted settings (~/.outpost/config.json)
│   └── requirements.txt
│
├── cli/
│   └── cli.py              ← Typer CLI, talks to the same backend API
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx
│   │   ├── store/          ← Zustand state, all API calls
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx
│   │   │   ├── ModelsPage.jsx
│   │   │   ├── DocumentsPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   └── components/
│   │       └── Sidebar.jsx
│   ├── public/
│   └── src-tauri/
│       ├── tauri.conf.json
│       ├── Cargo.toml
│       ├── binaries/        ← compiled backend exe goes here
│       └── src/main.rs
│
├── scripts/
│   ├── install.sh
│   └── install.ps1
│
├── docs/
│
└── data/
    ├── documents/           ← uploaded files (gitignored)
    ├── embeddings/          ← ChromaDB storage (gitignored)
    └── models/              (gitignored - models live in Ollama's own store)
```

---

## Prerequisites

| Tool          | Check with              | Install                                                            |
| ------------- | ----------------------- | ------------------------------------------------------------------ |
| Python 3.10+  | `python --version`      | python.org                                                         |
| Node.js 18+   | `node --version`        | nodejs.org                                                         |
| Rust (stable) | `rustc --version`       | [rustup.rs](https://rustup.rs) or `winget install Rustlang.Rustup` |
| Tauri CLI     | `cargo tauri --version` | `cargo install tauri-cli`                                          |
| Ollama        | `ollama --version`      | [ollama.com](https://ollama.com)                                   |

> On Windows, after installing Rust, **close and reopen your terminal** before checking the version - PATH won't update in an already-open shell.

---

## The Three Ways to Run This Project

### Method 1 - Dev mode, two terminals

Fastest iteration loop. The frontend is just a browser tab, not a real desktop window yet.

```bash
# Terminal 1 - backend
python -m uvicorn backend.server:app --host 127.0.0.1 --port 8765

# Terminal 2 - frontend
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### Method 2 - Tauri dev mode

Real desktop window, still hot-reloading.

```bash
cd frontend
npm install
npm run tauri dev
```

This requires `frontend/src-tauri/` to exist. If it doesn't yet:

```bash
cd frontend
npm install @tauri-apps/cli @tauri-apps/api
cargo tauri init
```

When prompted:

```
App name:              Outpost
Window title:          Outpost
Web assets location:   ../dist
Dev server URL:        http://localhost:5173
Frontend dev command:  npm run dev
Frontend build command: npm run build
```

You still need the backend running in a separate terminal for Method 2 **until you wire up the sidecar** (see below).

### Method 3 - Production build

The real deliverable. Backend gets bundled as a native executable and Tauri manages its lifecycle - the user double-clicks one app, nothing else required.

```bash
cd frontend
npm run tauri build
```

Produces a `.exe`/`.msi` (Windows), `.AppImage`/`.deb` (Linux), or `.dmg` (Mac) in `frontend/src-tauri/target/release/bundle/`.

---

## Packaging the Backend with PyInstaller

This is the part with the most moving pieces. Here's the full pipeline end to end.

### 1. Build from a clean virtual environment

Don't build from your main dev env (conda, etc) - it can pull in extra packages you don't actually need, bloating the binary or causing version mismatches.

```bash
python -m venv .venv-build

# Windows
.venv-build\Scripts\activate
# Linux/Mac
source .venv-build/bin/activate

pip install -r backend/requirements.txt
pip install pyinstaller
```

### 2. Verify the backend runs from this clean env first

```bash
python -m uvicorn backend.server:app --host 127.0.0.1 --port 8765
```

Confirm chat and RAG work before bundling - if something's broken here, PyInstaller will just bundle the same broken thing.

### 3. Why a dedicated entry point (`backend/main.py`)

`uvicorn.run("backend.server:app")` works fine when Python can resolve the module string at runtime. It **fails inside a frozen PyInstaller binary** because there's no real package structure on disk anymore - you'll see:

```
ModuleNotFoundError: No module named 'backend'
```

The fix is to import the app object directly instead of passing a string:

```python
# backend/main.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn
from backend.server import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765)
```

### 4. The PyInstaller spec file

ChromaDB (used for RAG) relies heavily on dynamic imports that PyInstaller's static analyzer can't trace automatically. Rather than chasing missing-module errors one at a time, use `collect_all()` plus an explicit hidden-imports list:

```python
# outpost-backend.spec
# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

chroma_datas, chroma_binaries, chroma_hiddenimports = collect_all('chromadb')

a = Analysis(
    ['backend\\main.py'],
    pathex=['.'],
    binaries=chroma_binaries,
    datas=chroma_datas,
    hiddenimports=chroma_hiddenimports + [
        "chromadb.telemetry.product.posthog",
        "chromadb.telemetry.product",
        "chromadb.telemetry",
        "chromadb.api.segment",
        "chromadb.segment.impl.manager.local",
        "chromadb.segment.impl.vector.local_persistent_hnsw",
        "chromadb.segment.impl.metadata.sqlite",
        "chromadb.db.impl.sqlite",
        "anyio._backends._asyncio",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan.on",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='outpost-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
```

Build with:

```bash
pyinstaller outpost-backend.spec
```

Some warnings are expected and harmless:

```
ERROR: Hidden import 'posthog' not found      ← fine, telemetry stub
WARNING: Hidden import "tzdata" not found      ← fine, timezone fallback
WARNING: Hidden import "_cffi_backend" not found  ← fine
```

What matters is the final line:

```
INFO: Build complete! The results are available in: .../dist
```

### 5. Test the exe standalone before wiring it into Tauri

```bash
.\dist\outpost-backend.exe
```

You're looking for:

```
INFO:     Started server process [...]
[RAG] ChromaDB ready at C:\Users\you\.outpost\chromadb, collection 'outpost_docs'
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8765
```

If you instead see `[RAG] ... disabled`, a hidden import is still missing - check the spec's `hiddenimports` list against whatever module the traceback names.

---

## Wiring the Backend into Tauri (Sidecar)

Tauri's sidecar mechanism expects the binary name to include the **target triple**. Find yours:

```bash
rustc -vV
```

Look for the `host:` line, e.g. `x86_64-pc-windows-msvc`.

Copy and rename the built exe accordingly:

```bash
# Windows example
copy .\dist\outpost-backend.exe .\frontend\src-tauri\binaries\outpost-backend-x86_64-pc-windows-msvc.exe
```

In `frontend/src-tauri/tauri.conf.json`, reference it under `bundle.externalBin` **without** the target suffix or extension - Tauri appends that automatically per-platform:

```json
{
  "bundle": {
    "externalBin": ["binaries/outpost-backend"]
  }
}
```

Then start/stop it from Rust using the shell plugin's sidecar API (in `src-tauri/src/main.rs`), so the backend launches when the app opens and is killed when the app closes.

Once wired, run Method 2 again **without manually starting the backend** - Tauri should spawn it for you.

```bash
cd frontend
npm run tauri dev
```

---

## Rebuild Rules - What Needs What

| You changed...                       | You need to...                                                  |
| ------------------------------------ | --------------------------------------------------------------- |
| `backend/*.py`                       | Rebuild with PyInstaller, recopy exe into `src-tauri/binaries/` |
| `cli/cli.py`                         | Nothing - runs directly via `python cli/cli.py`, no rebuild     |
| `frontend/src/**`                    | Nothing - Vite hot-reloads automatically in `tauri dev`         |
| `frontend/src-tauri/tauri.conf.json` | Restart `tauri dev`                                             |
| `outpost-backend.spec`               | Rebuild with PyInstaller                                        |

---

## Debugging Cheat Sheet

**Backend exe won't die between runs (port already in use):**

```bash
# Windows
taskkill /IM outpost-backend.exe /F

# Linux/Mac
pkill -f outpost-backend
```

**`npm run tauri dev` fails with "Missing script: tauri":**
Your `package.json` is missing the script and Tauri deps. Add:

```json
"scripts": { "tauri": "tauri" },
"devDependencies": { "@tauri-apps/cli": "^2" },
"dependencies": { "@tauri-apps/api": "^2" }
```

**`ModuleNotFoundError: No module named 'backend'` when running the exe:**
You're calling `uvicorn.run("backend.server:app")` (string form) instead of importing the app object directly. See the `main.py` fix above.

**`[RAG] ChromaDB failed: No module named 'chromadb.telemetry...'`:**
Missing hidden import. Add it to the spec's `hiddenimports` list, or use `collect_all('chromadb')` to grab everything at once, then rebuild.

**CLI picks an embedding model for chat instead of a real chat model:**
Filter embedding models out of auto-selection:

```python
chat_models = [m for m in models if "embed" not in m["name"].lower()]
```

**Document size always shows "-" in `docs list`:**
The size string computed at ingest time isn't being persisted into the metadata that `list_documents` reads back from ChromaDB. Store it in each chunk's metadata at ingest:

```python
metadatas = [
    {"doc_id": doc_id, "filename": filename, "chunk_idx": i, "size": size_str}
    for i in range(len(chunks))
]
```

And read it back in `list_documents`:

```python
docs[doc_id] = {"id": doc_id, "name": m.get("filename"), "chunks": 0, "size": m.get("size", "-")}
```

**Backend works in dev but RAG says "disabled" after PyInstaller build:**
Test the bare exe directly first (`./dist/outpost-backend.exe`) before blaming Tauri - isolates whether it's a packaging issue or a sidecar wiring issue.

---

## Testing Checklist

Run through this after any significant change:

**Chat**

- [ ] Multi-turn conversation retains context
- [ ] Streaming renders smoothly, no stutter
- [ ] New chat / switch chat / delete chat all work
- [ ] Behaves sanely with no model selected

**Models**

- [ ] Pull a model from the UI, progress bar updates
- [ ] Switch models mid-conversation
- [ ] Custom model name field works
- [ ] Delete a model

**RAG / Documents**

- [ ] Upload CSV, PDF, Markdown - all chunk successfully
- [ ] Ask a question that requires the uploaded data - answer reflects it
- [ ] Delete a document - it no longer affects future answers
- [ ] `docs list` shows correct chunk count and size

**CLI**

```bash
python cli/cli.py status
python cli/cli.py models list
python cli/cli.py models pull llama3.2:3b
python cli/cli.py chat
python cli/cli.py docs add ./somefile.csv
python cli/cli.py docs list
python cli/cli.py docs delete <id>
```

**Packaged build**

- [ ] `outpost-backend.exe` runs standalone, RAG initializes without errors
- [ ] `npm run tauri dev` starts the backend automatically (no manual terminal)
- [ ] `npm run tauri build` produces an installer
- [ ] Fresh machine (or VM) with no Python installed can run the installed app
