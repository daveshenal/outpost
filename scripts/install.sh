#!/usr/bin/env bash
set -e

BOLD='\033[1m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}LocalAI Installer${RESET}"
echo -e "${CYAN}─────────────────────────────────────${RESET}"
echo ""

# ── Check OS ──────────────────────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"
echo -e "  System: ${CYAN}${OS} ${ARCH}${RESET}"

# ── Python ────────────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo -e "${RED}✗ Python 3.10+ is required but not found.${RESET}"
  exit 1
fi
PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo -e "  Python: ${CYAN}${PY_VERSION}${RESET}"

# ── Node.js ───────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js 18+ is required but not found.${RESET}"
  echo "  Install from https://nodejs.org"
  exit 1
fi
NODE_VERSION=$(node --version)
echo -e "  Node:   ${CYAN}${NODE_VERSION}${RESET}"

# ── Rust (for Tauri) ──────────────────────────────────────────────────────────
if ! command -v cargo &>/dev/null; then
  echo -e "${YELLOW}  Rust not found — installing via rustup…${RESET}"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --quiet
  source "$HOME/.cargo/env"
fi
echo -e "  Rust:   ${CYAN}$(rustc --version)${RESET}"

# ── Ollama ────────────────────────────────────────────────────────────────────
if ! command -v ollama &>/dev/null; then
  echo ""
  echo -e "  Installing Ollama…"
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo -e "  Ollama: ${CYAN}$(ollama --version 2>/dev/null || echo 'installed')${RESET}"
fi

# ── Qdrant ────────────────────────────────────────────────────────────────────
QDRANT_DIR="$HOME/.localai/qdrant"
if [ ! -f "$QDRANT_DIR/qdrant" ]; then
  echo ""
  echo -e "  Installing Qdrant…"
  mkdir -p "$QDRANT_DIR"
  if [ "$OS" = "Darwin" ]; then
    QDRANT_URL="https://github.com/qdrant/qdrant/releases/latest/download/qdrant-aarch64-apple-darwin.tar.gz"
  else
    QDRANT_URL="https://github.com/qdrant/qdrant/releases/latest/download/qdrant-x86_64-unknown-linux-musl.tar.gz"
  fi
  curl -fsSL "$QDRANT_URL" | tar -xz -C "$QDRANT_DIR"
  chmod +x "$QDRANT_DIR/qdrant"
  echo -e "  ${GREEN}✓ Qdrant installed${RESET}"
fi

# ── Python deps ───────────────────────────────────────────────────────────────
echo ""
echo -e "  Installing Python dependencies…"
pip3 install -r backend/requirements.txt -q

# ── Node deps + build ─────────────────────────────────────────────────────────
echo -e "  Installing Node dependencies…"
npm install --silent

echo -e "  Building desktop app…"
npm run tauri build 2>&1 | tail -5

# ── CLI shortcut ──────────────────────────────────────────────────────────────
cat > /usr/local/bin/localai << 'SCRIPT'
#!/usr/bin/env bash
cd "$(dirname "$(readlink -f "$0")")"
python3 -m backend.cli "$@"
SCRIPT
chmod +x /usr/local/bin/localai 2>/dev/null || true

# ── Launch script ─────────────────────────────────────────────────────────────
cat > "$HOME/.localai/start.sh" << 'LAUNCH'
#!/usr/bin/env bash
# Start Ollama
ollama serve &>/dev/null &

# Start Qdrant  
~/.localai/qdrant/qdrant --storage-path ~/.localai/qdrant/storage &>/dev/null &

# Start backend
python3 -m uvicorn backend.server:app --host 127.0.0.1 --port 8765 &>/dev/null &

echo "LocalAI services started"
LAUNCH
chmod +x "$HOME/.localai/start.sh"

echo ""
echo -e "${GREEN}${BOLD}✓ Installation complete!${RESET}"
echo ""
echo -e "  Start the app:      ${CYAN}open dist/LocalAI.app${RESET}  (or the built binary)"
echo -e "  Start services:     ${CYAN}~/.localai/start.sh${RESET}"
echo -e "  Use the CLI:        ${CYAN}localai chat${RESET}"
echo -e "  Pull a model first: ${CYAN}localai models pull llama3.1:8b${RESET}"
echo ""
