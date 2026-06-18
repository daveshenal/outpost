# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all, collect_submodules

# Collect everything from chromadb
chroma_datas, chroma_binaries, chroma_hiddenimports = collect_all('chromadb')

a = Analysis(
    ['backend\\main.py'],
    pathex=['.'],
    binaries=chroma_binaries,
    datas=chroma_datas,
    hiddenimports=chroma_hiddenimports + [
        # ChromaDB specifics
        'chromadb.telemetry.product.posthog',
        'chromadb.telemetry.product',
        'chromadb.telemetry',
        'chromadb.api.segment',
        'chromadb.segment.impl.manager.local',
        'chromadb.segment.impl.vector.local_persistent_hnsw',
        'chromadb.segment.impl.metadata.sqlite',
        'chromadb.db.impl.sqlite',
        # Common dynamic imports PyInstaller misses
        'posthog',
        'anyio',
        'anyio._backends._asyncio',
        'anyio._backends._trio',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.asyncio',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'starlette',
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