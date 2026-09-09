"""Pydantic schemas for Autitic Studio."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# User & Session Schemas
class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str

# Channel Schemas
class ChannelCreate(BaseModel):
    name: str
    color: Optional[str] = "emerald"

class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    default_profile_id: Optional[str] = None

class ChannelResponse(BaseModel):
    id: str
    name: str
    slug: str
    color: str
    default_profile_id: Optional[str] = None
    project_count: int = 0
    archived: bool = False

# Profile Schemas
class ProfileCreate(BaseModel):
    name: str
    channel_id: str
    is_default: bool = False
    script_config: Optional[Dict[str, Any]] = None
    tts_config: Optional[Dict[str, Any]] = None
    cut_config: Optional[Dict[str, Any]] = None
    image_motion_config: Optional[Dict[str, Any]] = None
    render_config: Optional[Dict[str, Any]] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    is_default: Optional[bool] = None
    script_config: Optional[Dict[str, Any]] = None
    tts_config: Optional[Dict[str, Any]] = None
    cut_config: Optional[Dict[str, Any]] = None
    image_motion_config: Optional[Dict[str, Any]] = None
    render_config: Optional[Dict[str, Any]] = None

class ProfileResponse(BaseModel):
    id: str
    channel_id: str
    name: str
    is_default: bool
    script_config: Dict[str, Any]
    tts_config: Dict[str, Any]
    cut_config: Dict[str, Any]
    image_motion_config: Dict[str, Any]
    render_config: Dict[str, Any]

# Project Schemas
class ProjectCreate(BaseModel):
    title: str
    channel_id: str
    profile_id: Optional[str] = None
    aspect_ratio: Optional[str] = "9:16"

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    stage: Optional[str] = None
    profile_id: Optional[str] = None
    aspect_ratio: Optional[str] = None
    config_override: Optional[Dict[str, Any]] = None

class ProjectSummaryResponse(BaseModel):
    id: str
    channel_id: str
    title: str
    stage: str
    aspect_ratio: str
    profile_id: Optional[str] = None
    profile_name: Optional[str] = None
    shot_count: int = 0
    duration_s: float = 0.0
    updated_at: str


# Job Schemas
class JobResponse(BaseModel):
    id: str
    project_id: str
    channel_id: str
    type: str
    state: str
    progress_pct: float
    progress_step: str
    error: Optional[str] = None

# Settings & Model Configurator Schemas
class ModelItemResponse(BaseModel):
    id: str
    name: str
    label: str
    category: str # tts, stt, image, depth, video
    size_mb: float
    installed: bool
    is_default: bool
    is_optional: bool
    description: str

class ColabBridgeConfig(BaseModel):
    url: str
    token: Optional[str] = None
    default_image_model: str = "flux-schnell"
    default_video_model: str = "wan2.1-i2v-1.3b"

class ColabBridgeStatus(BaseModel):
    online: bool
    gpu_name: Optional[str] = None
    vram_used_gb: Optional[float] = None
    vram_total_gb: Optional[float] = None
    latency_ms: Optional[int] = None
