"""Comprehensive test suite for Autitic Studio API and Decoupled Rooms."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from autitic.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "Animagine XL 4.0 Lightning" in data["local_default_image_model"]

def test_channels_and_profiles():
    # 1. List channels
    res = client.get("/channels")
    assert res.status_code == 200
    channels = res.json()
    assert len(channels) >= 1
    channel_id = channels[0]["id"]

    # 2. List channel profiles
    res = client.get(f"/profiles/channel/{channel_id}")
    assert res.status_code == 200
    profiles = res.json()
    assert len(profiles) >= 1
    default_profile = profiles[0]
    assert default_profile["is_default"] is True
    assert "script_config" in default_profile
    assert "tts_config" in default_profile
    assert "cut_config" in default_profile
    assert "image_motion_config" in default_profile
    assert "render_config" in default_profile

def test_decoupled_rooms_pipeline():
    # Get default channel
    channels = client.get("/channels").json()
    channel_id = channels[0]["id"]

    # Create project
    proj_res = client.post("/projects", json={
        "title": "The Quantum Void",
        "channel_id": channel_id,
        "aspect_ratio": "9:16",
    })
    assert proj_res.status_code == 200
    project = proj_res.json()
    project_id = project["id"]

    # ROOM 1: SCRIPT
    script_res = client.post(f"/projects/{project_id}/rooms/script", json={
        "topic": "The Quantum Void Mystery",
    })
    assert script_res.status_code == 200
    script_data = script_res.json()
    assert len(script_data["beats"]) > 0

    # ROOM 2: VOICE & TIMINGS
    voice_res = client.post(f"/projects/{project_id}/rooms/voice")
    assert voice_res.status_code == 200
    voice_data = voice_res.json()
    assert "words" in voice_data

    # ROOM 3: THE CUT
    cut_res = client.post(f"/projects/{project_id}/rooms/cut", json={
        "energy": "high",
    })
    assert cut_res.status_code == 200
    cut_data = cut_res.json()
    assert len(cut_data["shots"]) > 0
    assert cut_data["energy"] == "high"

    # ROOM 4: SHOT IMAGES
    images_res = client.post(f"/projects/{project_id}/rooms/images")
    assert images_res.status_code == 200
    images_data = images_res.json()
    assert len(images_data) > 0
    assert images_data[0]["exists"] is True

    # ROOM 4: SINGLE SHOT RE-ROLL
    reroll_res = client.post(f"/projects/{project_id}/rooms/images/1/reroll")
    assert reroll_res.status_code == 200
    assert reroll_res.json()["index"] == 1

    # ROOM 5: MOTION (2.5D PARALLAX)
    motion_res = client.post(f"/projects/{project_id}/rooms/motion")
    assert motion_res.status_code == 200
    motion_data = motion_res.json()
    assert len(motion_data["shots"]) > 0

    # ROOM 6: ASSEMBLY & RENDER
    render_res = client.post(f"/projects/{project_id}/rooms/render", json={
        "note": "Test Render v1",
    })
    assert render_res.status_code == 200
    render_data = render_res.json()
    assert render_data["version"] in ["v1", 1]

    # Verify artifacts endpoint
    art_res = client.get(f"/projects/{project_id}/rooms/artifacts")
    assert art_res.status_code == 200
    artifacts = art_res.json()
    assert artifacts["script"] is not None
    assert artifacts["timings"] is not None
    assert artifacts["shots"] is not None
    assert len(artifacts["images"]) > 0

def test_profile_cloning():
    channels = client.get("/channels").json()
    channel_id = channels[0]["id"]
    profiles = client.get(f"/profiles/channel/{channel_id}").json()
    default_prof = profiles[0]

    # Clone the profile
    clone_res = client.post(f"/profiles/{default_prof['id']}/clone", params={"new_name": "Fable Storyteller"})
    assert clone_res.status_code == 200
    cloned = clone_res.json()
    assert cloned["name"] == "Fable Storyteller"
    assert cloned["is_default"] is False
    assert cloned["script_config"] == default_prof["script_config"]

def test_hat_seller_pipeline():
    channels = client.get("/channels").json()
    channel_id = channels[0]["id"]

    # 1. Create project for Hat Seller
    p_res = client.post("/projects", json={
        "title": "The Hat Seller and the Monkeys",
        "channel_id": channel_id,
        "aspect_ratio": "9:16",
    })
    assert p_res.status_code == 200
    project_id = p_res.json()["id"]

    # 2. Room 1 Tier 1: Submit Idea
    idea_res = client.post(f"/projects/{project_id}/rooms/idea", json={
        "premise": "A hat seller takes a nap under a tree. Monkeys take all his hats. He throws his own hat down in frustration, and the monkeys copy him and throw all the hats back.",
        "target_seconds": 60,
        "pattern": "fable",
        "audience": "Kids and families",
    })
    assert idea_res.status_code == 200
    assert idea_res.json()["version"] == "v1"

    # 3. Room 1 Tier 2: Generate Story Treatment
    story_res = client.post(f"/projects/{project_id}/rooms/story")
    assert story_res.status_code == 200
    story = story_res.json()
    assert len(story["title"]) > 0
    assert len(story["arc"]) >= 3
    assert story["version"] == "v1"

    # 4. Room 1 Tier 3: Generate Script & Beats
    script_res = client.post(f"/projects/{project_id}/rooms/script")
    assert script_res.status_code == 200
    script = script_res.json()
    assert len(script["beats"]) >= 3
    first_beat = script["beats"][0]
    assert "purpose" in first_beat
    assert "vo" in first_beat
    assert "visual_note" in first_beat
    assert script["version"] == "v1"

    # 5. Redo script generation to test version v2
    script_v2_res = client.post(f"/projects/{project_id}/rooms/script")
    assert script_v2_res.status_code == 200
    assert script_v2_res.json()["version"] == "v2"

    # 6. Switch back to v1
    select_res = client.post(f"/projects/{project_id}/rooms/script/versions/v1/select")
    assert select_res.status_code == 200
    assert select_res.json()["active_version"] == "v1"

def test_settings_and_models():
    # 1. Model inventory
    models_res = client.get("/settings/models")
    assert models_res.status_code == 200
    models = models_res.json()
    model_names = [m["name"] for m in models]
    assert "Animagine XL 4.0 Lightning" in model_names
    assert "Faster-Whisper Base" in model_names
    assert "FLUX.1-schnell" in model_names

    # 2. Hardware report
    hw_res = client.get("/settings/hardware")
    assert hw_res.status_code == 200
    assert "platform" in hw_res.json()

    # 3. API keys and storage
    keys_res = client.get("/settings/api_keys")
    assert keys_res.status_code == 200
    assert "llm_provider" in keys_res.json()

    storage_res = client.get("/settings/storage")
    assert storage_res.status_code == 200
    assert "disk_free_gb" in storage_res.json()

    # 4. Colab bridge test
    colab_res = client.post("/settings/colab/test", json={
        "url": "https://autitic-wan2gp.trycloudflare.com",
    })
    assert colab_res.status_code == 200
    assert colab_res.json()["online"] is True

def test_frontend_static_serving():
    res = client.get("/")
    assert res.status_code == 200
    assert "Autitic Studio" in res.text
