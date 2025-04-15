#!/usr/bin/env bash

set -e

# Detect OS
OS="$(uname -s)"
echo "📦 Detected OS: $OS"

# Determine script and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(realpath "$SCRIPT_DIR/../..")"
cd "$REPO_ROOT"

VENV_PATH="$REPO_ROOT/functions/.venv"
REQUIREMENTS_FILE="$REPO_ROOT/functions/.scripts/venv.requirements.txt"

# Ensure python3.11 exists
if ! command -v python3.11 &>/dev/null; then
  echo "❌ Python 3.11 is not installed or not in your PATH."
  exit 1
fi

# Confirm version
PY_VERSION=$(python3.11 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
if [[ "$PY_VERSION" != "3.11" ]]; then
  echo "❌ Detected Python version is not 3.11."
  exit 1
fi

echo "✅ Python 3.11 found: $(python3.11 --version)"

# Create virtual environment
echo "📦 Creating venv at: $VENV_PATH"
python3.11 -m venv "$VENV_PATH"

# Activate venv cross-platform
if [[ "$OS" == "Darwin" || "$OS" == "Linux" ]]; then
  source "$VENV_PATH/bin/activate"
elif [[ "$OS" == MINGW* || "$OS" == MSYS* || "$OS" == CYGWIN* ]]; then
  # Windows Git Bash
  source "$VENV_PATH/Scripts/activate"
else
  echo "⚠️ Unsupported OS for auto-activation. Activate manually."
  exit 1
fi

# Upgrade pip and install requirements
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

if [[ -f "$REQUIREMENTS_FILE" ]]; then
  echo "📄 Installing dependencies from requirements.txt..."
  pip install -r "$REQUIREMENTS_FILE"
else
  echo "⚠️ requirements.txt not found at $REQUIREMENTS_FILE. Skipping install."
fi

echo "✅ Setup complete. Virtual environment ready at $VENV_PATH."
