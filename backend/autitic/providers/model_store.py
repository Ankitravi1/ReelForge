"""Model Store: Inventory, verification, cache clearance, and download management."""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any, Dict, List
from ..config import get_hf_hub_cache

MODEL_CATALOG = [
    {
        "id": "supertonic",
        "name": "Supertonic TTS",
        "label": "Supertonic (Local Fast Voice)",
        "category": "tts",
        "expected_mb": 120,
        "repo": "supertonic3",
        "hf_id": None,
        "is_default": True,
        "is_optional": False,
        "description": "Ultra-fast local voice synthesis for script narration. Zero API fees.",
    },
    {
        "id": "faster-whisper",
        "name": "Faster-Whisper Base",
        "label": "Faster-Whisper (Audio to Cut Alignment)",
        "category": "stt",
        "expected_mb": 480,
        "repo": "models--Systran--faster-whisper-base",
        "hf_id": "Systran/faster-whisper-base",
        "is_default": True,
        "is_optional": False,
        "description": "Word-level forced alignment to slice audio into visual scenes.",
    },
    {
        "id": "animagine-xl",
        "name": "Animagine XL 4.0 Lightning",
        "label": "Animagine XL 4.0 Lightning (Local Default 4-Step)",
        "category": "image",
        "expected_mb": 2200,
        "repo": "models--HelloSun--animagine-xl-4.0_Lightning_ov",
        "hf_id": "HelloSun/animagine-xl-4.0_Lightning_ov",
        "is_default": True,
        "is_optional": False,
        "description": "Local default 4-step image model optimized for 4GB RTX and Intel Arc iGPUs.",
    },
    {
        "id": "depth-anything",
        "name": "Depth-Anything-V2 Small",
        "label": "Depth-Anything-V2 (2.5D Parallax Estimator)",
        "category": "depth",
        "expected_mb": 1300,
        "repo": "models--depth-anything--Depth-Anything-V2-Small-hf",
        "hf_id": "depth-anything/Depth-Anything-V2-Small-hf",
        "is_default": True,
        "is_optional": False,
        "description": "Depth map generator for 2.5D camera zoom, pan, and orbit motion.",
    },
    {
        "id": "flux-schnell",
        "name": "FLUX.1-schnell",
        "label": "FLUX.1-schnell (Optional Heavy Model)",
        "category": "image",
        "expected_mb": 18000,
        "repo": "models--OpenVINO--FLUX.1-schnell-int4-ov",
        "hf_id": "OpenVINO/FLUX.1-schnell-int4-ov",
        "is_default": False,
        "is_optional": True,
        "description": "Optional heavy diffusion model (18 GB). Recommended only for high-end discrete GPUs.",
    },
]

def get_directory_size_mb(path: Path) -> float:
    if not path.exists():
        return 0.0
    total = sum(f.stat().st_size for f in path.glob("**/*") if f.is_file())
    return round(total / (1024 * 1024), 1)

def get_model_inventory() -> List[Dict[str, Any]]:
    hub_root = get_hf_hub_cache()
    user_cache = Path.home() / ".cache"
    inventory = []

    for item in MODEL_CATALOG:
        installed = False
        size_mb = 0.0
        compiled_cache_mb = 0.0

        if item["category"] == "tts":
            # Check supertonic in ~/.cache/supertonic3
            sp_dir = user_cache / "supertonic3"
            if sp_dir.exists() and any(sp_dir.iterdir()):
                installed = True
                size_mb = get_directory_size_mb(sp_dir)
            else:
                installed = True # Edge-TTS is always available as fallback
                size_mb = 120.0
        else:
            repo_path = hub_root / item["repo"]
            if repo_path.exists() and any(repo_path.iterdir()):
                installed = True
                size_mb = get_directory_size_mb(repo_path)

                # Check compiled .blob kernel cache size
                blobs = [f for f in repo_path.glob("**/*.blob")]
                if blobs:
                    compiled_cache_mb = round(sum(f.stat().st_size for f in blobs) / (1024 * 1024), 1)

        inventory.append({
            "id": item["id"],
            "name": item["name"],
            "label": item["label"],
            "category": item["category"],
            "size_mb": size_mb,
            "compiled_cache_mb": compiled_cache_mb,
            "installed": installed,
            "is_default": item["is_default"],
            "is_optional": item["is_optional"],
            "description": item["description"],
        })

    return inventory

def clear_model_compiled_cache(model_id: str) -> bool:
    """Removes OpenVINO .blob kernel caches for a model to reclaim gigabytes of disk space."""
    hub_root = get_hf_hub_cache()
    target_item = next((m for m in MODEL_CATALOG if m["id"] == model_id), None)
    if not target_item or target_item["category"] == "tts":
        return False

    repo_path = hub_root / target_item["repo"]
    if not repo_path.exists():
        return False

    for blob_file in repo_path.glob("**/*.blob"):
        try:
            blob_file.unlink()
        except Exception:
            pass
    return True

def delete_model_weights(model_id: str) -> bool:
    """Removes model directory from cache entirely."""
    hub_root = get_hf_hub_cache()
    target_item = next((m for m in MODEL_CATALOG if m["id"] == model_id), None)
    if not target_item or target_item["category"] == "tts":
        return False

    repo_path = hub_root / target_item["repo"]
    if repo_path.exists():
        shutil.rmtree(repo_path, ignore_errors=True)
        return True
    return False

def download_model_weights(model_id: str) -> bool:
    """Downloads model snapshot from Hugging Face Hub."""
    target_item = next((m for m in MODEL_CATALOG if m["id"] == model_id), None)
    if not target_item or not target_item.get("hf_id"):
        return False

    try:
        from huggingface_hub import snapshot_download
        hub_root = get_hf_hub_cache()
        snapshot_download(
            repo_id=target_item["hf_id"],
            local_dir=hub_root / target_item["repo"],
            local_files_only=False,
        )
        return True
    except Exception as e:
        import logging
        logging.getLogger("autitic").error(f"Failed to download {model_id}: {e}")
        return False
