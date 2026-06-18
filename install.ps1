# LocalAI Windows Installer
# Run as: .\install.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

Write-Host ""
Write-Host "LocalAI Installer" -ForegroundColor Cyan -NoNewline
Write-Host " (Windows)"
Write-Host "─────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── Python ────────────────────────────────────────────────────────────────────
try {
    $pyver = python --version 2>&1
    Write-Host "  Python: " -NoNewline; Write-Host $pyver -ForegroundColor Cyan
} catch {
    Write-Host "  Python not found. Install from https://python.org" -ForegroundColor Red
    exit 1
}

# ── Node ──────────────────────────────────────────────────────────────────────
try {
    $nodever = node --version
    Write-Host "  Node:   " -NoNewline; Write-Host $nodever -ForegroundColor Cyan
} catch {
    Write-Host "  Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# ── Rust (optional, for future desktop packaging) ─────────────────────────────
if (Get-Command cargo -ErrorAction SilentlyContinue) {
    Write-Host "  Rust:   " -NoNewline; Write-Host (rustc --version) -ForegroundColor Cyan
} else {
    Write-Host "  Rust:   not installed (optional)" -ForegroundColor DarkGray
}

# ── Ollama ────────────────────────────────────────────────────────────────────
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "  Downloading Ollama for Windows..." -ForegroundColor Yellow
    $ollamaInstaller = "$env:TEMP\OllamaSetup.exe"
    Invoke-WebRequest -Uri "https://ollama.com/download/windows" -OutFile $ollamaInstaller
    Start-Process -FilePath $ollamaInstaller -Wait
    Write-Host "  Ollama installed" -ForegroundColor Green
} else {
    Write-Host "  Ollama: installed" -ForegroundColor Cyan
}

# ── Qdrant ────────────────────────────────────────────────────────────────────
$qdrantDir = "$env:USERPROFILE\.localai\qdrant"
if (-not (Test-Path "$qdrantDir\qdrant.exe")) {
    Write-Host "  Downloading Qdrant..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $qdrantDir | Out-Null
    $qdrantZip = "$env:TEMP\qdrant.zip"
    Invoke-WebRequest -Uri "https://github.com/qdrant/qdrant/releases/latest/download/qdrant-x86_64-pc-windows-msvc.zip" -OutFile $qdrantZip
    Expand-Archive -Path $qdrantZip -DestinationPath $qdrantDir -Force
    Write-Host "  Qdrant installed" -ForegroundColor Green
}

# ── Python deps ───────────────────────────────────────────────────────────────
Write-Host "  Installing Python dependencies..." -ForegroundColor Yellow
Set-Location $RepoRoot
pip install -r backend\requirements.txt -q

# ── Node deps + frontend build ────────────────────────────────────────────────
Write-Host "  Installing Node dependencies..." -ForegroundColor Yellow
Set-Location "$RepoRoot\frontend"
npm install --silent

Write-Host "  Building frontend..." -ForegroundColor Yellow
npm run build

# ── Start script ──────────────────────────────────────────────────────────────
$startScript = @"
@echo off
cd /d "$RepoRoot"
start /B ollama serve
start /B "$qdrantDir\qdrant.exe" --storage-path "%USERPROFILE%\.localai\qdrant\storage"
start /B python -m uvicorn backend.server:app --host 127.0.0.1 --port 8765
echo LocalAI services started
"@

New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.localai" | Out-Null
$startScript | Out-File -FilePath "$env:USERPROFILE\.localai\start.bat" -Encoding ASCII

# ── CLI shortcut ──────────────────────────────────────────────────────────────
$cliScript = @"
@echo off
cd /d "$RepoRoot"
python -m cli.cli %*
"@
$cliScript | Out-File -FilePath "C:\Windows\localai.bat" -Encoding ASCII -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Start services: " -NoNewline; Write-Host "%USERPROFILE%\.localai\start.bat" -ForegroundColor Cyan
Write-Host "  Use the CLI:    " -NoNewline; Write-Host "localai chat" -ForegroundColor Cyan
Write-Host "  Pull a model:   " -NoNewline; Write-Host "localai models pull llama3.1:8b" -ForegroundColor Cyan
Write-Host "  Frontend:       " -NoNewline; Write-Host "$RepoRoot\frontend\dist" -ForegroundColor Cyan
Write-Host ""
