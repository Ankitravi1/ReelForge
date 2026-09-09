# 🎬 Autitic Studio

> **AI Short-Form Video Studio**: Decoupled 6-Room Pipeline, Dual-Engine Visuals (Local Animagine XL + Hosted Colab Z-Image-Turbo), 2.5D Parallax Motion, and Master Audio Synthesis.

---

## 🌟 Overview

Autitic Studio is a self-contained AI video generation workstation designed for high-efficiency, non-destructive short-form storytelling (YouTube Shorts, Reels, TikToks).

Every project progresses through a **6-Room Decoupled Pipeline**, allowing full granular control, versioning, and re-rolls at each individual step:

1. **Room 1: Story & Beats** — 3-Tier Ideation: Idea Premise $\to$ Story Arc (Fable, Documentary, Viral) $\to$ Full Script.
2. **Room 2: Voice & Audio** — Local Supertonic neural TTS, multi-take versioning, pitch/speed control, and master track mixing.
3. **Room 3: The Cut** — Whisper STT word-level alignment and speech-synchronized shot pacing.
4. **Room 4: Shot Visuals (Dual-Engine)** —
   - 💻 **Local Engine: Animagine XL 4.0 Lightning** (OpenVINO CPU/iGPU diffusion with cached weights, zero setup, offline).
   - ⚡ **Hosted Colab GPU: Z-Image-Turbo** (Tongyi-MAI/Z-Image-Turbo 8-step native 1024 stills in ~3–4s on free Google Colab GPU via Cloudflare quick tunnel).
   - Individual shot re-rolls preserving the existing storyboard manifest, and custom image uploads.
5. **Room 5: Motion Engine** — Monocular depth map extraction via Depth-Anything-V2, interactive mouse-tilt 2.5D parallax simulation canvas, and camera trajectory keyframing.
6. **Room 6: Assembly & Export** — Multi-shot video rendering with master audio, dynamic BGM ducking, and auto-timed SRT subtitles.

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- FFmpeg installed and available on PATH

### 1. Backend Setup
`ash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -e .
`

### 2. Frontend Setup
`ash
cd frontend
npm install
npm run dev
`

### 3. Launch Application
- **Frontend UI**: http://localhost:5173
- **Backend API**: http://127.0.0.1:8000
- **API Docs (Swagger)**: http://127.0.0.1:8000/docs

---

## ⚡ Google Colab GPU Bridge (Optional)

When you need high-speed GPU diffusion (~3s per 1024 still) or Wan 2.1 video generation:

1. Open [scripts/colab_wan2gp_server.ipynb](scripts/colab_wan2gp_server.ipynb) in [Google Colab](https://colab.research.google.com).
2. Select a GPU runtime (T4 or A100).
3. Run the notebook cells. Step 4 will output a secure Cloudflare tunnel URL:
   `
   🚀 YOUR AUTITIC STUDIO REMOTE GPU URL IS:
   https://xxxx-xxxx.trycloudflare.com
   `
4. Paste this URL into **Room 4** or **Settings $\to$ Colab** in the Autitic Studio UI and click **Test Ping**.

---

## 📁 Repository Architecture

`
autitic/
├── backend/
│   └── autitic/
│       ├── api/          # FastAPI REST routers (rooms, channels, profiles, settings)
│       ├── providers/    # TTS (Supertonic), STT (Whisper), Image (Animagine/Colab), Depth, FFmpeg
│       ├── rooms/        # Decoupled RoomService pipeline logic and state management
│       ├── db.py         # SQLAlchemy SQLite database session
│       ├── models.py     # Channel, Profile, Project schemas
│       └── main.py       # FastAPI application entry point
├── frontend/
│   └── src/
│       ├── App.tsx       # Interactive multi-room studio interface
│       └── api.ts        # Typed frontend client connecting to backend API
├── scripts/
│   ├── colab_gpu_server.py       # Colab FastAPI GPU bridge server
│   └── colab_wan2gp_server.ipynb # One-click Google Colab notebook
├── tests/                # Automated pytest test suites
├── pyproject.toml        # Backend dependencies and build configuration
└── .env.example          # Environment variable template
`

---

## 📄 License
MIT License
