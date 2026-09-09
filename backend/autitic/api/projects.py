"""Projects API router: High-performance 100+ project management."""

from __future__ import annotations

import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Channel, Profile, Project
from ..schemas import ProjectCreate, ProjectSummaryResponse, ProjectUpdate
from ..rooms import get_project_dir

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("/channel/{channel_id}", response_model=List[ProjectSummaryResponse])
def list_channel_projects(
    channel_id: str,
    stage: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = Query(default=100, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Project).filter(Project.channel_id == channel_id)

    if stage and stage != "all":
        q = q.filter(Project.stage == stage)
    if query:
        q = q.filter(Project.title.ilike(f"%{query}%"))

    projects = q.order_by(Project.updated_at.desc()).offset(offset).limit(limit).all()

    results = []
    for p in projects:
        profile_name = None
        if p.profile_id:
            prof = db.query(Profile).filter(Profile.id == p.profile_id).first()
            if prof:
                profile_name = prof.name

        summary = p.summary_cache or {}
        results.append(ProjectSummaryResponse(
            id=p.id,
            channel_id=p.channel_id,
            title=p.title,
            stage=p.stage,
            aspect_ratio=p.aspect_ratio,
            profile_id=p.profile_id,
            profile_name=profile_name,
            shot_count=summary.get("shot_count", 0),
            duration_s=summary.get("duration_s", 0.0),
            updated_at=p.updated_at.isoformat() if p.updated_at else "",
        ))
    return results

@router.post("", response_model=ProjectSummaryResponse)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == data.channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    selected_profile_id = data.profile_id or channel.default_profile_id

    project = Project(
        channel_id=data.channel_id,
        profile_id=selected_profile_id,
        title=data.title,
        stage="script",
        aspect_ratio=data.aspect_ratio or "9:16",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Initialize project directory on disk
    get_project_dir(channel.id, project.id)

    profile_name = None
    if selected_profile_id:
        prof = db.query(Profile).filter(Profile.id == selected_profile_id).first()
        if prof:
            profile_name = prof.name

    return ProjectSummaryResponse(
        id=project.id,
        channel_id=project.channel_id,
        title=project.title,
        stage=project.stage,
        aspect_ratio=project.aspect_ratio,
        profile_id=project.profile_id,
        profile_name=profile_name,
        shot_count=0,
        duration_s=0.0,
        updated_at=project.updated_at.isoformat(),
    )

@router.patch("/{project_id}", response_model=ProjectSummaryResponse)
def update_project(project_id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.title is not None:
        project.title = data.title
    if data.stage is not None:
        project.stage = data.stage
    if data.aspect_ratio is not None:
        project.aspect_ratio = data.aspect_ratio
    if data.profile_id is not None:
        project.profile_id = data.profile_id
    if data.config_override is not None:
        project.config_override = data.config_override

    db.commit()
    db.refresh(project)

    profile_name = None
    if project.profile_id:
        prof = db.query(Profile).filter(Profile.id == project.profile_id).first()
        if prof:
            profile_name = prof.name

    summary = project.summary_cache or {}
    return ProjectSummaryResponse(
        id=project.id,
        channel_id=project.channel_id,
        title=project.title,
        stage=project.stage,
        aspect_ratio=project.aspect_ratio,
        profile_id=project.profile_id,
        profile_name=profile_name,
        shot_count=summary.get("shot_count", 0),
        duration_s=summary.get("duration_s", 0.0),
        updated_at=project.updated_at.isoformat() if project.updated_at else "",
    )


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    channel_id = project.channel_id
    db.delete(project)
    db.commit()

    # Remove on-disk directory safely
    p_dir = get_project_dir(channel_id, project_id)
    if p_dir.exists():
        shutil.rmtree(p_dir, ignore_errors=True)

    return {"status": "deleted", "id": project_id}
