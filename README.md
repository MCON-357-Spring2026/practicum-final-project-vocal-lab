[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/FHXdZx9N)

# SoundLab

SoundLab is a browser-based home vocal studio. Upload a backing track (a full song or an instrumental), record vocals over it in the browser, auto-tune each take toward the song's detected key, and export a mixed MP3 — all organized per project.

- **Backend:** FastAPI + SQLAlchemy (Python)
- **Frontend:** React + Vite
- **Audio:** librosa (key detection), Demucs (vocal removal), bundled ffmpeg + lameenc (mixing/export)

## What you can do

1. Register / log in.
2. Create a project by uploading a **full song** or an **instrumental** MP3.
3. For a full song, remove the vocals (Demucs) to get a backing track; the song's musical key is detected automatically.
4. Record one or more vocal **takes** over the backing track.
5. **Auto-tune** any take toward the detected key and **export** it as a mixed MP3.

A project can hold many takes; each take is independently auto-tuned and exported.

## Repository layout

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI API, database models, audio services, migrations |
| `frontend/` | React + Vite single-page app |
| `docs/API_CONTRACT.md` | HTTP API the frontend builds against |
| `docs/backend.md` | Backend setup, routes, and workflow |
| `docs/frontend.md` | Frontend setup, routes, and deploy |

## Quick start (local)

Run the backend and frontend in two terminals.

### Backend (http://127.0.0.1:8000)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (use: source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
copy .env.example .env         # Windows  (use: cp .env.example .env elsewhere)
alembic upgrade head
python -m uvicorn app.main:app --reload
```

Swagger docs: http://127.0.0.1:8000/docs

### Frontend (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` in `frontend/.env.local` if the backend is not on the default `http://127.0.0.1:8000`.

## Documentation

- API contract: [docs/API_CONTRACT.md](docs/API_CONTRACT.md)
- Backend guide: [docs/backend.md](docs/backend.md)
- Frontend guide: [docs/frontend.md](docs/frontend.md)
