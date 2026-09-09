"""The GPU end of the remote provider — run this on Google Colab or any CUDA box (doc 17, Phase 3 & 4).

Implements the HTTP contract ReelForge expects for:
1. High-speed Text-to-Image (Z-Image-Turbo, FLUX-schnell, SDXL-turbo)
2. AI Video Generation with Wan 2.1 / Wan2GP (Text-to-Video and Image-to-Video)

Routes:
    GET  /health        -> Check connection, active device, loaded models, VRAM usage
    POST /generate      -> Single still image (base64 PNG)
    POST /batch         -> NDJSON batch of still images
    POST /video         -> Single video generation (base64 MP4)
    POST /video_batch   -> NDJSON batch of video generation

Colab setup:
    !pip -q install diffusers transformers accelerate fastapi uvicorn nest_asyncio imageio[ffmpeg] sentencepiece torchvision
    !python colab_gpu_server.py
"""

from __future__ import annotations

import base64
import io
import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Optional

import torch
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

TOKEN = os.environ.get("AUTITIC_TOKEN") or os.environ.get("REELFORGE_TOKEN", "")

IMAGE_MODELS = {
    "z-image-turbo": {"repo": "Tongyi-MAI/Z-Image-Turbo", "steps": 8, "guidance": 1.0},
    "flux-schnell": {"repo": "black-forest-labs/FLUX.1-schnell", "steps": 4, "guidance": 0.0},
    "sdxl-turbo": {"repo": "stabilityai/sdxl-turbo", "steps": 4, "guidance": 0.0},
}

VIDEO_MODELS = {
    "wan2.1-t2v-1.3b": {"repo": "Wan-AI/Wan2.1-T2V-1.3B-Diffusers", "type": "t2v", "steps": 30},
    "wan2.1-i2v-14b-480p": {"repo": "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers", "type": "i2v", "steps": 30},
    "wan2.1-i2v-1.3b": {"repo": "Wan-AI/Wan2.1-I2V-1.3B-Diffusers", "type": "i2v", "steps": 25},
}

app = FastAPI(title="Autitic Studio Wan2GP & Z-Image Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_image_pipe = None
_video_pipe = None
_loaded_image_model: str | None = None
_loaded_video_model: str | None = None


@app.on_event("startup")
def preload_default_model():
    import threading
    def _warmup():
        try:
            print("[Colab Server] Pre-warming default image model...")
            load_image_model("sdxl-turbo")
            print("[Colab Server] Default image model warmed up and ready!")
        except Exception as e:
            print(f"[Colab Server] Warm-up notice: {e}")
    threading.Thread(target=_warmup, daemon=True).start()


def check_auth(auth: str | None) -> None:
    if TOKEN and auth != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized: invalid or missing auth token")


def get_vram_info() -> dict:
    if not torch.cuda.is_available():
        return {"vram_allocated_gb": 0.0, "vram_reserved_gb": 0.0, "vram_total_gb": 0.0}
    allocated = torch.cuda.memory_allocated() / (1024**3)
    reserved = torch.cuda.memory_reserved() / (1024**3)
    total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    return {
        "vram_allocated_gb": round(allocated, 2),
        "vram_reserved_gb": round(reserved, 2),
        "vram_total_gb": round(total, 2),
    }


def get_optimal_dtype():
    if not torch.cuda.is_available():
        return torch.float32
    try:
        cap = torch.cuda.get_device_capability()
        if cap[0] >= 8:  # Ampere/Hopper (A100, H100, RTX 3090/4090)
            return torch.bfloat16
    except Exception:
        pass
    # Tesla T4 and older Turing GPUs MUST use float16
    return torch.float16


def load_image_model(model_id: str):
    global _image_pipe, _loaded_image_model
    if _loaded_image_model == model_id and _image_pipe is not None:
        return _image_pipe

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = get_optimal_dtype()
    print(f"[Colab Server] Loading model '{model_id}' on {device} ({dtype})...")

    # If z-image-turbo requested, try ZImagePipeline from latest diffusers git
    if model_id == "z-image-turbo":
        try:
            from diffusers import ZImagePipeline
            _image_pipe = ZImagePipeline.from_pretrained(
                "Tongyi-MAI/Z-Image-Turbo", torch_dtype=dtype
            ).to(device)
            _loaded_image_model = model_id
            print("[Colab Server] Loaded ZImagePipeline (Tongyi-MAI/Z-Image-Turbo)!")
            return _image_pipe
        except Exception as e:
            print(f"[Colab Server] ZImagePipeline unavailable ({e}), using fast SDXL-Turbo fallback...")
            model_id = "sdxl-turbo"

    from diffusers import AutoPipelineForText2Image

    spec = IMAGE_MODELS.get(model_id) or IMAGE_MODELS["sdxl-turbo"]
    repo_id = spec["repo"]
    try:
        _image_pipe = AutoPipelineForText2Image.from_pretrained(
            repo_id,
            torch_dtype=dtype,
            variant="fp16" if dtype == torch.float16 else None,
        ).to(device)
    except Exception as e:
        print(f"[Colab Server] Standard loading for {repo_id}: {e}")
        _image_pipe = AutoPipelineForText2Image.from_pretrained(
            repo_id,
            torch_dtype=dtype,
        ).to(device)

    if torch.cuda.is_available() and hasattr(_image_pipe, "enable_attention_slicing"):
        _image_pipe.enable_attention_slicing()

    _loaded_image_model = model_id
    print(f"[Colab Server] Successfully loaded {model_id} ({repo_id})!")
    return _image_pipe


def load_video_model(model_id: str):
    global _video_pipe, _loaded_video_model
    if _loaded_video_model == model_id and _video_pipe is not None:
        return _video_pipe

    spec = VIDEO_MODELS.get(model_id) or VIDEO_MODELS["wan2.1-t2v-1.3b"]
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = get_optimal_dtype()

    try:
        if spec["type"] == "i2v":
            from diffusers import WanImageToVideoPipeline
            _video_pipe = WanImageToVideoPipeline.from_pretrained(
                spec["repo"], torch_dtype=dtype
            )
        else:
            from diffusers import WanPipeline
            _video_pipe = WanPipeline.from_pretrained(
                spec["repo"], torch_dtype=dtype
            )
        if torch.cuda.is_available():
            _video_pipe.enable_model_cpu_offload()
    except Exception:
        from diffusers import DiffusionPipeline
        _video_pipe = DiffusionPipeline.from_pretrained(
            spec["repo"], torch_dtype=dtype
        )
        if torch.cuda.is_available():
            _video_pipe.enable_model_cpu_offload()

    _loaded_video_model = model_id
    return _video_pipe


class ImageItem(BaseModel):
    shot: int
    prompt: str
    negative: str = ""
    width: int = 576
    height: int = 1024
    seed: int = 0
    steps: int | None = None
    guidance: float | None = None
    model: Optional[str] = None


class ImageBatch(BaseModel):
    model: str = "z-image-turbo"
    items: list[ImageItem]


class VideoItem(BaseModel):
    shot: int
    prompt: str
    negative: str = ""
    image_base64: Optional[str] = None  # For Image-to-Video
    width: int = 480
    height: int = 832
    duration_s: float = 3.0
    fps: int = 16
    seed: int = 42
    steps: int | None = None
    guidance: float | None = None
    model: str = "wan2.1-i2v-1.3b"


class VideoBatch(BaseModel):
    items: list[VideoItem]


@app.get("/health")
def health(authorization: str | None = Header(default=None)):
    check_auth(authorization)
    vram = get_vram_info()
    return {
        "ok": True,
        "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu",
        "cuda": torch.cuda.is_available(),
        "vram": vram,
        "image_models": list(IMAGE_MODELS),
        "video_models": list(VIDEO_MODELS),
        "warm_image_model": _loaded_image_model or "",
        "warm_video_model": _loaded_video_model or "",
        "service": "Autitic Studio Colab Bridge",
    }


@app.get("/logs")
def get_server_logs():
    log_file = Path("colab_server.log")
    if log_file.exists():
        content = log_file.read_text(encoding="utf-8", errors="ignore")
        return {"logs": content[-4000:]}
    return {"logs": "colab_server.log not found"}


def draw_image(pipe, spec: dict, item: ImageItem):
    num_steps = int(item.steps or spec.get("steps", 4))
    guidance = float(item.guidance if item.guidance is not None else spec.get("guidance", 0.0))

    kwargs: dict[str, Any] = {
        "prompt": item.prompt,
        "num_inference_steps": num_steps,
        "guidance_scale": guidance,
    }
    if item.width and item.height:
        kwargs["width"] = int(item.width // 8 * 8)
        kwargs["height"] = int(item.height // 8 * 8)

    if torch.cuda.is_available():
        kwargs["generator"] = torch.Generator("cuda").manual_seed(int(item.seed or 42))

    if item.negative and guidance > 1.0:
        kwargs["negative_prompt"] = item.negative

    print(f"[Colab Server] Generating with kwargs: {kwargs}")
    output = pipe(**kwargs)
    return output.images[0]


@app.post("/generate")
def generate_image(item: ImageItem, authorization: str | None = Header(default=None)):
    check_auth(authorization)
    try:
        target_model = item.model or "sdxl-turbo"
        pipe = load_image_model(target_model)
        spec = IMAGE_MODELS.get(_loaded_image_model) or IMAGE_MODELS.get("sdxl-turbo") or {"steps": 4, "guidance": 0.0}
        img = draw_image(pipe, spec, item)
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return {
            "image": base64.b64encode(buffer.getvalue()).decode(),
            "model": _loaded_image_model,
        }
    except Exception as exc:
        import traceback
        err_msg = traceback.format_exc()
        print(f"[Colab Server Error] {err_msg}")
        raise HTTPException(status_code=500, detail=err_msg)


@app.post("/batch")
def generate_image_batch(body: ImageBatch, authorization: str | None = Header(default=None)):
    check_auth(authorization)
    spec = IMAGE_MODELS.get(body.model) or IMAGE_MODELS["z-image-turbo"]

    def stream():
        yield json.dumps({"event": "status", "message": f"loading model {body.model}"}) + "\n"
        pipe = load_image_model(body.model)
        for item in body.items:
            started = time.monotonic()
            try:
                img = draw_image(pipe, spec, item)
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                yield json.dumps(
                    {
                        "event": "image",
                        "shot": item.shot,
                        "elapsed_s": round(time.monotonic() - started, 2),
                        "image": base64.b64encode(buf.getvalue()).decode(),
                    }
                ) + "\n"
            except Exception as exc:
                yield json.dumps(
                    {"event": "failed", "shot": item.shot, "error": f"{type(exc).__name__}: {exc}"}
                ) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")


def render_video_frames(pipe, item: VideoItem, spec: dict) -> list:
    """Invokes Wan 2.1 text-to-video or image-to-video pipeline and returns frames."""
    from PIL import Image

    num_frames = int(item.duration_s * item.fps)
    kwargs: dict[str, Any] = {
        "prompt": item.prompt,
        "width": item.width,
        "height": item.height,
        "num_frames": num_frames,
        "num_inference_steps": item.steps or spec.get("steps", 30),
    }
    if item.guidance is not None:
        kwargs["guidance_scale"] = item.guidance
    if torch.cuda.is_available():
        kwargs["generator"] = torch.Generator("cuda").manual_seed(int(item.seed))

    if item.image_base64:
        img_bytes = base64.b64decode(item.image_base64)
        init_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        init_image = init_image.resize((item.width, item.height))
        kwargs["image"] = init_image

    output = pipe(**kwargs)
    return output.frames[0] if hasattr(output, "frames") else output[0]


def frames_to_mp4_base64(frames: list, fps: int = 16) -> str:
    """Encodes PIL frames or numpy arrays into MP4 format."""
    import imageio.v2 as imageio
    import numpy as np

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        writer = imageio.get_writer(tmp_path, fps=fps, codec="libx264", quality=8)
        for frame in frames:
            if not isinstance(frame, np.ndarray):
                frame = np.array(frame)
            writer.append_data(frame)
        writer.close()

        with open(tmp_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        return encoded
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


@app.post("/video")
def generate_video(item: VideoItem, authorization: str | None = Header(default=None)):
    check_auth(authorization)
    model_id = item.model or ("wan2.1-i2v-1.3b" if item.image_base64 else "wan2.1-t2v-1.3b")
    spec = VIDEO_MODELS.get(model_id) or VIDEO_MODELS["wan2.1-t2v-1.3b"]

    started = time.monotonic()
    pipe = load_video_model(model_id)
    frames = render_video_frames(pipe, item, spec)
    mp4_b64 = frames_to_mp4_base64(frames, fps=item.fps)

    return {
        "shot": item.shot,
        "elapsed_s": round(time.monotonic() - started, 2),
        "video": mp4_b64,
        "fps": item.fps,
        "model": model_id,
    }


@app.post("/video_batch")
def generate_video_batch(body: VideoBatch, authorization: str | None = Header(default=None)):
    check_auth(authorization)

    def stream():
        yield json.dumps({"event": "status", "message": "initializing video models"}) + "\n"
        for item in body.items:
            started = time.monotonic()
            model_id = item.model or ("wan2.1-i2v-1.3b" if item.image_base64 else "wan2.1-t2v-1.3b")
            spec = VIDEO_MODELS.get(model_id) or VIDEO_MODELS["wan2.1-t2v-1.3b"]
            try:
                yield json.dumps({
                    "event": "generating_clip",
                    "shot": item.shot,
                    "prompt": item.prompt[:80],
                    "model": model_id,
                }) + "\n"
                pipe = load_video_model(model_id)
                frames = render_video_frames(pipe, item, spec)
                mp4_b64 = frames_to_mp4_base64(frames, fps=item.fps)
                yield json.dumps({
                    "event": "video_clip",
                    "shot": item.shot,
                    "elapsed_s": round(time.monotonic() - started, 2),
                    "video": mp4_b64,
                    "fps": item.fps,
                    "model": model_id,
                }) + "\n"
            except Exception as exc:
                yield json.dumps({
                    "event": "failed",
                    "shot": item.shot,
                    "error": f"{type(exc).__name__}: {exc}",
                }) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting ReelForge Remote GPU Bridge on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
