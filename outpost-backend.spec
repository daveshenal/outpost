# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['backend\\main.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        "chromadb.telemetry.product.posthog",
        "chromadb.telemetry.product",
        "chromadb.telemetry",
        "chromadb.api.segment",
        "chromadb.segment.impl.manager.local",
        "chromadb.segment.impl.vector.local_persistent_hnsw",
        "chromadb.segment.impl.metadata.sqlite",
        "chromadb.db.impl.sqlite",
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
