"""Database Models for Autitic Studio."""

from __future__ import annotations

import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, JSON, Float, Text
from sqlalchemy.orm import relationship
import ulid

from .db import Base

def generate_id(prefix: str) -> str:
    return f"{prefix}_{str(ulid.ULID()).lower()}"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: generate_id("usr"))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    channels = relationship("Channel", back_populates="owner", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: generate_id("ses"))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="sessions")

class Channel(Base):
    __tablename__ = "channels"

    id = Column(String, primary_key=True, default=lambda: generate_id("chn"))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, index=True)
    color = Column(String, default="emerald")
    default_profile_id = Column(String, nullable=True)
    archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="channels")
    profiles = relationship("Profile", back_populates="channel", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="channel", cascade="all, delete-orphan")

class Profile(Base):
    """5-Pillar Advanced Pipeline Profile Configuration."""
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, default=lambda: generate_id("prf"))
    channel_id = Column(String, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    is_default = Column(Boolean, default=False)

    # 1. Script & Ideation Configuration
    script_config = Column(JSON, default=lambda: {
        "persona": "Investigative Sci-Fi Journalist",
        "style": "cinematic, analytical, high retention",
        "tone": "mysterious, grounded, awe-inspiring",
        "audience": "Curious thinkers 18-35",
        "target_duration_s": 60,
        "target_words": 150,
        "dos": "Open with a paradox within 2 seconds; use sensory metaphors; end with existential thought.",
        "donts": "No cheesy puns, no generic intros.",
    })

    # 2. TTS & Supertonic Audio Configuration
    tts_config = Column(JSON, default=lambda: {
        "engine": "supertonic", # supertonic (local default), edge_tts, elevenlabs
        "voice_id": "en_m_cosmic_narrator",
        "speed": 1.05,
        "pitch": -2,
        "pause_between_beats_s": 0.35,
    })

    # 3. Cut & Whisper Cadence Configuration
    cut_config = Column(JSON, default=lambda: {
        "energy": "high", # calm, normal, high, frantic
        "aspect_ratio": "9:16",
        "max_shot_duration_s": 4.5,
        "min_shot_duration_s": 1.5,
        "whisper_silence_threshold": 0.25,
    })

    # 4. Images & Motion (Animagine XL Local Default / Colab Wan2GP)
    image_motion_config = Column(JSON, default=lambda: {
        "local_image_model": "animagine-xl-4.0_Lightning_ov", # Low VRAM 4-step local default
        "remote_engine": "colab_wan2gp", # Default target for heavy jobs
        "style_prefix": "cinematic dark sci-fi, volumetric rim lighting, 8k detailed concept art, moody atmosphere, masterpiece",
        "negative_prompt": "low quality, blurry, watermark, bad anatomy, deformed, text",
        "motion_mode": "parallax_2.5d", # parallax_2.5d or wan2gp_i2v
        "parallax_trajectory": "dynamic_alternate", # push_in, dolly_out, orbit, pan
        "wan2gp_motion_bucket": 130,
        "wan2gp_model": "wan2.1-i2v-1.3b",
    })

    # 5. Subtitles & Render Assembly Configuration
    render_config = Column(JSON, default=lambda: {
        "font_family": "THE BOLD FONT",
        "highlight_color": "#FACC15",
        "animation": "pop_bounce",
        "safe_zone": "shorts_tiktok_9_16",
        "fps": 60,
        "resolution": [1080, 1920],
    })

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    channel = relationship("Channel", back_populates="profiles")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: generate_id("prj"))
    channel_id = Column(String, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False, index=True)
    profile_id = Column(String, ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    
    # 6 Decoupled Stages: script -> voice -> cut -> images -> motion -> render -> ready
    stage = Column(String, default="script", index=True)
    aspect_ratio = Column(String, default="9:16")

    # Ad-hoc custom overrides on top of inherited profile
    config_override = Column(JSON, default=dict)

    # Lightweight summary cache for 100+ projects list performance
    summary_cache = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    channel = relationship("Channel", back_populates="projects")
    jobs = relationship("Job", back_populates="project", cascade="all, delete-orphan")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: generate_id("job"))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    channel_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False) # voice, cut, image, motion, render
    state = Column(String, default="queued", index=True) # queued, running, completed, failed, cancelled
    progress_pct = Column(Float, default=0.0)
    progress_step = Column(String, default="")
    error = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="jobs")
