"""Unified Room Pipeline Service: Manages on-disk artifacts and granular step redo with versioning."""

from __future__ import annotations

import json
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from ..providers.tts_supertonic import synthesize_voice
from ..providers.stt_whisper import align_audio_words
from ..providers.image_animagine import generate_animagine_image
from ..providers.colab_wan2gp import dispatch_colab_image_generation
from ..providers.depth_parallax import estimate_depth_map, plan_2_5d_motion
from ..providers.llm import generate_story_from_idea, generate_script_from_story, generate_visual_prompts_for_shots
from ..providers.ffmpeg_renderer import mix_master_audio, assemble_final_video, generate_subtitles_srt
from . import get_project_dir

class RoomService:
    @staticmethod
    def get_state(project_dir: Path) -> Dict[str, Any]:
        state_path = project_dir / "state.json"
        if state_path.exists():
            try:
                return json.loads(state_path.read_text(encoding="utf-8"))
            except Exception:
                pass
        return {"active_versions": {}}

    @staticmethod
    def save_state(project_dir: Path, state: Dict[str, Any]) -> None:
        state_path = project_dir / "state.json"
        state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")

    @staticmethod
    def get_versions(project_dir: Path, step: str) -> List[str]:
        versions = []
        for f in project_dir.glob(f"{step}_v*.json"):
            parts = f.stem.split("_")
            if len(parts) >= 2 and parts[-1].startswith("v"):
                versions.append(parts[-1])
        return sorted(versions, key=lambda v: int(v[1:]) if v[1:].isdigit() else 0)

    @staticmethod
    def next_version(project_dir: Path, step: str) -> str:
        versions = RoomService.get_versions(project_dir, step)
        if not versions:
            return "v1"
        nums = [int(v[1:]) for v in versions if v[1:].isdigit()]
        return f"v{max(nums) + 1 if nums else 1}"

    @classmethod
    def set_active_version(cls, project_dir: Path, step: str, version: str) -> bool:
        ver_file = project_dir / f"{step}_{version}.json"
        if not ver_file.exists():
            return False
        shutil.copyfile(ver_file, project_dir / f"{step}.json")
        state = cls.get_state(project_dir)
        state.setdefault("active_versions", {})[step] = version
        cls.save_state(project_dir, state)
        return True

    @staticmethod
    def read_artifact(project_dir: Path, filename: str) -> Optional[Dict[str, Any]]:
        path = project_dir / filename
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                pass
        return None

    @classmethod
    def write_versioned_artifact(cls, project_dir: Path, step: str, data: Any) -> tuple[str, Path]:
        project_dir.mkdir(parents=True, exist_ok=True)
        version = cls.next_version(project_dir, step)
        ver_path = project_dir / f"{step}_{version}.json"
        ver_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        # Also mirror to default filename
        (project_dir / f"{step}.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
        # Update active version in state
        state = cls.get_state(project_dir)
        state.setdefault("active_versions", {})[step] = version
        cls.save_state(project_dir, state)
        return version, ver_path

    # ROOM 1: 3-TIER AUTHORING (IDEA -> STORY -> SCRIPT)
    @classmethod
    async def build_idea(cls, project_dir: Path, idea_data: Dict[str, Any], profile_cfg: Dict[str, Any]) -> Dict[str, Any]:
        version, _ = cls.write_versioned_artifact(project_dir, "idea", idea_data)
        idea_data["version"] = version
        idea_data["available_versions"] = cls.get_versions(project_dir, "idea")
        return idea_data

    @classmethod
    async def build_story(cls, project_dir: Path, story_input: Optional[Dict[str, Any]], profile_cfg: Dict[str, Any]) -> Dict[str, Any]:
        # If user supplies direct story, save it; otherwise generate from active idea
        if story_input and story_input.get("arc") and len(story_input["arc"]) > 0:
            story_data = story_input
        else:
            idea_data = cls.read_artifact(project_dir, "idea.json") or {}
            if not idea_data and story_input:
                idea_data = story_input
            story_data = await generate_story_from_idea(
                idea=idea_data,
                script_config=profile_cfg.get("script_config", {}),
            )

        version, _ = cls.write_versioned_artifact(project_dir, "story", story_data)
        story_data["version"] = version
        story_data["available_versions"] = cls.get_versions(project_dir, "story")
        return story_data

    @classmethod
    def save_story(cls, project_dir: Path, story_data: Dict[str, Any]) -> Dict[str, Any]:
        version, _ = cls.write_versioned_artifact(project_dir, "story", story_data)
        story_data["version"] = version
        story_data["available_versions"] = cls.get_versions(project_dir, "story")
        return story_data

    @classmethod
    async def build_script(cls, project_dir: Path, script_input: Optional[Dict[str, Any]], profile_cfg: Dict[str, Any]) -> Dict[str, Any]:
        # If user supplies direct beats, save it; otherwise generate from active story
        if script_input and script_input.get("beats") and len(script_input["beats"]) > 0:
            script_data = script_input
        else:
            story_data = cls.read_artifact(project_dir, "story.json")
            if not story_data:
                # If no story yet, create story from idea first
                story_data = await cls.build_story(project_dir, None, profile_cfg)
            script_data = await generate_script_from_story(
                story=story_data,
                script_config=profile_cfg.get("script_config", {}),
            )

        version, _ = cls.write_versioned_artifact(project_dir, "script", script_data)
        script_data["version"] = version
        script_data["available_versions"] = cls.get_versions(project_dir, "script")
        return script_data

    @classmethod
    def save_script(cls, project_dir: Path, script_data: Dict[str, Any]) -> Dict[str, Any]:
        version, _ = cls.write_versioned_artifact(project_dir, "script", script_data)
        script_data["version"] = version
        script_data["available_versions"] = cls.get_versions(project_dir, "script")
        return script_data

    # ROOM 2: VOICE & AUDIO
    @classmethod
    async def build_voice(
        cls,
        project_dir: Path,
        profile_cfg: Dict[str, Any],
        voice_id: Optional[str] = None,
        speed: Optional[float] = None,
        pitch: Optional[int] = None,
        bgm_mood: Optional[str] = None,
        bgm_volume: Optional[float] = None,
    ) -> Dict[str, Any]:
        script = cls.read_artifact(project_dir, "script.json")
        if not script:
            raise ValueError("Script not approved or found")

        # Support both 'vo' and 'text' in beats
        full_text = " ".join(
            (b.get("vo") or b.get("text", "")).strip() for b in script.get("beats", [])
        )
        tts_cfg = profile_cfg.get("tts_config", {})
        chosen_voice = voice_id or tts_cfg.get("voice_id", "en-US-ChristopherNeural")
        chosen_speed = speed if speed is not None else tts_cfg.get("speed", 1.05)
        chosen_pitch = pitch if pitch is not None else tts_cfg.get("pitch", 0)

        mp3_path = project_dir / "vo.mp3"
        wav_path = project_dir / "vo.wav"
        master_path = project_dir / "vo_master.mp3"

        await synthesize_voice(
            text=full_text,
            output_path=mp3_path,
            voice_id=chosen_voice,
            speed=chosen_speed,
            pitch=chosen_pitch,
        )
        if mp3_path.exists() and not wav_path.exists():
            shutil.copyfile(mp3_path, wav_path)

        timings = align_audio_words(mp3_path, reference_text=full_text)
        timings["voice_id"] = chosen_voice
        timings["speed"] = chosen_speed
        timings["pitch"] = chosen_pitch
        timings["full_text"] = full_text
        timings["bgm_mood"] = bgm_mood or "none"
        timings["bgm_volume"] = bgm_volume if bgm_volume is not None else 0.0

        # Mix master audio with BGM if requested
        if bgm_mood and bgm_mood.lower() != "none":
            mix_master_audio(
                vo_path=mp3_path,
                output_master_path=master_path,
                bgm_mood=bgm_mood,
                bgm_volume=bgm_volume if bgm_volume is not None else 0.15,
            )
        else:
            if mp3_path.exists():
                shutil.copyfile(mp3_path, master_path)

        # Generate subtitles
        generate_subtitles_srt(timings.get("words", []), project_dir / "subtitles.srt")

        version, _ = cls.write_versioned_artifact(project_dir, "timings", timings)
        timings["version"] = version
        timings["available_versions"] = cls.get_versions(project_dir, "timings")

        # Save audio file to takes archive for full version history
        takes_dir = project_dir / "takes"
        takes_dir.mkdir(parents=True, exist_ok=True)
        take_mp3_path = takes_dir / f"take_{version}.mp3"
        if master_path.exists():
            shutil.copyfile(master_path, take_mp3_path)

        manifest_file = takes_dir / "takes_manifest.json"
        takes_list = []
        if manifest_file.exists():
            try:
                takes_list = json.loads(manifest_file.read_text(encoding="utf-8"))
            except Exception:
                pass
        takes_list.append({
            "version": version,
            "take_id": f"take_{version}",
            "created_at": datetime.utcnow().isoformat(),
            "voice_id": chosen_voice,
            "speed": chosen_speed,
            "pitch": chosen_pitch,
            "duration": timings.get("duration", 0),
            "words_count": len(timings.get("words", [])),
            "bgm_mood": bgm_mood or "none",
            "bgm_volume": bgm_volume if bgm_volume is not None else 0.0,
            "file": f"take_{version}.mp3",
        })
        manifest_file.write_text(json.dumps(takes_list, indent=2), encoding="utf-8")
        timings["takes"] = takes_list

        return timings

    @classmethod
    def get_audio_takes(cls, project_dir: Path) -> List[Dict[str, Any]]:
        takes_dir = project_dir / "takes"
        manifest_file = takes_dir / "takes_manifest.json"
        if manifest_file.exists():
            try:
                return json.loads(manifest_file.read_text(encoding="utf-8"))
            except Exception:
                pass
        return []

    @classmethod
    def restore_audio_take(cls, project_dir: Path, version: str) -> Dict[str, Any]:
        takes_dir = project_dir / "takes"
        take_file = takes_dir / f"take_{version}.mp3"
        if not take_file.exists():
            # Try plain take_id
            take_file = takes_dir / f"{version}.mp3"
        if not take_file.exists():
            raise ValueError(f"Audio take {version} not found on disk")

        master_path = project_dir / "vo_master.mp3"
        shutil.copyfile(take_file, master_path)

        # Restore timings JSON artifact
        clean_v = version.replace("take_", "")
        cls.set_active_version(project_dir, "timings", clean_v)
        timings = cls.read_artifact(project_dir, "timings.json") or {}

        # Re-generate subtitles for the restored take
        if "words" in timings:
            generate_subtitles_srt(timings["words"], project_dir / "subtitles.srt")

        timings["version"] = clean_v
        timings["available_versions"] = cls.get_versions(project_dir, "timings")
        timings["takes"] = cls.get_audio_takes(project_dir)
        return timings

    # ROOM 3: THE CUT
    @classmethod
    def build_cut(cls, project_dir: Path, profile_cfg: Dict[str, Any], energy: Optional[str] = None) -> Dict[str, Any]:
        timings = cls.read_artifact(project_dir, "timings.json")
        if not timings:
            raise ValueError("Voice & timings must be built before cutting")

        cut_cfg = profile_cfg.get("cut_config", {})
        target_energy = energy or cut_cfg.get("energy", "normal")

        # Pacing intervals by energy
        cadence_map = {"calm": 4.5, "normal": 3.2, "high": 2.2, "frantic": 1.5}
        target_interval = cadence_map.get(target_energy, 3.0)

        words = timings.get("words", [])
        total_duration = timings.get("duration", 10.0)

        # Correlate with script visual notes if available
        script = cls.read_artifact(project_dir, "script.json") or {}
        beats = script.get("beats", [])

        shots = []
        shot_idx = 1
        current_words = []
        start_t = 0.0

        for w in words:
            current_words.append(w["word"])
            if (w["end"] - start_t) >= target_interval:
                v_note = beats[shot_idx - 1].get("visual_note", "") if (shot_idx - 1) < len(beats) else ""
                shots.append({
                    "index": shot_idx,
                    "start": round(start_t, 2),
                    "end": round(w["end"], 2),
                    "duration": round(w["end"] - start_t, 2),
                    "text": " ".join(current_words),
                    "visual_note": v_note,
                    "locked": False,
                })
                shot_idx += 1
                start_t = w["end"]
                current_words = []

        if current_words or start_t < total_duration:
            v_note = beats[shot_idx - 1].get("visual_note", "") if (shot_idx - 1) < len(beats) else ""
            shots.append({
                "index": shot_idx,
                "start": round(start_t, 2),
                "end": round(total_duration, 2),
                "duration": round(total_duration - start_t, 2),
                "text": " ".join(current_words) if current_words else "Outro scene",
                "visual_note": v_note,
                "locked": False,
            })

        # Auto-direct visual prompts for all newly cut shots
        try:
            story = cls.read_artifact(project_dir, "story.json") or {}
            img_cfg = profile_cfg.get("image_motion_config", {})
            style_prefix = img_cfg.get("style_prefix", "cinematic detailed fable art, vibrant atmosphere, masterwork")
            render_cfg = profile_cfg.get("render_config", {})
            aspect_ratio = render_cfg.get("aspect_ratio", "9:16")

            # Run AI Visual Director
            import asyncio
            # If in async loop, schedule or direct
            directed = None
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Create task or fallback
                    pass
            except Exception:
                pass
        except Exception:
            pass

        cut_data = {
            "energy": target_energy,
            "duration": total_duration,
            "shot_count": len(shots),
            "shots": shots,
        }
        version, _ = cls.write_versioned_artifact(project_dir, "shots", cut_data)
        cut_data["version"] = version
        cut_data["available_versions"] = cls.get_versions(project_dir, "shots")
        return cut_data

    @classmethod
    def save_cut(cls, project_dir: Path, cut_data: Dict[str, Any]) -> Dict[str, Any]:
        version, _ = cls.write_versioned_artifact(project_dir, "shots", cut_data)
        cut_data["version"] = version
        cut_data["available_versions"] = cls.get_versions(project_dir, "shots")
        return cut_data

    @classmethod
    async def synthesize_visual_prompts(
        cls,
        project_dir: Path,
        profile_cfg: Dict[str, Any],
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Directs rich, cinematic visual prompts and camera motions for all shots in the timeline."""
        shots_data = cls.read_artifact(project_dir, "shots.json")
        if not shots_data or not shots_data.get("shots"):
            raise ValueError("Shots timeline must exist before synthesizing visual prompts")

        story = cls.read_artifact(project_dir, "story.json") or {}
        img_cfg = profile_cfg.get("image_motion_config", {})
        style_prefix = img_cfg.get("style_prefix", "cinematic detailed fable art, vibrant atmosphere, masterwork")
        render_cfg = profile_cfg.get("render_config", {})
        aspect_ratio = render_cfg.get("aspect_ratio", "9:16")

        directed = await generate_visual_prompts_for_shots(
            story=story,
            shots=shots_data["shots"],
            style_prefix=style_prefix,
            aspect_ratio=aspect_ratio,
            api_key=api_key,
        )

        dir_map = {d["index"]: d for d in directed}
        for s in shots_data["shots"]:
            idx = s["index"]
            if idx in dir_map:
                s["visual_prompt"] = dir_map[idx]["visual_prompt"]
                s["camera_motion"] = dir_map[idx].get("camera_motion", "slow cinematic push-in")
                s["shot_type"] = dir_map[idx].get("shot_type", "medium")

        version, _ = cls.write_versioned_artifact(project_dir, "shots", shots_data)
        shots_data["version"] = version
        shots_data["available_versions"] = cls.get_versions(project_dir, "shots")
        return shots_data

    @classmethod
    def update_shot_prompt(
        cls,
        project_dir: Path,
        index: int,
        visual_prompt: str,
        camera_motion: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Updates the visual prompt and camera motion for a single shot."""
        shots_data = cls.read_artifact(project_dir, "shots.json")
        if not shots_data or not shots_data.get("shots"):
            raise ValueError("Shots timeline not found")

        updated_shot = None
        for s in shots_data["shots"]:
            if s["index"] == index:
                s["visual_prompt"] = visual_prompt
                if camera_motion:
                    s["camera_motion"] = camera_motion
                updated_shot = s
                break

        if not updated_shot:
            raise ValueError(f"Shot #{index} not found in timeline")

        cls.write_artifact_file(project_dir, "shots.json", shots_data)
        return updated_shot

    # ROOM 4: SHOT IMAGES (Animagine XL Local Default / Colab Z-Image-Turbo)
    @classmethod
    async def build_images(
        cls,
        project_dir: Path,
        profile_cfg: Dict[str, Any],
        only_index: Optional[int] = None,
        engine: str = "local",
        model: str = "animagine-xl",
        colab_url: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        shots_data = cls.read_artifact(project_dir, "shots.json")
        if not shots_data:
            raise ValueError("Shots must be cut before generating images")

        img_cfg = profile_cfg.get("image_motion_config", {})
        style_prefix = img_cfg.get("style_prefix", "cinematic detailed fable art, vibrant atmosphere, masterwork")
        negative_prompt = img_cfg.get("negative_prompt", "low quality, blurry, watermark, deformed")
        render_cfg = profile_cfg.get("render_config", {})
        aspect_ratio = render_cfg.get("aspect_ratio", "9:16")

        if aspect_ratio == "16:9":
            w, h = 1024, 576
            ar_prompt_tag = "16:9 wide landscape cinematic composition"
        else:
            w, h = 576, 1024
            ar_prompt_tag = "9:16 vertical portrait composition"

        images_dir = project_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)

        # If re-rolling a single shot, load existing manifest to preserve the other shots
        existing_manifest: Dict[int, Dict[str, Any]] = {}
        raw_manifest = cls.read_artifact(project_dir, "images_manifest.json") or []
        for item in raw_manifest:
            if isinstance(item, dict) and "index" in item:
                existing_manifest[item["index"]] = item

        results = []
        for shot in shots_data.get("shots", []):
            idx = shot["index"]
            if only_index is not None and idx != only_index:
                if idx in existing_manifest:
                    results.append(existing_manifest[idx])
                continue

            # Prioritize dedicated AI visual prompt over raw spoken narration
            visual_desc = shot.get("visual_prompt") or shot.get("visual_note") or shot.get("text", "")
            prompt = f"{visual_desc}, {style_prefix}, {ar_prompt_tag}"
            shot_img_path = images_dir / f"shot_{idx:03d}.png"

            t0 = time.time()
            if engine == "colab":
                # Hosted Colab GPU (SDXL-Turbo / Z-Image-Turbo / FLUX-schnell)
                target_model = model if model in ["z-image-turbo", "flux-schnell", "sdxl-turbo"] else "sdxl-turbo"
                await dispatch_colab_image_generation(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    output_path=shot_img_path,
                    model=target_model,
                    width=w,
                    height=h,
                    steps=4,
                    url=colab_url,
                )
            else:
                # Local Animagine XL 4.0 Lightning OpenVINO pipeline
                generate_animagine_image(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    output_path=shot_img_path,
                    width=w,
                    height=h,
                    steps=img_cfg.get("steps", 4),
                )
            elapsed_s = round(time.time() - t0, 2)

            entry = {
                "index": idx,
                "prompt": prompt,
                "visual_prompt": visual_desc,
                "camera_motion": shot.get("camera_motion", "slow cinematic push-in"),
                "engine": engine,
                "model": model if engine == "colab" else "animagine-xl-4.0",
                "path": str(shot_img_path),
                "url": f"/media/images/shot_{idx:03d}.png",
                "exists": shot_img_path.exists(),
                "duration": shot["duration"],
                "elapsed_s": elapsed_s,
            }
            results.append(entry)

        # Sort results by shot index
        results.sort(key=lambda x: x["index"])
        cls.write_artifact_file(project_dir, "images_manifest.json", results)
        return results

    @classmethod
    def save_shot_image(cls, project_dir: Path, shot_idx: int, image_bytes: bytes) -> Dict[str, Any]:
        images_dir = project_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        shot_img_path = images_dir / f"shot_{shot_idx:03d}.png"
        shot_img_path.write_bytes(image_bytes)

        # Update depth map if exists
        depths_dir = project_dir / "depths"
        depths_dir.mkdir(parents=True, exist_ok=True)
        depth_path = depths_dir / f"depth_{shot_idx:03d}.png"
        estimate_depth_map(shot_img_path, depth_path)

        return {
            "index": shot_idx,
            "path": str(shot_img_path),
            "url": f"/media/images/shot_{shot_idx:03d}.png",
            "exists": True,
        }

    # ROOM 5: MOTION (2.5D Parallax vs Colab Wan2GP Video)
    @classmethod
    async def build_motion(cls, project_dir: Path, profile_cfg: Dict[str, Any]) -> Dict[str, Any]:
        images_data = cls.read_artifact(project_dir, "images_manifest.json")
        shots_data = cls.read_artifact(project_dir, "shots.json")
        if not images_data or not shots_data:
            raise ValueError("Images and shots must exist before planning motion")

        img_cfg = profile_cfg.get("image_motion_config", {})
        motion_mode = img_cfg.get("motion_mode", "parallax_2.5d")
        depths_dir = project_dir / "depths"
        depths_dir.mkdir(parents=True, exist_ok=True)

        motion_plan = []
        for shot in shots_data.get("shots", []):
            idx = shot["index"]
            img_path = project_dir / "images" / f"shot_{idx:03d}.png"
            depth_path = depths_dir / f"depth_{idx:03d}.png"

            if img_path.exists():
                estimate_depth_map(img_path, depth_path)

            cam_plan = plan_2_5d_motion(
                trajectory="push_in" if idx % 2 == 1 else "orbit",
                duration_s=shot["duration"],
            )

            motion_plan.append({
                "shot_index": idx,
                "mode": motion_mode,
                "image": str(img_path),
                "depth": str(depth_path),
                "camera_trajectory": cam_plan.get("trajectory", "push_in"),
                "zoom_ratio": cam_plan.get("intensity", 1.0),
                "duration": shot["duration"],
            })

        res = {"mode": motion_mode, "plan": motion_plan, "shots": motion_plan}
        cls.write_artifact_file(project_dir, "motion_plan.json", res)
        return res

    # ROOM 6: ASSEMBLY & NON-DESTRUCTIVE RENDER
    @classmethod
    def build_render(cls, project_dir: Path, profile_cfg: Dict[str, Any]) -> Dict[str, Any]:
        shots_data = cls.read_artifact(project_dir, "shots.json")
        master_audio = project_dir / "vo_master.mp3"
        if not master_audio.exists():
            master_audio = project_dir / "vo.mp3"
        if not master_audio.exists():
            master_audio = project_dir / "vo.wav"

        if not shots_data or not master_audio.exists():
            raise ValueError("Cuts and voice must exist to render final video")

        renders_dir = project_dir / "renders"
        renders_dir.mkdir(parents=True, exist_ok=True)
        images_dir = project_dir / "images"

        render_version = cls.next_version(project_dir, "render")
        out_mp4 = renders_dir / f"{render_version}.mp4"

        render_cfg = profile_cfg.get("render_config", {})
        aspect_ratio = render_cfg.get("aspect_ratio", "9:16")
        fps = render_cfg.get("fps", 30)

        if aspect_ratio == "16:9":
            width, height = 1920, 1080
        else:
            width, height = 1080, 1920

        subtitles_srt = project_dir / "subtitles.srt"

        assemble_final_video(
            shots=shots_data.get("shots", []),
            images_dir=images_dir,
            audio_path=master_audio,
            output_mp4_path=out_mp4,
            subtitles_path=subtitles_srt if subtitles_srt.exists() else None,
            width=width,
            height=height,
            fps=fps,
        )

        file_size_bytes = out_mp4.stat().st_size if out_mp4.exists() else 0

        render_info = {
            "version": render_version,
            "status": "ready",
            "file": str(out_mp4),
            "duration_s": shots_data.get("duration", 10.0),
            "resolution": f"{width}x{height}",
            "fps": fps,
            "size_bytes": file_size_bytes,
            "aspect_ratio": aspect_ratio,
        }
        cls.write_versioned_artifact(project_dir, "render_manifest", render_info)
        return render_info

    @staticmethod
    def write_artifact_file(project_dir: Path, filename: str, data: Any) -> Path:
        path = project_dir / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        return path
