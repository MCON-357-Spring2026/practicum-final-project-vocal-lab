# SoundLab — Frontend

React + Vite UI for the home studio workflow: upload, record vocals, auto-tune, and export.

**API contract:** [API_CONTRACT.md](./API_CONTRACT.md)  
**Backend setup:** [backend.md](./backend.md)  
**Folders:** `frontend/` only (do not edit `backend/`)

## Prerequisites

- Node.js 18+ (20+ recommended)
- Running backend API (local or deployed)

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # or copy manually on Windows
```

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://127.0.0.1:8000` | Base URL for the FastAPI backend |

Create `frontend/.env.local` for local dev:

```env
VITE_API_URL=http://127.0.0.1:8000
```

For production, set `VITE_API_URL` to your deployed API URL (e.g. `https://your-api.onrender.com`). Rebuild/redeploy the frontend after changing it.

## Run (development)

Start the backend first (see [backend.md](./backend.md)), then:

```bash
cd frontend
npm run dev
```

- App: http://localhost:5173  
- Vite proxies nothing — the browser calls `VITE_API_URL` directly. Ensure backend `CORS_ORIGINS` includes your Vite origin (default dev config allows `http://localhost:5173`).

## Build

```bash
cd frontend
npm run build
npm run preview   # optional — serve production build locally
```

Output: `frontend/dist/`

## Routes

| Path | Page | Purpose |
|------|------|---------|
| `/` | Dashboard | Login, register, upload, project list |
| `/projects/:projectId` | Project detail | Full workflow for one project |

## User workflow (UI)

1. Register or log in on the dashboard.
2. Upload a **full song** or **instrumental** MP3.
3. Open the project — wait for key detection (and vocal removal for full songs).
4. Record a vocal **take** over the backing track (microphone required), then **Save as new take**.
5. Per take: **Auto-tune** → **Export mix** → **Download mix**.

A project can hold many takes; each is auto-tuned and exported independently.

Optional: rename project/takes, discard an unsaved recording and re-record, delete a take, delete the project.

### Recorder & export rules

- While a take is being recorded or has an unsaved preview, the recorder stays put and "Start recording" is hidden until you **Save as new take** or **Discard & re-record**.
- After saving, the recorder is hidden until the latest take is **exported** or **deleted** — so you finish one take before starting the next.
- A take's **Export mix** button disappears once it's exported. Auto-tuning a take clears its stale export, so **Export mix** returns to export the tuned version.

## Key source files

| Area | Files |
|------|-------|
| Pages | `src/pages/Dashboard.jsx`, `ProjectDetail.jsx` |
| Recording & takes | `src/components/VocalRecorder.jsx`, `TakeCard.jsx`, `MixPreview.jsx` |
| API client | `src/api/client.js`, `auth.js`, `projects.js` |
| Contract helpers | `src/api/projectContract.js` — statuses, media/take URLs, `projectActions()` |
| Styling | `src/styles/studio.css` |
| Shell / branding | `src/components/AppShell.jsx`, `PageDecorations.jsx` |

## Deploy (Vercel or Netlify)

Deploy after the backend is live and you have its public URL.

### Vercel

1. Import the GitHub repo; set **Root Directory** to `frontend`.
2. Build command: `npm run build`  
   Output directory: `dist`
3. Environment variable: `VITE_API_URL` = `https://your-api.example.com`
4. Deploy.

### Netlify

1. New site from Git; base directory `frontend`.
2. Build: `npm run build` · Publish: `dist`
3. Add `VITE_API_URL` under Site settings → Environment variables.
4. Deploy.

### After deploy

1. Send your partner the frontend URL (e.g. `https://soundlab.vercel.app`) so they can add it to backend `CORS_ORIGINS`.
2. Smoke-test: login → upload instrumental → record → auto-tune → export.
3. **HTTPS is required** for microphone access in production (`getUserMedia`).

## Demo tips

- **Instrumental upload** is the most reliable path on small hosting (no Demucs vocal removal).
- Full-song + remove vocals needs more backend CPU/RAM and longer request timeouts.
- If export fails, confirm the backend has `imageio-ffmpeg` installed (see backend docs).

## Troubleshooting

| Issue | Check |
|-------|--------|
| CORS errors in browser | Backend `CORS_ORIGINS` includes your frontend URL (with `https://`) |
| 401 on API calls | Log in again; token stored in `localStorage` |
| Mic not working | Use HTTPS in production; allow microphone permission in browser |
| Audio won't play | `VITE_API_URL` correct; backend serving `/uploads`, `/instrumentals`, etc. |
| Stale API after deploy | Rebuild frontend after changing `VITE_API_URL` (Vite bakes env at build time) |
