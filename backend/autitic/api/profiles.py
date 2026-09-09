"""Profiles API endpoints: 5-Stage Advanced Presets."""

from __future__ import annotations

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Channel, Profile
from ..schemas import ProfileCreate, ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profiles", tags=["Profiles"])

@router.get("/channel/{channel_id}", response_model=List[ProfileResponse])
def list_channel_profiles(channel_id: str, db: Session = Depends(get_db)):
    profiles = db.query(Profile).filter(Profile.channel_id == channel_id).all()
    return profiles

@router.post("", response_model=ProfileResponse)
def create_profile(data: ProfileCreate, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == data.channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    if data.is_default:
        # Unset other defaults for this channel
        db.query(Profile).filter(Profile.channel_id == data.channel_id).update({"is_default": False})

    profile = Profile(
        channel_id=data.channel_id,
        name=data.name,
        is_default=data.is_default,
    )
    if data.script_config:
        profile.script_config = data.script_config
    if data.tts_config:
        profile.tts_config = data.tts_config
    if data.cut_config:
        profile.cut_config = data.cut_config
    if data.image_motion_config:
        profile.image_motion_config = data.image_motion_config
    if data.render_config:
        profile.render_config = data.render_config

    db.add(profile)
    db.commit()
    db.refresh(profile)

    if data.is_default:
        channel.default_profile_id = profile.id
        db.commit()

    return profile

@router.put("/{profile_id}", response_model=ProfileResponse)
def update_profile(profile_id: str, data: ProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if data.name is not None:
        profile.name = data.name
    if data.script_config is not None:
        profile.script_config = data.script_config
    if data.tts_config is not None:
        profile.tts_config = data.tts_config
    if data.cut_config is not None:
        profile.cut_config = data.cut_config
    if data.image_motion_config is not None:
        profile.image_motion_config = data.image_motion_config
    if data.render_config is not None:
        profile.render_config = data.render_config

    if data.is_default is True:
        db.query(Profile).filter(Profile.channel_id == profile.channel_id).update({"is_default": False})
        profile.is_default = True
        channel = db.query(Channel).filter(Channel.id == profile.channel_id).first()
        if channel:
            channel.default_profile_id = profile.id

    db.commit()
    db.refresh(profile)
    return profile

@router.post("/{profile_id}/clone", response_model=ProfileResponse)
def clone_profile(profile_id: str, new_name: Optional[str] = None, db: Session = Depends(get_db)):
    source = db.query(Profile).filter(Profile.id == profile_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source profile not found")

    clone_name = new_name or f"{source.name} (Copy)"
    cloned = Profile(
        channel_id=source.channel_id,
        name=clone_name,
        is_default=False,
        script_config=dict(source.script_config or {}),
        tts_config=dict(source.tts_config or {}),
        cut_config=dict(source.cut_config or {}),
        image_motion_config=dict(source.image_motion_config or {}),
        render_config=dict(source.render_config or {}),
    )
    db.add(cloned)
    db.commit()
    db.refresh(cloned)
    return cloned

@router.post("/channel/{channel_id}/clone_default", response_model=ProfileResponse)
def clone_channel_default_profile(channel_id: str, new_name: Optional[str] = None, db: Session = Depends(get_db)):
    default_prof = db.query(Profile).filter(Profile.channel_id == channel_id, Profile.is_default == True).first()
    if not default_prof:
        default_prof = db.query(Profile).filter(Profile.channel_id == channel_id).first()
    if not default_prof:
        raise HTTPException(status_code=404, detail="No profile exists for this channel")

    clone_name = new_name or f"Custom Profile ({db.query(Profile).filter(Profile.channel_id == channel_id).count() + 1})"
    cloned = Profile(
        channel_id=channel_id,
        name=clone_name,
        is_default=False,
        script_config=dict(default_prof.script_config or {}),
        tts_config=dict(default_prof.tts_config or {}),
        cut_config=dict(default_prof.cut_config or {}),
        image_motion_config=dict(default_prof.image_motion_config or {}),
        render_config=dict(default_prof.render_config or {}),
    )
    db.add(cloned)
    db.commit()
    db.refresh(cloned)
    return cloned
