# API Contract — SoundLab

Both frontend and backend follow this spec.

Vocals are organized as **takes**: a project holds many takes, and each take is independently auto-tuned and exported. The legacy single-vocal fields/routes (`vocal_stored_as`, `/projects/{id}/vocal`, `/pitch-correct`, `/export`) remain for backward compatibility but the UI uses takes.

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
  "takes": [
    {
      "take_id": "uuid",
      "name": "Take 1",
      "vocal_stored_as": "uuid_vocal.webm",
      "corrected_stored_as": "uuid_corrected_vocal.wav",
      "export_stored_as": "uuid.mp3",
      "is_tuned": true,
      "created_at": "2026-05-29T12:05:00"
    }
  ],
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
| `vocal_stored_as` | string \| null | Legacy single-vocal field (superseded by `takes`) |
| `export_stored_as` | string \| null | Legacy single-export field (superseded by `takes`) |
| `takes` | array | Recorded takes, newest first (see **Take** below) |

### `Take` JSON

| Field | Type | Notes |
|-------|------|-------|
| `take_id` | string | Public UUID used in take endpoints |
| `name` | string | Display name, e.g. `"Take 1"` |
| `vocal_stored_as` | string \| null | Raw recording under `/recordings/` |
| `corrected_stored_as` | string \| null | Auto-tuned vocal under `/corrected/` |
| `export_stored_as` | string \| null | Mixed MP3 under `/exports/` |
| `is_tuned` | bool | `true` once auto-tune has been applied |

Play a take's vocal from `/corrected/{corrected_stored_as}` when `is_tuned`, otherwise `/recordings/{vocal_stored_as}`. Auto-tuning a take clears its `export_stored_as` (the previous mix is now stale).

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

After the backing track is ready, the project's `status` is derived from its takes: no takes → `ready_to_record`; a take exists → `vocal_recorded`; any take tuned → `tuned`; any take exported → `exported`.

| Status | When | UI action |
|--------|------|-----------|
| `processing` | Key detect or Demucs running | Spinner / disabled |
| `ready_to_record` | Backing track + key ready, no takes | **Remove Vocals** (full song, no instrumental yet) · **Re-detect Key** (if instrumental exists) · **Record take** |
| `vocal_recorded` | At least one take recorded | Per take: **Auto-tune** · **Export** |
| `tuned` | A take has been auto-tuned | Per take: **Export** |
| `exported` | A take has been exported | Per take: **Download mix** |

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
| `PATCH` | `/projects/{project_id}` | Rename project (JSON `{ "name": "..." }`) |
| `POST` | `/projects/{project_id}/takes` | Save a new take (multipart `file`, optional `name`) |
| `PATCH` | `/projects/{project_id}/takes/{take_id}` | Rename a take (JSON `{ "name": "..." }`) |
| `DELETE` | `/projects/{project_id}/takes/{take_id}` | Delete a take + its files |
| `POST` | `/projects/{project_id}/takes/{take_id}/pitch-correct` | Auto-tune a take toward the detected key |
| `POST` | `/projects/{project_id}/takes/{take_id}/export` | Mix a take's vocal + backing track → MP3 |

All take endpoints return the full updated `Project` (including its `takes`).

### Legacy single-vocal routes (superseded by takes)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/projects/{project_id}/vocal` | Save one browser recording on the project |
| `DELETE` | `/projects/{project_id}/vocal` | Discard the project vocal (+ export) |
| `POST` | `/projects/{project_id}/pitch-correct` | Auto-tune the project vocal |
| `POST` | `/projects/{project_id}/export` | Mix backing track + project vocal → MP3 |

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

### `POST /projects/{project_id}/takes`

- Multipart `file` (the browser recording, typically `.webm`); optional `name`
- Creates a take named `"Take N"` by default and returns the updated project

### `POST /projects/{project_id}/takes/{take_id}/pitch-correct`

- Requires the project to have a `detected_key`
- Writes the auto-tuned vocal to `/corrected/`, sets `is_tuned=true`, and clears the take's stale `export_stored_as`

### `POST /projects/{project_id}/takes/{take_id}/export`

- Mixes the take's vocal (auto-tuned if available, else raw) with the backing track
- Sets the take's `export_stored_as` (MP3 under `/exports/`)

---

## Legacy routes (still available)

| Prefix | Status |
|--------|--------|
| `/audio/*` | Deprecated — use `/projects` |
| `/recording/*` | Deprecated — use `/projects/{id}/vocal` and `/pitch-correct` |
