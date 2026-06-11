# Work Split — Rena & Partner

**Last updated:** 2026-05-29

**Goal:** Ship a deployable class demo with minimal merge conflicts.

**Strategy:** Split by **layer** (backend vs frontend). Build against **`docs/API_CONTRACT.md`**.

---

## Current status

| Milestone | Status |
|-----------|--------|
| MVP works locally (upload → record → auto-tune → export) | **Done** |
| Projects API (backend) | **Done** (merged) |
| Dashboard + project UI (frontend) | **Done** (merged to `main`) |
| SoundLab styling + logo + decorations | **Done** |
| Export without system ffmpeg (`imageio-ffmpeg` + `lameenc`) | **Done** |
| Frontend run/deploy docs | **Done** (`docs/frontend.md`) |
| Delete project UI | **Done** |
| Legacy UI cleanup | **Done** |
| Deploy to production | **Not started** |

---

## Golden rules (still apply)

1. **Rena only edits** `frontend/` (except shared README/docs).
2. **Partner only edits** `backend/` (except shared README/docs).
3. **Merge order:** Partner backend → Rena frontend → integration test → deploy.
4. **Branches:** `rena/dashboard-ui` · `partner/projects-api` (merge both to `main` when ready).

---

## API contract (reference)

Full spec: **`docs/API_CONTRACT.md`**

**Status pipeline:** `processing` → `ready_to_record` → `vocal_recorded` → `tuned` → `exported`

**Frontend helpers:**
- `frontend/src/api/projectContract.js` — statuses, URLs, `projectActions()`
- `frontend/src/api/client.js`, `projects.js`, `auth.js`

---

## Rena — Frontend & UX

**Branch:** `rena/dashboard-ui`  
**Folders:** `frontend/` only

### Done

| Task | Files |
|------|-------|
| React Router (`/`, `/projects/:id`) | `App.jsx`, `package.json` |
| API helpers + auth | `src/api/client.js`, `projects.js`, `auth.js` |
| `VITE_API_URL` env | `.env.example` |
| Login + register + logout | `AuthForm.jsx`, `Dashboard.jsx` |
| Dashboard — upload full song / instrumental | `ProjectUpload.jsx`, `Dashboard.jsx` |
| Project list + cards + status badges | `ProjectCard.jsx`, `StatusBadge.jsx` |
| Project detail — full workflow | `ProjectDetail.jsx` |
| Record → save vocal | `VocalRecorder.jsx`, `ProjectDetail.jsx` |
| Remove vocals, re-detect key, auto-tune, export | `ProjectDetail.jsx` |
| Playback for all assets + download export | `ProjectDetail.jsx` |
| Discard vocal & re-record | `ProjectDetail.jsx` → `clearVocal()` |
| Delete project | `ProjectDetail.jsx` → `deleteProject()` |
| Loading / error states | `ProjectDetail.jsx`, `Dashboard.jsx` |
| SoundLab theme (presentation palette) | `src/styles/studio.css` |
| Logo + side decorations | `AppShell.jsx`, `PageDecorations.jsx`, `assets/` |
| Frontend run/deploy docs | `docs/frontend.md`, `frontend/README.md` |
| Legacy UI removed | Deleted `AudioUpload.jsx`, `PlaybackExport.jsx`, `mockProjects.js` |
| Mobile polish (buttons, meta row, spacing) | `studio.css` |

### Still to do

| # | Task | Priority | Files / notes |
|---|------|----------|----------------|
| 1 | **Deploy React** (Vercel / Netlify) | High | Set `VITE_API_URL` to prod backend URL — **blocked until partner deploys API** |
| 2 | Final UI polish from demo feedback | Low | spacing, copy tweaks after class review |

### Do NOT touch

- `backend/`, `alembic/`, `models.py`, `projects.py`

---

## Partner — Backend & data

**Branch:** `partner/projects-api` (merged to `main`)  
**Folders:** `backend/` only

### Done

| Task | Files |
|------|-------|
| `Project` model + migration `004` | `models.py`, `alembic/versions/004_*.py` |
| Project fields (`name`, `upload_type`, `status`, paths) | `models.py` |
| Pydantic schemas | `schemas.py` |
| Full `/projects/*` router + status transitions | `projects.py` |
| Mount router | `main.py` |
| Delete project + file cleanup | `projects.py` |
| `DATABASE_URL` from env | `config.py`, `database.py`, `.env.example` |
| CORS from env | `config.py`, `main.py` |
| Backend docs | `docs/backend.md` |
| Login compatible with Swagger (OAuth2 form) | `auth.py` |
| Export mix without system ffmpeg | `services/audio_mixer.py`, `imageio-ffmpeg` in `requirements.txt` |
| WebM vocal load for auto-tune + export | `audio_mixer.py`, `pitch_correction.py` |

### Still to do

| # | Task | Priority | Files / notes |
|---|------|----------|----------------|
| 1 | **Deploy FastAPI** (Render / Railway / Fly) | High | Dockerfile or platform config |
| 2 | **PostgreSQL** + prod `DATABASE_URL` | High | Run `alembic upgrade head` on prod DB |
| 3 | **Production env** — `SECRET_KEY`, `CORS_ORIGINS` | High | `.env` on host; include Rena's frontend URL |
| 4 | **Persistent file storage** | High | Local disk is ephemeral on most hosts — persistent volume or S3 |
| 5 | Auth on legacy routes (optional hardening) | Low | `/recording/*`, `/audio/mix` — UI no longer uses these |
| 6 | Demucs / vocal removal on prod | Medium | Heavy (RAM + long requests); may timeout on free tier — document demo limits |
| 7 | Review + merge Rena's frontend PR | **Done** | Merged to `main` |

### Do NOT touch

- `frontend/`

---

## Deployment — next phase (both)

| Task | Owner | Status |
|------|-------|--------|
| Merge frontend PR to `main` | Rena | **Done** |
| Full flow test on `main` locally | Both | Todo |
| Deploy FastAPI | Partner | Todo |
| PostgreSQL + migrations | Partner | Todo |
| `SECRET_KEY` + `CORS_ORIGINS` | Partner | Todo |
| Persistent storage for audio files | Partner | Todo |
| Deploy React (Vercel / Netlify) | Rena | Todo |
| `VITE_API_URL` → prod backend | Rena | Todo |
| End-to-end test on deployed URLs | Both | Todo |
| Domain + custom DNS (optional) | Either | Defer |

### Minimum env for deploy

**Backend**
```env
DATABASE_URL=postgresql://...
SECRET_KEY=<long-random-string>
CORS_ORIGINS=https://your-frontend.vercel.app
```

**Frontend**
```env
VITE_API_URL=https://your-api.onrender.com
```

### Demo tip

Instrumental upload → record → auto-tune → export is the most reliable path on small hosting. Full-song + remove-vocals needs more CPU/RAM and longer request timeouts.

---

## Suggested order (from here)

```
1. Both   → Test full flow on main (both laptops) — if not done yet
2. Partner → Deploy backend + PostgreSQL + env + storage plan
3. Rena   → Deploy frontend with VITE_API_URL (send URL to partner for CORS)
4. Both   → Test on production URLs (HTTPS required for mic)
5. Optional polish → demo feedback tweaks
```

---

## What stays out of scope (defer)

- User profile / change password
- Project search/filter
- Custom domain
- Real-time pitch feedback
- Cloud object storage (unless prod requires it)

---

## Quick reference

```
Rena     → frontend/, deploy frontend, frontend docs, merge PR
Partner  → deploy backend, PostgreSQL, prod env, persistent storage, review Rena PR
Both     → integration test on main + production smoke test
```
