"""Settings API Router: Model Configurator, Hardware, and Colab Bridge."""

from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter, Body, HTTPException
from ..providers.hardware import detect_hardware
from ..providers.model_store import (
    clear_model_compiled_cache,
    delete_model_weights,
    download_model_weights,
    get_model_inventory,
)
from ..providers.colab_wan2gp import get_colab_config, save_colab_config, test_colab_connection
from ..schemas import ColabBridgeConfig, ColabBridgeStatus, ModelItemResponse

router = APIRouter(prefix="/settings", tags=["Settings & Models"])

@router.get("/hardware")
def get_hardware():
    report = detect_hardware()
    return {
        "platform": report.platform,
        "cpu": report.cpu,
        "ram_gb": report.ram_gb,
        "gpus": report.gpus,
        "has_openvino": report.has_openvino,
        "has_cuda": report.has_cuda,
        "recommended_image_device": report.recommended_image_device,
    }

@router.get("/models", response_model=List[ModelItemResponse])
def list_models():
    inventory = get_model_inventory()
    return [
        ModelItemResponse(
            id=m["id"],
            name=m["name"],
            label=m["label"],
            category=m["category"],
            size_mb=m["size_mb"],
            installed=m["installed"],
            is_default=m["is_default"],
            is_optional=m["is_optional"],
            description=m["description"],
        )
        for m in inventory
    ]

@router.post("/models/{model_id}/clear_cache")
def clear_cache(model_id: str):
    ok = clear_model_compiled_cache(model_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Failed or no compiled cache for this model")
    return {"status": "cleared", "model_id": model_id}

@router.delete("/models/{model_id}")
def delete_model(model_id: str):
    ok = delete_model_weights(model_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Failed to delete or model not found in cache")
    return {"status": "deleted", "model_id": model_id}

@router.post("/models/{model_id}/download")
def download_model(model_id: str):
    ok = download_model_weights(model_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Download failed or model has no HuggingFace repo ID")
    return {"status": "downloaded", "model_id": model_id}

@router.get("/colab")
async def get_colab():
    cfg = get_colab_config()
    status = await test_colab_connection()
    return {
        "config": cfg,
        "status": status,
    }

@router.post("/colab")
def save_colab(data: ColabBridgeConfig):
    save_colab_config(data.url, data.token or "")
    return {"status": "saved", "url": data.url}

@router.post("/colab/test", response_model=ColabBridgeStatus)
async def test_colab(url: str = Body(..., embed=True), token: str = Body(default="", embed=True)):
    res = await test_colab_connection(url=url, token=token)
    return ColabBridgeStatus(
        online=res.get("online", False),
        gpu_name=res.get("gpu_name"),
        vram_used_gb=res.get("vram_used_gb"),
        vram_total_gb=res.get("vram_total_gb"),
        latency_ms=res.get("latency_ms"),
    )

import os
import shutil
from ..config import DATA_DIR, CHANNELS_DIR, CACHE_DIR, DATABASE_URL

@router.get("/api_keys")
def get_api_keys():
    return {
        "deepseek_api_key": os.environ.get("DEEPSEEK_API_KEY", ""),
        "openai_api_key": os.environ.get("OPENAI_API_KEY", ""),
        "ollama_base_url": os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1"),
        "llm_provider": os.environ.get("AUTITIC_LLM_PROVIDER", "deepseek"),
    }

@router.post("/api_keys")
def save_api_keys(data: Dict[str, Any] = Body(...)):
    for k in ["deepseek_api_key", "openai_api_key", "ollama_base_url", "llm_provider"]:
        if k in data:
            env_key = {
                "deepseek_api_key": "DEEPSEEK_API_KEY",
                "openai_api_key": "OPENAI_API_KEY",
                "ollama_base_url": "OLLAMA_BASE_URL",
                "llm_provider": "AUTITIC_LLM_PROVIDER",
            }[k]
            os.environ[env_key] = str(data[k])
    return {"status": "saved"}

@router.get("/storage")
def get_storage():
    usage = shutil.disk_usage(DATA_DIR)
    return {
        "data_dir": str(DATA_DIR),
        "channels_dir": str(CHANNELS_DIR),
        "cache_dir": str(CACHE_DIR),
        "database_url": DATABASE_URL,
        "disk_total_gb": round(usage.total / (1024**3), 1),
        "disk_free_gb": round(usage.free / (1024**3), 1),
    }
