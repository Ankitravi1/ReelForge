import pytest
from fastapi.testclient import TestClient
from autitic.main import app

client = TestClient(app)

def test_dual_engine_image_pipeline():
    channels = client.get("/channels").json()
    channel_id = channels[0]["id"]

    p_res = client.post("/projects", json={
        "title": "Dual Engine Test Project",
        "channel_id": channel_id,
        "aspect_ratio": "9:16",
    })
    assert p_res.status_code == 200
    project_id = p_res.json()["id"]

    # Room 1: Idea -> Story -> Script
    client.post(f"/projects/{project_id}/rooms/idea", json={
        "premise": "A quick test fable",
        "tone": "playful",
        "scene_count": 2,
    })
    client.post(f"/projects/{project_id}/rooms/story", json=None)
    client.post(f"/projects/{project_id}/rooms/script", json=None)

    # Room 2 & 3: Voice & Cut
    client.post(f"/projects/{project_id}/rooms/voice")
    client.post(f"/projects/{project_id}/rooms/cut")

    # Room 4: Local Engine Image Generation
    img_res = client.post(f"/projects/{project_id}/rooms/images", json={
        "engine": "local",
        "model": "animagine-xl",
    })
    assert img_res.status_code == 200
    images = img_res.json()
    assert len(images) > 0
    assert images[0]["engine"] == "local"
    assert images[0]["exists"] is True

    # Room 4: Re-roll single shot with Local Engine
    reroll_res = client.post(f"/projects/{project_id}/rooms/images/1/reroll", json={
        "engine": "local",
    })
    assert reroll_res.status_code == 200
    r_item = reroll_res.json()
    assert r_item["index"] == 1
    assert r_item["engine"] == "local"

    # Colab Bridge Health Ping (offline check)
    ping_res = client.post("/settings/colab/test", json={
        "url": "https://offline-test-tunnel.trycloudflare.com",
    })
    assert ping_res.status_code == 200
    assert ping_res.json()["online"] is False

    # Colab Generation Failure reporting when tunnel is offline
    colab_gen = client.post(f"/projects/{project_id}/rooms/images", json={
        "engine": "colab",
        "colab_url": "https://offline-test-tunnel.trycloudflare.com",
    })
    assert colab_gen.status_code in [400, 500, 502]


