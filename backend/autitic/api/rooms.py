"""Rooms API Router: Decoupled Stage Execution & Granular Redo with Versioning."""

from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Project, Profile
from ..rooms import get_project_dir
from ..rooms.room_service import RoomService

router = APIRouter(prefix="/projects/{project_id}/rooms", tags=["Rooms Pipeline"])

def get_project_and_profile(project_id: str, db: Session) -> tuple[Project, Dict[str, Any]]:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    profile_dict = {}
    if project.profile_id:
        prof = db.query(Profile).filter(Profile.id == project.profile_id).first()
        if prof:
            profile_dict = {
                "script_config": prof.script_config or {},
                "tts_config": prof.tts_config or {},
                "cut_config": prof.cut_config or {},
                "image_motion_config": prof.image_motion_config or {},
                "render_config": prof.render_config or {},
            }

    # Merge ad-hoc project overrides
    if project.config_override:
        for k, v in project.config_override.items():
            if k in profile_dict and isinstance(v, dict):
                profile_dict[k].update(v)
            else:
                profile_dict[k] = v

    return project, profile_dict

@router.get("/artifacts")
def get_project_artifacts(project_id: str, db: Session = Depends(get_db)):
    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    state = RoomService.get_state(p_dir)
    return {
        "idea": RoomService.read_artifact(p_dir, "idea.json"),
        "story": RoomService.read_artifact(p_dir, "story.json"),
        "script": RoomService.read_artifact(p_dir, "script.json"),
        "timings": RoomService.read_artifact(p_dir, "timings.json"),
        "shots": RoomService.read_artifact(p_dir, "shots.json"),
        "images": RoomService.read_artifact(p_dir, "images_manifest.json") or [],
        "motion": RoomService.read_artifact(p_dir, "motion_plan.json") or {},
        "state": state,
        "versions": {
            "idea": RoomService.get_versions(p_dir, "idea"),
            "story": RoomService.get_versions(p_dir, "story"),
            "script": RoomService.get_versions(p_dir, "script"),
            "cut": RoomService.get_versions(p_dir, "shots"),
        },
    }

# ROOM 1 (TIER 1): IDEA
@router.post("/idea")
async def save_or_build_idea(
    project_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    project, profile_cfg = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    idea_data = await RoomService.build_idea(p_dir, payload, profile_cfg)
    project.stage = "idea"
    db.commit()
    return idea_data

# ROOM 1 (TIER 2): STORY TREATMENT
@router.post("/story")
async def build_story(
    project_id: str,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    db: Session = Depends(get_db),
):
    project, profile_cfg = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    story_data = await RoomService.build_story(p_dir, payload, profile_cfg)
    project.stage = "story"
    db.commit()
    return story_data

@router.put("/story")
def save_story_edits(
    project_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)
    return RoomService.save_story(p_dir, payload)

# ROOM 1 (TIER 3): SCRIPT & BEATS
@router.post("/script")
async def build_script(
    project_id: str,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    db: Session = Depends(get_db),
):
    project, profile_cfg = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    # If payload is just {"topic": "..."} convert to idea/story
    if payload and "topic" in payload and "beats" not in payload:
        idea_payload = {"premise": payload["topic"], "target_seconds": 60}
        await RoomService.build_idea(p_dir, idea_payload, profile_cfg)
        await RoomService.build_story(p_dir, None, profile_cfg)
        script_data = await RoomService.build_script(p_dir, None, profile_cfg)
    else:
        script_data = await RoomService.build_script(p_dir, payload, profile_cfg)

    project.stage = "script"
    db.commit()
    return script_data

@router.put("/script")
def save_script_edits(
    project_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)
    return RoomService.save_script(p_dir, payload)

# VERSION SWITCHER
@router.post("/{step}/versions/{version}/select")
def select_room_version(
    project_id: str,
    step: str,
    version: str,
    db: Session = Depends(get_db),
):
    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    step_name = "shots" if step == "cut" else step
    ok = RoomService.set_active_version(p_dir, step_name, version)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Version {version} not found for {step}")
    return {"status": "ok", "step": step, "active_version": version}

# ROOM 2: VOICE & AUDIO
@router.post("/voice")
async def build_voice(
    project_id: str,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    db: Session = Depends(get_db),
):
    project, profile_cfg = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    payload = payload or {}
    timings = await RoomService.build_voice(
        p_dir,
        profile_cfg,
        voice_id=payload.get("voice_id"),
        speed=payload.get("speed"),
        pitch=payload.get("pitch"),
        bgm_mood=payload.get("bgm_mood"),
        bgm_volume=payload.get("bgm_volume"),
    )
    project.stage = "voice"
    db.commit()
    return timings

# ROOM 3: THE CUT
@router.post("/cut")
def build_cut(
    project_id: str,
    energy: Optional[str] = Body(default=None, embed=True),
    db: Session = Depends(get_db),
):
    project, profile_cfg = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    cut_data = RoomService.build_cut(p_dir, profile_cfg, energy=energy)
    project.stage = "cut"
    project.summary_cache = {
        "shot_count": cut_data.get("shot_count", 0),
        "duration_s": cut_data.get("duration", 0.0),
    }
    db.commit()
    return cut_data

@router.put("/cut")
def save_cut_edits(
    project_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)
    return RoomService.save_cut(p_dir, payload)

# ROOM 4: SHOT IMAGES
@router.post("/images")
async def build_images(
    project_id: str,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    db: Session = Depends(get_db),
):
    project, profile_cfg = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    payload = payload or {}
    engine = payload.get("engine", "local")
    model = payload.get("model", "animagine-xl" if engine == "local" else "z-image-turbo")
    colab_url = payload.get("colab_url")

    try:
        results = await RoomService.build_images(
            p_dir,
            profile_cfg,
            engine=engine,
            model=model,
            colab_url=colab_url,
        )
    except Exception as err:
        raise HTTPException(status_code=502 if engine == "colab" else 400, detail=str(err))

    project.stage = "images"
    db.commit()
    return results

# ROOM 4 SINGLE RE-ROLL
@router.post("/images/{index}/reroll")
async def reroll_single_image(
    project_id: str,
    index: int,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    db: Session = Depends(get_db),
):
    project, profile_cfg = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    payload = payload or {}
    engine = payload.get("engine", "local")
    model = payload.get("model", "animagine-xl" if engine == "local" else "z-image-turbo")
    colab_url = payload.get("colab_url")

    try:
        results = await RoomService.build_images(
            p_dir,
            profile_cfg,
            only_index=index,
            engine=engine,
            model=model,
            colab_url=colab_url,
        )
    except Exception as err:
        raise HTTPException(status_code=502 if engine == "colab" else 400, detail=str(err))

    # Find the specific shot result
    for r in results:
        if r.get("index") == index:
            return r
    return results[0] if results else {}

# ROOM 4 CUSTOM IMAGE UPLOAD
@router.post("/images/{index}/upload")
async def upload_shot_image(
    project_id: str,
    index: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)
    contents = await file.read()
    res = RoomService.save_shot_image(p_dir, index, contents)
    return res

# ROOM 5: MOTION (2.5D Parallax vs Wan2GP)
@router.post("/motion")
async def build_motion(project_id: str, db: Session = Depends(get_db)):
    project, profile_cfg = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    motion_data = await RoomService.build_motion(p_dir, profile_cfg)
    project.stage = "motion"
    db.commit()
    return motion_data

# ROOM 6: ASSEMBLY & RENDER
@router.post("/render")
def render_video(
    project_id: str,
    note: str = Body(default="", embed=True),
    db: Session = Depends(get_db),
):
    project, profile_cfg = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    render_result = RoomService.build_render(p_dir, profile_cfg)
    project.stage = "ready"
    db.commit()
    return render_result

# SERVE SYNTHESIZED AUDIO (Master Mix or Raw Voice)
@router.get("/audio")
def get_synthesized_audio(
    project_id: str,
    download: bool = False,
    take_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    from fastapi.responses import FileResponse
    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    target_file = None
    if take_id:
        take_f = p_dir / "takes" / f"{take_id}.mp3"
        if not take_f.exists():
            take_f = p_dir / "takes" / f"take_{take_id}.mp3"
        if take_f.exists():
            target_file = take_f

    if not target_file:
        master_mp3 = p_dir / "vo_master.mp3"
        if master_mp3.exists() and master_mp3.stat().st_size > 0:
            target_file = master_mp3
        elif (p_dir / "vo.mp3").exists():
            target_file = p_dir / "vo.mp3"
        elif (p_dir / "vo.wav").exists():
            target_file = p_dir / "vo.wav"

    if not target_file or not target_file.exists():
        raise HTTPException(status_code=404, detail="Synthesized audio not found for this project")

    media_type = "audio/wav" if target_file.suffix.lower() == ".wav" else "audio/mpeg"
    if download:
        return FileResponse(
            str(target_file),
            media_type=media_type,
            filename=f"{project.title or 'voiceover'}_master.mp3",
            content_disposition_type="attachment",
        )
    return FileResponse(
        str(target_file),
        media_type=media_type,
        content_disposition_type="inline",
    )

# LIST AUDIO TAKES / HISTORY
@router.get("/audio/takes")
def get_audio_takes(project_id: str, db: Session = Depends(get_db)):
    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)
    return RoomService.get_audio_takes(p_dir)

# RESTORE A PREVIOUS AUDIO TAKE
@router.post("/audio/takes/{take_id}/restore")
def restore_audio_take(project_id: str, take_id: str, db: Session = Depends(get_db)):
    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)
    try:
        return RoomService.restore_audio_take(p_dir, take_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# SERVE RENDERED FINAL VIDEO
@router.get("/video")
def get_rendered_video(project_id: str, download: bool = False, db: Session = Depends(get_db)):
    from fastapi.responses import FileResponse
    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)

    renders_dir = p_dir / "renders"
    if renders_dir.exists():
        mp4s = sorted(renders_dir.glob("*.mp4"), key=lambda f: f.stat().st_mtime, reverse=True)
        if mp4s and mp4s[0].exists() and mp4s[0].stat().st_size > 0:
            if download:
                return FileResponse(
                    str(mp4s[0]),
                    media_type="video/mp4",
                    filename=f"{project.title or 'video'}.mp4",
                    content_disposition_type="attachment",
                )
            return FileResponse(
                str(mp4s[0]),
                media_type="video/mp4",
                content_disposition_type="inline",
            )

    raise HTTPException(status_code=404, detail="Rendered video not found for this project")

# SERVE ROOM MEDIA ASSETS (images, depth maps, renders)
@router.get("/media/{folder}/{filename}")
def get_room_media(project_id: str, folder: str, filename: str, db: Session = Depends(get_db)):
    from fastapi.responses import FileResponse
    if folder not in {"images", "depths", "renders"}:
        raise HTTPException(status_code=400, detail="Invalid media folder")

    project, _ = get_project_and_profile(project_id, db)
    p_dir = get_project_dir(project.channel_id, project.id)
    target_file = p_dir / folder / filename

    if not target_file.exists():
        raise HTTPException(status_code=404, detail="Media file not found")

    ext = target_file.suffix.lower()
    media_type = "image/png" if ext == ".png" else ("image/jpeg" if ext in {".jpg", ".jpeg"} else "video/mp4")
    return FileResponse(str(target_file), media_type=media_type)

