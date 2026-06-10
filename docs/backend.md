# SoundJBeats Studio — Backend

FastAPI API for upload, vocal removal, recording, auto-tune, and export.

**API contract:** [API_CONTRACT.md](./API_CONTRACT.md)  
**Branch:** `partner/projects-api` (backend only — do not edit `frontend/`)

## Prerequisites

- Python 3.11+
- FFmpeg (for `pydub` export)
- Demucs + PyTorch (for vocal removal; slow on first run)

## Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env   # or copy manually on Windows
alembic upgrade head
```

## Run (development)

```bash
cd backend
python -m uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000  
- Swagger: http://127.0.0.1:8000/docs  

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:///./sound_lab.db` | SQLite dev; use PostgreSQL in production |
| `CORS_ORIGINS` | localhost Vite ports | Comma-separated allowed browser origins |
| `SECRET_KEY` | (dev placeholder) | JWT signing — **must change in production** |

See `.env.example` in `backend/`.

## Database

- **Dev:** SQLite file `backend/sound_lab.db` (gitignored)
- **Prod:** set `DATABASE_URL=postgresql://user:pass@host:5432/dbname`
- Migrations: `alembic upgrade head` from `backend/`

## Main routes

| Prefix | Purpose |
|--------|---------|
| `/auth` | Register, login, me |
| `/projects` | **Primary** — full studio workflow |
| `/audio` | Legacy uploads (deprecated) |
| `/recording` | Legacy vocal save (deprecated; now requires auth) |

## Project workflow

1. `POST /projects` — upload `full_song` or `instrumental`
2. `POST /projects/{id}/remove-vocals` — full song only (Demucs)
3. `POST /projects/{id}/redetect-key` — optional, on instrumental
4. `POST /projects/{id}/vocal` — save browser recording
5. `POST /projects/{id}/pitch-correct` — auto-tune toward detected key
6. `POST /projects/{id}/export` — mix backing track + vocal → MP3

All `/projects/*` routes require `Authorization: Bearer <token>`.

## Status values

| Status | When |
|--------|------|
| `processing` | Upload key detect or Demucs running |
| `ready_to_record` | Backing track + key ready |
| `vocal_recorded` | Mic vocal saved |
| `tuned` | Auto-tune applied |
| `exported` | Final mix created |

## Static files

| Mount | Directory |
|-------|-----------|
| `/uploads` | Original full songs |
| `/instrumentals` | Vocal-removed tracks |
| `/recordings` | Raw browser vocals |
| `/corrected` | Auto-tuned vocals |
| `/exports` | Final MP3 exports |

## First-time auth

Register in Swagger (`POST /auth/register`), then login (`POST /auth/login`). Use the returned `access_token` on protected routes.
