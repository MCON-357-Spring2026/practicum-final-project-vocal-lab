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

/** Vocal playback — after auto-tune the file lives under /corrected/. */
export function vocalUrl(project) {
  if (!project?.vocal_stored_as) return null;
  if (
    project.status === PROJECT_STATUS.TUNED ||
    project.status === PROJECT_STATUS.EXPORTED
  ) {
    return mediaUrls.corrected(project.vocal_stored_as);
  }
  return mediaUrls.vocal(project.vocal_stored_as);
}

/** What the project detail page should offer (derived from status + upload_type). */
export function projectActions(project) {
  if (!project) return {};

  const isFullSong = project.upload_type === UPLOAD_TYPES.FULL_SONG;
  const hasInstrumental = Boolean(project.instrumental_stored_as);
  const isProcessing = project.status === PROJECT_STATUS.PROCESSING;

  return {
    showSpinner: isProcessing,
    canRemoveVocals:
      isFullSong &&
      !hasInstrumental &&
      project.status === PROJECT_STATUS.READY_TO_RECORD,
    canRedetectKey:
      project.status === PROJECT_STATUS.READY_TO_RECORD &&
      Boolean(backingTrackFilename(project)),
    canRecord:
      project.status === PROJECT_STATUS.READY_TO_RECORD && backingTrackFilename(project),
    canAutoTune:
      project.status === PROJECT_STATUS.VOCAL_RECORDED &&
      Boolean(project.vocal_stored_as) &&
      Boolean(project.detected_key),
    canStartNewTake:
      Boolean(project.vocal_stored_as) &&
      project.status !== PROJECT_STATUS.PROCESSING &&
      Boolean(backingTrackFilename(project)),
    canRerecord:
      Boolean(project.vocal_stored_as) &&
      project.status !== PROJECT_STATUS.PROCESSING &&
      Boolean(backingTrackFilename(project)),
    canExport:
      project.status === PROJECT_STATUS.VOCAL_RECORDED ||
      project.status === PROJECT_STATUS.TUNED,
    canPlayExport: project.status === PROJECT_STATUS.EXPORTED && project.export_stored_as,
  };
}

export const projectEndpoints = {
  create: () => `${API_URL}/projects`,
  mine: () => `${API_URL}/projects/mine`,
  one: (projectId) => `${API_URL}/projects/${projectId}`,
  removeVocals: (projectId) => `${API_URL}/projects/${projectId}/remove-vocals`,
  redetectKey: (projectId) => `${API_URL}/projects/${projectId}/redetect-key`,
  saveVocal: (projectId) => `${API_URL}/projects/${projectId}/vocal`,
  clearVocal: (projectId) => `${API_URL}/projects/${projectId}/vocal`,
  pitchCorrect: (projectId) => `${API_URL}/projects/${projectId}/pitch-correct`,
  exportMix: (projectId) => `${API_URL}/projects/${projectId}/export`,
};
