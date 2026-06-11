# API Contract — SoundJBeats Studio

Both frontend and backend follow this spec. Partner implements endpoints; Rena builds UI against it.

## Authentication

All `/projects/*` routes require:

```
Authorization: Bearer <access_token>
```

Obtain a token via `POST /auth/login` or `POST /auth/register`.

---

## `Project` JSON (response)

```json
{
  "id": 1,
  "project_id": "uuid",
  "name": "Shape of You Cover",
  "upload_type": "full_song",
  "status": "ready_to_record",
  "detected_key": "C",
  "mode": "major",
  "confidence": 0.82,
  "key_source": "instrumental",
  "original_stored_as": "uuid.mp3",
  "instrumental_stored_as": "uuid_instrumental.wav",
  "vocal_stored_as": null,
  "export_stored_as": null,
  "created_at": "2026-05-29T12:00:00"
}
```

### Fields

| Field | Type | Notes |
|-------|------|-------|
| `upload_type` | string | `"full_song"` or `"instrumental"` |
| `status` | string | See **Status pipeline** below |
| `key_source` | string | `"original"` or `"instrumental"` |
| `original_stored_as` | string \| null | File under `/uploads/` |
| `instrumental_stored_as` | string \| null | File under `/instrumentals/` |
| `vocal_stored_as` | string \| null | File under `/recordings/` or `/corrected/` |
| `export_stored_as` | string \| null | File under `/exports/` |

### Static file URLs

| Field | Play URL |
|-------|----------|
| `original_stored_as` | `GET /uploads/{filename}` |
| `instrumental_stored_as` | `GET /instrumentals/{filename}` |
| `vocal_stored_as` | `GET /recordings/{filename}` or `GET /corrected/{filename}` |
| `export_stored_as` | `GET /exports/{filename}` |

### Status pipeline

```
processing → ready_to_record → vocal_recorded → tuned → exported
```

| Status | When | UI action |
|--------|------|-----------|
| `processing` | Key detect or Demucs running | Spinner / disabled |
| `ready_to_record` | Backing track + key ready | **Remove Vocals** (full song, no instrumental yet) · **Re-detect Key** (if instrumental exists) · **Record** |
| `vocal_recorded` | Mic vocal saved | **Auto-tune** · **Export** |
| `tuned` | Auto-tune applied (`vocal_stored_as` now points to `/corrected/`) | **Export** |
| `exported` | Final mix saved | **Play / download export** |

**Instrumental upload:** file saved to `instrumentals/` as `instrumental_stored_as` (not `original_stored_as`).

**Full song upload:** file saved to `uploads/` as `original_stored_as`; after remove-vocals, `instrumental_stored_as` is set.

Frontend helpers: `frontend/src/api/projectContract.js`

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/projects` | Create project (multipart: `file`, `upload_type`, optional `name`) |
| `GET` | `/projects/mine` | List user's projects |
| `GET` | `/projects/{project_id}` | One project |
| `DELETE` | `/projects/{project_id}` | Delete project + all files |
| `POST` | `/projects/{project_id}/remove-vocals` | Demucs (`full_song` only) |
| `POST` | `/projects/{project_id}/redetect-key` | Key on instrumental |
| `POST` | `/projects/{project_id}/vocal` | Save browser recording (multipart `file`) |
| `DELETE` | `/projects/{project_id}/vocal` | Discard vocal (+ export); status → `ready_to_record` |
| `POST` | `/projects/{project_id}/pitch-correct` | Auto-tune vocal toward detected key |
| `POST` | `/projects/{project_id}/export` | Mix backing track + vocal → MP3 export |

### `POST /projects`

**Form fields:**

- `file` — audio file (required)
- `upload_type` — `"full_song"` or `"instrumental"` (required)
- `name` — display name (optional; defaults to filename stem)

**Behavior:**

- `full_song` → saves to `uploads/`, sets `original_stored_as` (use **Detect key** and **Remove vocals** on project page)
- `instrumental` → saves to `instrumentals/`, sets `instrumental_stored_as` (use **Detect key** on project page)

### `POST /projects/{project_id}/remove-vocals`

- Only for `upload_type=full_song`
- Runs Demucs, sets `instrumental_stored_as`

### `POST /projects/{project_id}/redetect-key`

- Requires `instrumental_stored_as` (from upload type `instrumental` or after remove-vocals)
- Updates key fields with `key_source=instrumental`

### `POST /projects/{project_id}/export`

- Requires `vocal_stored_as`
- Mixes instrumental (or original if no instrumental) with vocal
- Sets `export_stored_as` and `status=exported`

---

## Legacy routes (still available)

| Prefix | Status |
|--------|--------|
| `/audio/*` | Deprecated — use `/projects` |
| `/recording/*` | Deprecated — use `/projects/{id}/vocal` and `/pitch-correct` |
