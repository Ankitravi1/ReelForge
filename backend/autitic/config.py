"""Autitic Studio Configuration & Paths."""

from __future__ import annotations

import os
from pathlib import Path

# Base Paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Load .env if present
env_file = PROJECT_ROOT / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

DEFAULT_DATA_DIR = PROJECT_ROOT / "data"

DATA_DIR = Path(os.environ.get("AUTITIC_DATA_DIR", DEFAULT_DATA_DIR))
DATA_DIR.mkdir(parents=True, exist_ok=True)

CHANNELS_DIR = DATA_DIR / "channels"
CHANNELS_DIR.mkdir(parents=True, exist_ok=True)

CACHE_DIR = DATA_DIR / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

DEFAULTS_FILE = DATA_DIR / "defaults.json"
SETTINGS_FILE = DATA_DIR / "settings.json"
DATABASE_URL = f"sqlite:///{DATA_DIR / 'autitic.db'}"

def get_hf_hub_cache() -> Path:
    """Resolve the Hugging Face hub cache directory."""
    if explicit := os.environ.get("HF_HUB_CACHE"):
        return Path(explicit)
    if home := os.environ.get("HF_HOME"):
        return Path(home) / "hub"
    return Path.home() / ".cache" / "huggingface" / "hub"
