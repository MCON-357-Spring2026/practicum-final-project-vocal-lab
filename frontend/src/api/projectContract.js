/**
 * API contract helpers — must match docs/API_CONTRACT.md and backend/app/projects.py
 */

export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export const UPLOAD_TYPES = {
  INSTRUMENTAL: "instrumental",
  FULL_SONG: "full_song",
};

/** Status values set by the backend (see docs/backend.md). */
export const PROJECT_STATUS = {
  PROCESSING: "processing",
  READY_TO_RECORD: "ready_to_record",
  VOCAL_RECORDED: "vocal_recorded",
  TUNED: "tuned",
  EXPORTED: "exported",
};

export const STATUS_LABELS = {
  [PROJECT_STATUS.PROCESSING]: "Processing…",
  [PROJECT_STATUS.READY_TO_RECORD]: "Ready to record",
  [PROJECT_STATUS.VOCAL_RECORDED]: "Vocal recorded",
  [PROJECT_STATUS.TUNED]: "Auto-tune applied",
  [PROJECT_STATUS.EXPORTED]: "Export ready",
};

export const UPLOAD_TYPE_LABELS = {
  [UPLOAD_TYPES.INSTRUMENTAL]: "Instrumental",
  [UPLOAD_TYPES.FULL_SONG]: "Full song",
};

export const mediaUrls = {
  original: (filename) => `${API_URL}/uploads/${filename}`,
  instrumental: (filename) => `${API_URL}/instrumentals/${filename}`,
  vocal: (filename) => `${API_URL}/recordings/${filename}`,
  corrected: (filename) => `${API_URL}/corrected/${filename}`,
  export: (filename) => `${API_URL}/exports/${filename}`,
};

/** Backing track filename for recording (matches backend _resolve_backing_track_path). */
export function backingTrackFilename(project) {
  if (!project) return null;
  if (project.instrumental_stored_as) return project.instrumental_stored_as;
  if (project.upload_type === UPLOAD_TYPES.FULL_SONG && project.original_stored_as) {
    return project.original_stored_as;
  }
  return null;
}

export function backingTrackUrl(project) {
  const filename = backingTrackFilename(project);
  if (!filename) return null;
  if (project.instrumental_stored_as) {
    return mediaUrls.instrumental(filename);
  }
  return mediaUrls.original(filename);
}

/** Take vocal playback — auto-tuned file lives under /corrected/, else raw under /recordings/. */
export function takeVocalUrl(take) {
  if (!take) return null;
  if (take.is_tuned && take.corrected_stored_as) {
    return mediaUrls.corrected(take.corrected_stored_as);
  }
  if (take.vocal_stored_as) {
    return mediaUrls.vocal(take.vocal_stored_as);
  }
  return null;
}

/** Export MP3 playback/download URL for a take. */
export function takeExportUrl(take) {
  if (!take?.export_stored_as) return null;
  return mediaUrls.export(take.export_stored_as);
}

/** What the project detail page should offer (derived from status + upload_type). */
export function projectActions(project) {
  if (!project) return {};

  const isFullSong = project.upload_type === UPLOAD_TYPES.FULL_SONG;
  const hasInstrumental = Boolean(project.instrumental_stored_as);
  const isProcessing = project.status === PROJECT_STATUS.PROCESSING;
  // A full song still needs its vocals removed before it has a backing track.
  const needsVocalRemoval = isFullSong && !hasInstrumental;

  return {
    showSpinner: isProcessing,
    // Full song: one button removes vocals AND detects the key on the result.
    canRemoveAndDetect: needsVocalRemoval && !isProcessing,
    // Plain key detection — instrumentals, or full songs after vocal removal.
    canRedetectKey:
      !isProcessing && Boolean(backingTrackFilename(project)) && !needsVocalRemoval,
    // Recording is available whenever a backing track exists and we're not busy.
    canRecord: !isProcessing && Boolean(backingTrackFilename(project)),
  };
}

export const projectEndpoints = {
  create: () => `${API_URL}/projects`,
  mine: () => `${API_URL}/projects/mine`,
  one: (projectId) => `${API_URL}/projects/${projectId}`,
  update: (projectId) => `${API_URL}/projects/${projectId}`,
  removeVocals: (projectId) => `${API_URL}/projects/${projectId}/remove-vocals`,
  redetectKey: (projectId) => `${API_URL}/projects/${projectId}/redetect-key`,
  takes: (projectId) => `${API_URL}/projects/${projectId}/takes`,
  take: (projectId, takeId) => `${API_URL}/projects/${projectId}/takes/${takeId}`,
  pitchCorrectTake: (projectId, takeId) =>
    `${API_URL}/projects/${projectId}/takes/${takeId}/pitch-correct`,
  exportTake: (projectId, takeId) =>
    `${API_URL}/projects/${projectId}/takes/${takeId}/export`,
};
