"""Autitic Studio API Application."""

from __future__ import annotations

import os
import logging

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import engine, Base, SessionLocal
from .models import User, Channel, Profile, Project
from .api import channels, profiles, projects, rooms, settings

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("autitic")

# Create tables
Base.metadata.create_all(bind=engine)

# Seed baseline channel & profile if empty
def seed_database():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            user = User(id="usr_admin", email="creator@autitic.ai", password_hash="admin")
            db.add(user)
            db.commit()

        channel = db.query(Channel).first()
        if not channel:
            channel = Channel(
                id="chn_fables",
                user_id="usr_admin",
                name="Tales & Moral Fables",
                slug="tales-moral-fables",
                color="emerald",
            )
            db.add(channel)
            db.commit()

            default_profile = Profile(
                id="prf_cinematic_fable",
                channel_id=channel.id,
                name="Cinematic Fable 2.5D (Default)",
                is_default=True,
                script_config={
                    "persona": "Warm Storyteller & Folklorist",
                    "style": "cinematic, engaging, high retention",
                    "tone": "playful, witty, cinematic fable",
                    "target_audience": "Kids and families",
                    "pattern": "fable",
                    "target_duration_s": 60,
                    "beat_target": 5,
                },
                tts_config={
                    "voice_id": "en-US-ChristopherNeural",
                    "speed": 1.05,
                    "pitch": 0,
                    "volume": 1.0,
                },
                cut_config={
                    "energy": "normal",
                    "pacing_cadence": 3.0,
                },
                image_motion_config={
                    "model": "Animagine XL 4.0 Lightning (4-step low-VRAM)",
                    "motion_mode": "parallax_2.5d",
                    "style_prefix": "cinematic detailed fable illustration, warm storybook lighting, vibrant masterwork",
                    "negative_prompt": "low quality, blurry, watermark, deformed, bad anatomy, text",
                    "steps": 4,
                    "guidance_scale": 2.0,
                    "trajectory": "push_in",
                    "zoom_factor": 1.15,
                },
                render_config={
                    "aspect_ratio": "9:16",
                    "resolution": "1080x1920",
                    "fps": 30,
                    "subtitle_style": "cinematic_yellow",
                },
            )
            db.add(default_profile)
            channel.default_profile_id = default_profile.id
            db.commit()

        # Ensure all calibrated creator profiles exist for the channel
        creator_profiles = [
            {
                "id": "prf_johnny_harris",
                "name": "Johnny Harris (Investigative Documentary)",
                "script_config": {
                    "persona": "Investigative Visual Journalist & Geopolitical Analyst",
                    "style": "fast-paced investigative documentary, map transitions, bold contrast, urgent questions",
                    "tone": "analytical, urgent, serious yet conversational",
                    "target_audience": "Curious global thinkers and documentary viewers",
                    "pattern": "johnny_harris",
                    "target_duration_s": 60,
                    "beat_target": 6,
                },
                "tts_config": {
                    "voice_id": "en-US-GuyNeural",
                    "speed": 1.12,
                    "pitch": -1,
                    "volume": 1.0,
                },
                "cut_config": {"energy": "high", "pacing_cadence": 2.2},
                "image_motion_config": {
                    "model": "Animagine XL 4.0 Lightning (4-step low-VRAM)",
                    "motion_mode": "parallax_2.5d",
                    "style_prefix": "journalistic documentary visual, high contrast, cinematic chiaroscuro, desaturated filmic grain, subtle map graphic elements, professional editorial cinematography",
                    "negative_prompt": "low quality, blurry, watermark, cartoonish, oversaturated, text, deformed",
                    "steps": 4,
                    "guidance_scale": 1.8,
                    "trajectory": "push_in",
                    "zoom_factor": 1.25,
                },
                "render_config": {
                    "aspect_ratio": "16:9",
                    "resolution": "1920x1080",
                    "fps": 30,
                    "subtitle_style": "cinematic_yellow",
                },
            },
            {
                "id": "prf_veritasium",
                "name": "Veritasium (Scientific Inquiry & Paradox)",
                "script_config": {
                    "persona": "Contemplative Scientific Truth-Seeker",
                    "style": "counter-intuitive scientific hook, thought experiment, slow-burn revelation",
                    "tone": "intellectually curious, thoughtful, contemplative, accessible",
                    "target_audience": "Science enthusiasts, students, and curious minds",
                    "pattern": "veritasium",
                    "target_duration_s": 60,
                    "beat_target": 5,
                },
                "tts_config": {
                    "voice_id": "en-US-ChristopherNeural",
                    "speed": 1.02,
                    "pitch": 0,
                    "volume": 1.0,
                },
                "cut_config": {"energy": "normal", "pacing_cadence": 3.2},
                "image_motion_config": {
                    "model": "Animagine XL 4.0 Lightning (4-step low-VRAM)",
                    "motion_mode": "parallax_2.5d",
                    "style_prefix": "scientific cinematic realism, dramatic laboratory lighting, optical physics aesthetics, elegant minimalist depth, 8k resolution, documentary photography",
                    "negative_prompt": "low quality, blurry, fantasy, cartoon, watermark, noisy, text",
                    "steps": 4,
                    "guidance_scale": 2.0,
                    "trajectory": "orbit",
                    "zoom_factor": 1.15,
                },
                "render_config": {
                    "aspect_ratio": "16:9",
                    "resolution": "1920x1080",
                    "fps": 30,
                    "subtitle_style": "clean_white",
                },
            },
            {
                "id": "prf_jenny_hoyos",
                "name": "Jenny Hoyos (Ultra-Retention Viral Short)",
                "script_config": {
                    "persona": "Ultra-Retention Viral Short-Form Master",
                    "style": "sub-1-second visual hook, relentless rapid pacing, physical challenge, instant payoff",
                    "tone": "high energy, enthusiastic, punchy, hyper-retention",
                    "target_audience": "Social media shorts viewers, Gen-Z, general audiences",
                    "pattern": "jenny_hoyos",
                    "target_duration_s": 40,
                    "beat_target": 6,
                },
                "tts_config": {
                    "voice_id": "en-US-JennyNeural",
                    "speed": 1.20,
                    "pitch": 1,
                    "volume": 1.0,
                },
                "cut_config": {"energy": "frantic", "pacing_cadence": 1.5},
                "image_motion_config": {
                    "model": "Animagine XL 4.0 Lightning (4-step low-VRAM)",
                    "motion_mode": "parallax_2.5d",
                    "style_prefix": "bright punchy commercial photography, saturated vibrant colors, wide-angle POV, clean studio lighting, high energy, viral social media aesthetic",
                    "negative_prompt": "dark, gloomy, low quality, blurry, grainy, deformed",
                    "steps": 4,
                    "guidance_scale": 2.2,
                    "trajectory": "push_in",
                    "zoom_factor": 1.30,
                },
                "render_config": {
                    "aspect_ratio": "9:16",
                    "resolution": "1080x1920",
                    "fps": 30,
                    "subtitle_style": "bold_box",
                },
            },
            {
                "id": "prf_zack_d_films",
                "name": "Zack D. Films (3D Anatomical Explainer)",
                "script_config": {
                    "persona": "Morbid Curiosity & 3D Mechanical/Anatomical Explainer",
                    "style": "hypnotic curiosity hook, cross-sectional anatomy/mechanics, continuous push-in camera, clinical precision",
                    "tone": "clinical, hypnotic, morbid curiosity, crisp articulation",
                    "target_audience": "Short-form explainer viewers, curious minds",
                    "pattern": "zack_d_films",
                    "target_duration_s": 35,
                    "beat_target": 5,
                },
                "tts_config": {
                    "voice_id": "en-US-BrianNeural",
                    "speed": 1.05,
                    "pitch": -1,
                    "volume": 1.0,
                },
                "cut_config": {"energy": "high", "pacing_cadence": 2.5},
                "image_motion_config": {
                    "model": "Animagine XL 4.0 Lightning (4-step low-VRAM)",
                    "motion_mode": "parallax_2.5d",
                    "style_prefix": "hyper-realistic 3D medical animation render, octane render 8k, cross-section anatomical cutaway, dramatic rim lighting, clinical medical aesthetic, unreal engine 5 render",
                    "negative_prompt": "2D flat, low quality, blurry, cartoon, sketch, watermark",
                    "steps": 4,
                    "guidance_scale": 2.0,
                    "trajectory": "push_in",
                    "zoom_factor": 1.35,
                },
                "render_config": {
                    "aspect_ratio": "9:16",
                    "resolution": "1080x1920",
                    "fps": 30,
                    "subtitle_style": "clean_white",
                },
            },
        ]

        for cp in creator_profiles:
            existing = db.query(Profile).filter(Profile.id == cp["id"]).first()
            if not existing:
                prof = Profile(
                    id=cp["id"],
                    channel_id=channel.id,
                    name=cp["name"],
                    is_default=False,
                    script_config=cp["script_config"],
                    tts_config=cp["tts_config"],
                    cut_config=cp["cut_config"],
                    image_motion_config=cp["image_motion_config"],
                    render_config=cp["render_config"],
                )
                db.add(prof)
        db.commit()

        # Ensure Hat Seller Project exists
        hat_seller_project = db.query(Project).filter(Project.id == "prj_hat_seller").first()
        if not hat_seller_project:
            hat_seller_project = Project(
                id="prj_hat_seller",
                channel_id=channel.id,
                profile_id=channel.default_profile_id,
                title="The Hat Seller and the Monkeys",
                stage="script",
                aspect_ratio="9:16",
            )
            db.add(hat_seller_project)
            db.commit()
            log.info("Initialized default Channel, Profiles, and Hat Seller project.")
    finally:
        db.close()


seed_database()

app = FastAPI(
    title="Autitic Studio API",
    description="Scalable Multi-Channel Video Production Studio with Decoupled Pipelines",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(channels.router)
app.include_router(profiles.router)
app.include_router(projects.router)
app.include_router(rooms.router)
app.include_router(settings.router)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": "Autitic Studio",
        "version": "0.1.0",
        "local_default_image_model": "Animagine XL 4.0 Lightning (4-step low-VRAM)",
        "remote_acceleration": "Google Colab Wan2GP Bridge",
    }

from pathlib import Path
from fastapi.staticfiles import StaticFiles

dist_path = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="static")

def dev():
    import uvicorn
    uvicorn.run("autitic.main:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    dev()
