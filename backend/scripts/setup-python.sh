#!/usr/bin/env bash
# EchoRead Python TTS Environment Setup Script
# Used for local Linux/macOS development and Render cloud build steps.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Setting up Python environment for EchoRead TTS Engine ==="
cd "${BACKEND_DIR}"

# Determine Python binary to use
if command -v python3 &> /dev/null; then
    PY_CMD="python3"
elif command -v python &> /dev/null; then
    PY_CMD="python"
else
    echo "ERROR: Python 3 was not found on PATH. Please install Python 3.10+." >&2
    exit 1
fi

echo "Using system Python: $("${PY_CMD}" --version)"

# Create virtual environment if it does not already exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment at ${BACKEND_DIR}/venv ..."
    "${PY_CMD}" -m venv venv
else
    echo "Virtual environment already exists at ${BACKEND_DIR}/venv."
fi

# Locate pip inside virtual environment
if [ -f "venv/bin/pip" ]; then
    VENV_PIP="venv/bin/pip"
elif [ -f "venv/Scripts/pip.exe" ]; then
    VENV_PIP="venv/Scripts/pip.exe"
else
    echo "ERROR: Could not locate pip inside venv." >&2
    exit 1
fi

echo "Upgrading pip and installing Python TTS requirements..."
"${VENV_PIP}" install --upgrade pip --quiet
"${VENV_PIP}" install -r python/requirements.txt

echo "=== Python environment setup successfully completed! ==="
