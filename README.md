# Outpost

A local-first AI system that runs completely offline, self-contained, no cloud dependency, no internet required

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
