# <img src="assests/camping.png" width="40" valign="middle"> Outpost

![Status](https://img.shields.io/badge/status-active--development-red)

A local-first AI system that runs completely offline, self-contained, no cloud dependency, no internet required

## Features - Planned

- Local AI assistant/chat application
- RAG document ingestion
- Backend API (server.py)
- CLI tooling (cli.py)
- React frontend (App.jsx, pages)
- Installation scripts (install.sh, install.ps1)
- Packaged for end users?

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
├── scripts/
│   ├── install.sh
│   └── install.ps1
│
├── docs/
│
└── data/
    ├── documents/
    ├── embeddings/
    └── models/
```
