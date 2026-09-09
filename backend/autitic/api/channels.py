"""Channel API endpoints."""

from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Channel, Project, Profile
from ..schemas import ChannelCreate, ChannelResponse, ChannelUpdate

router = APIRouter(prefix="/channels", tags=["Channels"])

@router.get("", response_model=List[ChannelResponse])
def list_channels(db: Session = Depends(get_db)):
    channels = db.query(Channel).filter(Channel.archived == False).all()
    results = []
    for c in channels:
        count = db.query(Project).filter(Project.channel_id == c.id).count()
        results.append(ChannelResponse(
            id=c.id,
            name=c.name,
            slug=c.slug,
            color=c.color,
            default_profile_id=c.default_profile_id,
            project_count=count,
            archived=c.archived,
        ))
    return results

@router.post("", response_model=ChannelResponse)
def create_channel(data: ChannelCreate, db: Session = Depends(get_db)):
    slug = data.name.lower().replace(" ", "-").replace("/", "")
    channel = Channel(
        user_id="usr_admin", # default single operator
        name=data.name,
        slug=slug,
        color=data.color or "emerald",
    )
    db.add(channel)
    db.commit()
    db.refresh(channel)

    # Automatically create a default profile for this channel
    default_profile = Profile(
        channel_id=channel.id,
        name="Channel Default Profile",
        is_default=True,
    )
    db.add(default_profile)
    db.commit()
    db.refresh(default_profile)

    channel.default_profile_id = default_profile.id
    db.commit()
    db.refresh(channel)

    return ChannelResponse(
        id=channel.id,
        name=channel.name,
        slug=channel.slug,
        color=channel.color,
        default_profile_id=channel.default_profile_id,
        project_count=0,
        archived=False,
    )

@router.put("/{channel_id}", response_model=ChannelResponse)
def update_channel(channel_id: str, data: ChannelUpdate, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    if data.name is not None:
        channel.name = data.name
        channel.slug = data.name.lower().replace(" ", "-")
    if data.color is not None:
        channel.color = data.color
    if data.default_profile_id is not None:
        channel.default_profile_id = data.default_profile_id

    db.commit()
    db.refresh(channel)

    count = db.query(Project).filter(Project.channel_id == channel.id).count()
    return ChannelResponse(
        id=channel.id,
        name=channel.name,
        slug=channel.slug,
        color=channel.color,
        default_profile_id=channel.default_profile_id,
        project_count=count,
        archived=channel.archived,
    )
