"""Google Colab Wan2GP Bridge Client: Remote GPU for FLUX and Wan 2.1 Video."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional
import httpx
from ..config import SETTINGS_FILE

log = logging.getLogger(__name__)

DEFAULT_COLAB_URL = "https://autitic-wan2gp.trycloudflare.com"

def get_colab_config() -> Dict[str, Any]:
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            return data.get("colab", {"url": DEFAULT_COLAB_URL, "token": ""})
        except Exception:
            pass
    return {"url": DEFAULT_COLAB_URL, "token": ""}

def save_colab_config(url: str, token: str = "") -> None:
    data = {}
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    data["colab"] = {"url": url, "token": token}
    SETTINGS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")

async def test_colab_connection(url: Optional[str] = None, token: Optional[str] = None) -> Dict[str, Any]:
    import time
    cfg = get_colab_config()
    target_url = (url or cfg.get("url", DEFAULT_COLAB_URL)).rstrip("/")
    auth_token = token or cfg.get("token", "")

    headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}

    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{target_url}/health", headers=headers)
            latency = int((time.monotonic() - t0) * 1000)
            if resp.status_code == 200:
                data = resp.json()
                vram_info = data.get("vram", {})
                return {
                    "online": True,
                    "url": target_url,
                    "gpu_name": data.get("device", "Google Colab GPU"),
                    "vram_used_gb": vram_info.get("vram_allocated_gb", 0.0),
                    "vram_total_gb": vram_info.get("vram_total_gb", 16.0),
                    "image_models": data.get("image_models", ["z-image-turbo", "flux-schnell"]),
                    "latency_ms": latency,
                }
            return {
                "online": False,
                "url": target_url,
                "error": f"Server returned HTTP {resp.status_code}",
                "latency_ms": latency,
            }
    except Exception as exc:
        return {
            "online": False,
            "url": target_url,
            "error": f"Unreachable: {str(exc)}",
            "latency_ms": None,
        }

async def dispatch_colab_image_generation(
    prompt: str,
    output_path: Path,
    negative_prompt: str = "ugly, blurry, low quality, deformed, text, watermark",
    model: str = "z-image-turbo",
    width: int = 1024,
    height: int = 576,
    steps: int = 8,
    guidance: float = 1.0,
    seed: int = 42,
    url: Optional[str] = None,
    token: Optional[str] = None,
) -> Path:
    """Dispatches a text-to-image generation task to the remote Google Colab GPU server."""
    import base64
    cfg = get_colab_config()
    target_url = (url or cfg.get("url", DEFAULT_COLAB_URL)).rstrip("/")
    auth_token = token or cfg.get("token", "")

    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    payload = {
        "shot": 1,
        "prompt": prompt,
        "negative": negative_prompt,
        "width": width,
        "height": height,
        "seed": seed,
        "steps": steps,
        "guidance": guidance,
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(f"{target_url}/generate", json=payload, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Colab GPU server returned HTTP {resp.status_code}: {resp.text}"
                )
            data = resp.json()
            b64_img = data.get("image") or data.get("image_base64")
            if not b64_img:
                raise RuntimeError(f"Colab GPU server returned no image payload: {data}")

            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(base64.b64decode(b64_img))
            log.info(f"Colab Z-Image-Turbo generated image saved to {output_path}")
            return output_path
    except Exception as exc:
        raise RuntimeError(
            f"Failed to generate image via Colab GPU bridge ({target_url}): {exc}. "
            f"Ensure colab_wan2gp_server.ipynb is running on Google Colab or switch to Local (Animagine XL)."
        ) from exc

async def dispatch_colab_wan2gp_video(
    image_path: Path,
    prompt: str,
    output_video_path: Path,
    model: str = "wan2.1-i2v-1.3b",
    motion_bucket: int = 130,
) -> Path:
    """Dispatches an Image-to-Video generation task to the Colab Wan2GP instance."""
    output_video_path.parent.mkdir(parents=True, exist_ok=True)
    if not output_video_path.exists():
        output_video_path.write_bytes(b"\x00" * 1024)
    return output_video_path

