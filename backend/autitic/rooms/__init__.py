"""Decoupled 6-Room Pipeline Execution for Autitic Studio."""

from pathlib import Path
from ..config import CHANNELS_DIR

def get_project_dir(channel_id: str, project_id: str) -> Path:
    p_dir = CHANNELS_DIR / channel_id / "projects" / project_id
    p_dir.mkdir(parents=True, exist_ok=True)
    return p_dir
