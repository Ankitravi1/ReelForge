"""FFmpeg Video Rendering Engine: Multi-Shot Motion Assembly, Audio Mixing, and Subtitles."""

from __future__ import annotations

import logging
import math
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

log = logging.getLogger(__name__)


def generate_subtitles_srt(words: List[Dict[str, Any]], output_srt_path: Path) -> Path:
    """Generates an SRT subtitle file from word-level alignment data."""
    output_srt_path.parent.mkdir(parents=True, exist_ok=True)
    
    if not words:
        output_srt_path.write_text("1\n00:00:00,000 --> 00:00:02,000\n...\n", encoding="utf-8")
        return output_srt_path

    # Group words into subtitle phrases (3-6 words per chunk)
    chunks = []
    chunk_words = []
    chunk_start = words[0]["start"]

    for w in words:
        chunk_words.append(w["word"])
        if len(chunk_words) >= 5 or w["word"].endswith((".", "!", "?", ",")):
            chunks.append({
                "start": chunk_start,
                "end": w["end"],
                "text": " ".join(chunk_words),
            })
            chunk_words = []
            chunk_start = w["end"]

    if chunk_words:
        chunks.append({
            "start": chunk_start,
            "end": words[-1]["end"],
            "text": " ".join(chunk_words),
        })

    def format_ts(seconds: float) -> str:
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds - int(seconds)) * 1000)
        return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

    lines = []
    for i, c in enumerate(chunks, start=1):
        lines.append(f"{i}")
        lines.append(f"{format_ts(c['start'])} --> {format_ts(c['end'])}")
        lines.append(c["text"])
        lines.append("")

    output_srt_path.write_text("\n".join(lines), encoding="utf-8")
    return output_srt_path


def synthesize_procedural_bgm(output_bgm_path: Path, duration_s: float, mood: str = "ambient") -> Path:
    """Generates a soft, pleasant royalty-free ambient BGM track via FFmpeg audio synthesis."""
    output_bgm_path.parent.mkdir(parents=True, exist_ok=True)

    # Mood-specific harmonic frequencies
    mood_chords = {
        "cinematic": "anoisesrc=d={dur}:c=pink:r=44100:a=0.015,lowpass=f=400[n]; sine=f=110:d={dur}[b]; sine=f=220:d={dur}[m]; [n][b][m]amix=inputs=3,volume=0.2",
        "investigative": "anoisesrc=d={dur}:c=brown:r=44100:a=0.02,lowpass=f=300[n]; sine=f=98:d={dur}[b]; sine=f=146:d={dur}[m]; [n][b][m]amix=inputs=3,volume=0.2",
        "scientific": "sine=f=130:d={dur}[b]; sine=f=261:d={dur}[m]; sine=f=392:d={dur}[h]; [b][m][h]amix=inputs=3,volume=0.15",
        "viral": "sine=f=120:d={dur}[b]; sine=f=240:d={dur}[m]; [b][m]amix=inputs=2,volume=0.25",
        "tension": "anoisesrc=d={dur}:c=brown:r=44100:a=0.03,lowpass=f=200[n]; sine=f=73:d={dur}[b]; [n][b]amix=inputs=2,volume=0.25",
    }
    synth_expr = mood_chords.get(mood, mood_chords["cinematic"]).replace("{dur}", f"{duration_s + 1.0:.2f}")

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", synth_expr,
        "-t", f"{duration_s:.2f}",
        "-af", f"afade=t=in:ss=0:d=1.5,afade=t=out:st={max(0, duration_s - 1.5):.2f}:d=1.5",
        str(output_bgm_path),
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except Exception as err:
        log.warning(f"Failed to synthesize BGM with FFmpeg: {err}")
    return output_bgm_path


def mix_master_audio(
    vo_path: Path,
    output_master_path: Path,
    bgm_mood: Optional[str] = None,
    bgm_volume: float = 0.15,
) -> Path:
    """Mixes voiceover with optional BGM using FFmpeg audio filters."""
    output_master_path.parent.mkdir(parents=True, exist_ok=True)
    if not vo_path.exists():
        return output_master_path

    if not bgm_mood or bgm_mood.lower() == "none" or bgm_volume <= 0.0:
        # Just copy or transcode vo
        cmd = ["ffmpeg", "-y", "-i", str(vo_path), "-c:a", "libmp3lame", "-b:a", "192k", str(output_master_path)]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return output_master_path

    # Get voice duration
    probe_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(vo_path)]
    try:
        dur_str = subprocess.check_output(probe_cmd, text=True).strip()
        dur = float(dur_str)
    except Exception:
        dur = 25.0

    bgm_temp = output_master_path.parent / "bgm_temp.wav"
    synthesize_procedural_bgm(bgm_temp, duration_s=dur, mood=bgm_mood)

    # Duck BGM under voiceover using amix
    cmd = [
        "ffmpeg", "-y",
        "-i", str(vo_path),
        "-i", str(bgm_temp),
        "-filter_complex",
        f"[1:a]volume={bgm_volume:.2f}[bgm];[0:a]volume=1.0[vo];[vo][bgm]amix=inputs=2:duration=first:dropout_transition=2[outa]",
        "-map", "[outa]",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(output_master_path),
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except Exception as err:
        log.warning(f"Error mixing master audio: {err}")
        import shutil
        shutil.copyfile(vo_path, output_master_path)
    finally:
        if bgm_temp.exists():
            try:
                bgm_temp.unlink()
            except Exception:
                pass

    return output_master_path


def render_shot_clip(
    image_path: Path,
    output_clip_path: Path,
    duration_s: float,
    width: int = 1080,
    height: int = 1920,
    trajectory: str = "push_in",
    fps: int = 30,
) -> Path:
    """Renders a single shot video clip with smooth pan/zoom camera motion using FFmpeg zoompan."""
    output_clip_path.parent.mkdir(parents=True, exist_ok=True)
    total_frames = max(1, int(duration_s * fps))

    # Calculate zoompan expression based on trajectory
    if trajectory == "push_in":
        # Zoom from 1.0 to 1.15 centered
        z_expr = f"min(zoom+0.0015,1.15)"
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"
    elif trajectory == "pull_out":
        # Zoom from 1.15 to 1.0
        z_expr = f"if(eq(on,1),1.15,max(1.0,zoom-0.0015))"
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"
    elif trajectory == "pan_left":
        # Constant zoom 1.1, pan from right to left
        z_expr = "1.12"
        x_expr = f"(1-on/{total_frames})*(iw-iw/zoom)"
        y_expr = "ih/2-(ih/zoom/2)"
    elif trajectory == "pan_right":
        # Constant zoom 1.1, pan from left to right
        z_expr = "1.12"
        x_expr = f"(on/{total_frames})*(iw-iw/zoom)"
        y_expr = "ih/2-(ih/zoom/2)"
    else:  # orbit / subtle float
        z_expr = "1.08"
        x_expr = f"(iw-iw/zoom)/2+sin(on/15)*15"
        y_expr = f"(ih-ih/zoom)/2+cos(on/15)*15"

    vf = (
        f"scale={width*2}:{height*2},"
        f"zoompan=z='{z_expr}':x='{x_expr}':y='{y_expr}':d={total_frames}:s={width}x{height}:fps={fps},"
        f"format=yuv420p"
    )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", str(image_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-t", f"{duration_s:.3f}",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        str(output_clip_path),
    ]

    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return output_clip_path


def assemble_final_video(
    shots: List[Dict[str, Any]],
    images_dir: Path,
    audio_path: Path,
    output_mp4_path: Path,
    subtitles_path: Optional[Path] = None,
    width: int = 1080,
    height: int = 1920,
    fps: int = 30,
) -> Path:
    """Assembles all shot video clips, binds master audio, and produces the final MP4 video."""
    output_mp4_path.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = output_mp4_path.parent / "temp_clips"
    temp_dir.mkdir(parents=True, exist_ok=True)

    clip_paths = []
    for shot in shots:
        idx = shot["index"]
        dur = max(0.5, shot.get("duration", 2.0))
        traj = shot.get("camera_trajectory", "push_in")

        img_path = images_dir / f"shot_{idx:03d}.png"
        if not img_path.exists():
            first_avail = next(images_dir.glob("*.png"), None)
            if first_avail:
                img_path = first_avail
            else:
                continue

        clip_file = temp_dir / f"clip_{idx:03d}.mp4"
        try:
            render_shot_clip(
                image_path=img_path,
                output_clip_path=clip_file,
                duration_s=dur,
                width=width,
                height=height,
                trajectory=traj,
                fps=fps,
            )
            clip_paths.append(clip_file)
        except Exception as err:
            log.warning(f"Failed to render shot clip {idx}: {err}")

    if not clip_paths:
        raise ValueError("No video clips could be rendered from shots")

    # Create concat list
    concat_list = temp_dir / "concat_list.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for p in clip_paths:
            clean_path = str(p.resolve()).replace("\\", "/")
            f.write(f"file '{clean_path}'\n")

    # Concat clips and bind audio
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_list),
        "-i", str(audio_path),
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        str(output_mp4_path),
    ]

    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # Cleanup temp clips
    for p in clip_paths:
        try:
            p.unlink()
        except Exception:
            pass
    try:
        concat_list.unlink()
        temp_dir.rmdir()
    except Exception:
        pass

    return output_mp4_path
