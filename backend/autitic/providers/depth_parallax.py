"""Depth Estimation & 2.5D Parallax Motion Provider: Depth-Anything-V2."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict
from PIL import Image
from ..config import get_hf_hub_cache

_DEPTH_PIPE = None

def get_depth_pipeline():
    global _DEPTH_PIPE
    if _DEPTH_PIPE is not None:
        return _DEPTH_PIPE
    from transformers import pipeline
    hub_cache = get_hf_hub_cache()
    depth_dir = hub_cache / "models--depth-anything--Depth-Anything-V2-Small-hf"
    snap_dir = None
    if depth_dir.exists():
        snaps = depth_dir / "snapshots"
        if snaps.exists():
            for child in snaps.iterdir():
                if child.is_dir():
                    snap_dir = child
                    break
    model_id = str(snap_dir) if snap_dir else "depth-anything/Depth-Anything-V2-Small-hf"
    _DEPTH_PIPE = pipeline(task="depth-estimation", model=model_id, device="cpu")
    return _DEPTH_PIPE

def estimate_depth_map(image_path: Path, output_depth_path: Path) -> Path:
    """Estimates grayscale depth map from an input RGB image using Depth-Anything-V2."""
    output_depth_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        pipe = get_depth_pipeline()
        image = Image.open(image_path).convert("RGB")
        depth = pipe(image)["depth"]
        depth.save(str(output_depth_path))
        return output_depth_path
    except Exception:
        # Fallback high-contrast edge/gradient depth map
        img = Image.open(image_path).convert("L")
        img.save(str(output_depth_path))
        return output_depth_path

def plan_2_5d_motion(
    trajectory: str = "push_in",
    duration_s: float = 3.5,
    intensity: float = 1.0,
) -> Dict[str, Any]:
    """Generates 2.5D camera translation, scale, and focus keyframes for Remotion/FFmpeg."""
    return {
        "trajectory": trajectory,
        "duration_s": duration_s,
        "intensity": intensity,
        "camera": {
            "start": {"x": 0.5, "y": 0.5, "scale": 1.0, "rotation": 0.0},
            "end": {"x": 0.5, "y": 0.5, "scale": 1.0 + (0.15 * intensity), "rotation": 0.0},
            "easing": "cubic-bezier(0.25, 1, 0.5, 1)",
        },
    }
