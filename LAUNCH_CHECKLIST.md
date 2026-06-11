# Sound Lab — Launch Checklist

Last updated: 2026-05-29

**Legend**
- `[x]` **Done** — implemented and usable
- `[~]` **Partial** — exists but not wired into the full project flow
- `[ ]` **Todo** — not started

**Current state:** feature prototype with auth, uploads, key detection, vocal removal, recording, auto-tune, and mix/export — but **no Project model, no dashboard, no guided workflow**.

---

## Project System

| Status | Item | Notes |
|--------|------|-------|
| `[ ]` | Create Project model | `Recording` exists; rename/extend to `Project` |
| `[ ]` | Add project name | Only `original_filename` today |
| `[ ]` | Add upload type (`instrumental` / `full_song`) | Not in DB |
| `[ ]` | Add project status field | No pipeline status stored |
| `[~]` | Associate uploads with projects | Uploads saved as `Recording` rows per user |
| `[~]` | Associate recordings with projects | Vocals saved to `recordings/` disk only — not in DB |
| `[ ]` | Associate exports with projects | Mix writes to `exports/` — not linked to any row |
| `[~]` | Store instrumental path | `instrumental_stored_as` on `Recording` |
| `[~]` | Store original song path | `stored_as` on `Recording` |
| `[ ]` | Store vocal recording path | No `vocal_stored_as` field |
| `[ ]` | Store export path | No `export_stored_as` field |

---

## Dashboard

| Status | Item | Notes |
|--------|------|-------|
| `[ ]` | Dashboard page | Single stacked page in `App.jsx` |
| `[~]` | "Upload Instrumental" flow | Button in `AudioUpload.jsx` — not a project |
| `[~]` | "Upload Full Song" flow | Upload + remove vocals — not a project |
| `[ ]` | Project cards | "My Recordings" list is file-centric, not project cards |
| `[ ]` | Project status display | — |
| `[~]` | Display detected key | Shown in upload list / after upload |
| `[ ]` | Display upload type | — |
| `[ ]` | Project search/filter (basic) | Defer if needed; not MVP-blocking |

---

## Project Detail Page

| Status | Item | Notes |
|--------|------|-------|
| `[ ]` | Route: `/projects/:id` | No React Router yet |
| `[ ]` | Show project metadata | — |
| `[ ]` | Show detected key | Key shown on upload page only |
| `[~]` | Show original song | Audio player in `AudioUpload` |
| `[~]` | Show instrumental version | After vocal removal in `AudioUpload` |
| `[~]` | Show recorded vocals | `VocalRecorder` preview — not per-project |
| `[~]` | Show export file | `PlaybackExport` — manual path entry |
| `[~]` | Record button | `VocalRecorder` exists; not on project detail |
| `[~]` | Playback button | Scattered across components |
| `[~]` | Export button | `PlaybackExport` requires typing file paths |

---

## Workflow Integration

Everything should happen automatically through a project.

| Status | Item | Notes |
|--------|------|-------|
| `[~]` | Instrumental upload → project | Upload works; no project created |
| `[~]` | Full song upload → vocal remover | Works via `POST /audio/recordings/{id}/remove-vocals` |
| `[~]` | Vocal remover → project | Saves `instrumental_stored_as` on `Recording` |
| `[~]` | Key detection → project | Auto on upload; optional re-detect on instrumental |
| `[ ]` | Vocal recording → project | Save goes to disk; not linked in DB |
| `[ ]` | Playback → project assets | User picks backing track manually in parent state |
| `[ ]` | Export → project assets | User types instrumental + vocal paths manually |

### Status pipelines to implement

**Instrumental path**
```
uploaded → key_detected → ready_to_record → recording_complete → export_ready
```

**Full song path**
```
uploaded → removing_vocals → instrumental_ready → key_detected → ready_to_record → recording_complete → export_ready
```

---

## File Management

| Status | Item | Notes |
|--------|------|-------|
| `[~]` | Organize storage structure | Folders: `uploads/`, `instrumentals/`, `recordings/`, `exports/`, `corrected/` |
| `[~]` | Delete project files when project deleted | `DELETE /audio/recordings/{id}` removes original + instrumental; not vocals/exports |
| `[x]` | Validate audio file types | `ALLOWED_EXTENSIONS` on `POST /audio/upload` |
| `[~]` | Handle upload failures | HTTP errors + UI message in `AudioUpload` |
| `[~]` | Handle processing failures | Vocal removal / key errors surfaced in UI; Demucs can take minutes |

---

## User Management

| Status | Item | Notes |
|--------|------|-------|
| `[ ]` | User profile page | — |
| `[ ]` | Change password | — |
| `[ ]` | Update account information | — |
| `[~]` | Logout flow verification | JWT in `sessionStorage`; **no Logout button** |
| `[~]` | Register flow | `POST /auth/register` API works; **no Register UI** (Swagger/Postman only) |
| `[x]` | Login flow | `AudioUpload` login + Bearer token on protected routes |

---

## Auth & Security Gaps (add before launch)

| Status | Item | Notes |
|--------|------|-------|
| `[x]` | Auth on upload / list / delete | `Depends(get_current_user)` on `/audio/*` CRUD |
| `[ ]` | Auth on `POST /recording/save` | Open to anyone |
| `[ ]` | Auth on `POST /recording/pitch-correct` | Open to anyone |
| `[ ]` | Auth on `POST /audio/mix` | Open to anyone |
| `[ ]` | Auth on legacy `POST /audio/remove-vocals` | Prefer project-scoped route (authed) |

---

## Extra Features (already built — wire into projects)

| Status | Item | Notes |
|--------|------|-------|
| `[x]` | Auto key detection on upload | `POST /audio/upload` |
| `[x]` | Re-detect key on instrumental | `POST /audio/recordings/{id}/redetect-key` |
| `[x]` | Vocal removal (Demucs) | `POST /audio/recordings/{id}/remove-vocals` |
| `[x]` | Browser vocal recording | `VocalRecorder` + `POST /recording/save` |
| `[x]` | Post-recording auto-tune | `POST /recording/pitch-correct` |
| `[x]` | Mix / export API | `POST /audio/mix` |
| `[x]` | Alembic migrations (dev) | Migrations `001`–`003` |
| `[ ]` | React Router | Needed for dashboard + project detail |
| `[ ]` | README / run docs | Root README still describes old RecipeShare project |

---

## Production Database

| Status | Item | Notes |
|--------|------|-------|
| `[x]` | SQLite (development) | `sqlite:///./sound_lab.db` |
| `[ ]` | Migrate to PostgreSQL | Required for production |
| `[ ]` | Environment configuration | `.env` / secrets not set up |
| `[ ]` | Production database connection | `DATABASE_URL` from env |

---

## Deployment

### Backend

| Status | Item | Notes |
|--------|------|-------|
| `[ ]` | Deploy FastAPI | — |
| `[ ]` | Configure production environment variables | `SECRET_KEY`, `DATABASE_URL`, etc. |
| `[~]` | Configure CORS | Dev origins only (`localhost:5173`) |
| `[ ]` | Configure HTTPS | — |

### Frontend

| Status | Item | Notes |
|--------|------|-------|
| `[ ]` | Deploy React app | — |
| `[~]` | Configure API URLs | Hardcoded `http://127.0.0.1:8000` in components |

### Domain

| Status | Item | Notes |
|--------|------|-------|
| `[ ]` | Buy domain | Optional for first deploy |
| `[ ]` | Configure DNS | — |
| `[ ]` | SSL verification | — |

---

## Suggested build order

1. **Project model** — extend `Recording` or add `Project` + migration (`name`, `upload_type`, `status`, `vocal_stored_as`, `export_stored_as`)
2. **Project API** — create/list/get/delete; scoped remove-vocals, redetect-key, record, export
3. **React Router** — `/`, `/projects`, `/projects/:id`
4. **Dashboard** — two upload buttons + project cards with status
5. **Project detail** — record, play, auto-tune, export (no manual paths)
6. **Auth gaps** — protect recording/mix routes; add Register + Logout UI
7. **File cleanup** — delete all project assets on project delete
8. **Deploy** — PostgreSQL, env vars, CORS, frontend API URL
9. **Polish** — profile, domain (optional)

---

## Quick scorecard

| Area | Done | Partial | Todo |
|------|------|---------|------|
| Project System | 0 | 4 | 7 |
| Dashboard | 0 | 3 | 5 |
| Project Detail | 0 | 6 | 5 |
| Workflow Integration | 0 | 4 | 3 |
| File Management | 1 | 4 | 0 |
| User Management | 1 | 2 | 3 |
| Auth Gaps | 1 | 0 | 4 |
| Extra Features | 7 | 0 | 2 |
| Production DB | 1 | 0 | 3 |
| Deployment | 0 | 2 | 7 |

**Rough completion:** ~15% done · ~25% partial · ~60% todo (for launch-ready product)
