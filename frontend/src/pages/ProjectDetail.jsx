// Project detail page: the full studio workflow for one project — backing
// track, key detection, recording takes, and per-take auto-tune/export.
import { Link, useNavigate, useParams } from "react-router-dom";

import { useCallback, useEffect, useState } from "react";

import TakeCard from "../components/TakeCard";
import VocalRecorder from "../components/VocalRecorder";
import StatusBadge from "../components/StatusBadge";

import {
  createTake,
  deleteProject,
  deleteTake,
  exportTake,
  fetchProject,
  pitchCorrectTake,
  redetectKey,
  removeVocals,
  renameTake,
  updateProject,
} from "../api/projects";

import {
  PROJECT_STATUS,
  UPLOAD_TYPE_LABELS,
  backingTrackUrl,
  mediaUrls,
  projectActions,
} from "../api/projectContract";

import { downloadFile } from "../utils/downloadFile";

function sanitizeFilename(value, fallback = "export") {
  const cleaned = (value || "").replace(/[^\w\-. ]+/g, "_").trim();
  return cleaned || fallback;
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [recorderActive, setRecorderActive] = useState(false);

  const loadProject = useCallback(
    async (options = {}) => {
      const { silent = false } = options;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await fetchProject(projectId);
        setProject(data);
        return data;
      } catch (err) {
        if (!silent) {
          setError(err.message);
          setProject(null);
        }
        throw err;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (project?.status !== PROJECT_STATUS.PROCESSING) return undefined;
    const interval = setInterval(() => {
      loadProject({ silent: true }).catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, [project?.status, loadProject]);

  const runAction = async (actionName, apiCall) => {
    setBusyAction(actionName);
    setError(null);
    try {
      const updated = await apiCall();
      setProject(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveAndDetect = () =>
    runAction("remove-and-detect", async () => {
      await removeVocals(projectId);
      return redetectKey(projectId);
    });

  const handleRedetectKey = () =>
    runAction("redetect-key", () => redetectKey(projectId));

  // Throws on failure so the recorder keeps the preview for a retry.
  const handleSaveTake = async (blob) => {
    setBusyAction("save-take");
    setError(null);
    try {
      const updated = await createTake(projectId, blob);
      setProject(updated);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusyAction(null);
    }
  };

  const handleAutoTuneTake = (take) =>
    runAction(`auto-tune:${take.take_id}`, () =>
      pitchCorrectTake(projectId, take.take_id),
    );

  const handleExportTake = (take) =>
    runAction(`export:${take.take_id}`, () => exportTake(projectId, take.take_id));

  const handleRenameTake = (take, name) =>
    runAction(`rename:${take.take_id}`, () =>
      renameTake(projectId, take.take_id, name),
    );

  const handleDeleteTake = async (take) => {
    if (!window.confirm(`Delete "${take.name}"? This take and its files will be removed.`)) {
      return;
    }
    await runAction(`delete:${take.take_id}`, () =>
      deleteTake(projectId, take.take_id),
    );
  };

  const handleDownloadTake = async (take) => {
    if (!take.export_stored_as) return;
    setBusyAction(`download:${take.take_id}`);
    setError(null);
    try {
      const base = sanitizeFilename(`${project.name} - ${take.name}`);
      await downloadFile(mediaUrls.export(take.export_stored_as), `${base}.mp3`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartRename = () => {
    setNameDraft(project?.name ?? "");
    setRenaming(true);
    setError(null);
  };

  const handleCancelRename = () => {
    setRenaming(false);
  };

  const handleSaveRename = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === project?.name) {
      setRenaming(false);
      return;
    }
    setBusyAction("rename-project");
    setError(null);
    try {
      const updated = await updateProject(projectId, trimmed);
      setProject(updated);
      setRenaming(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    const message = `Delete "${project.name}"? All uploads, takes, and exports will be removed. This cannot be undone.`;
    if (!window.confirm(message)) return;

    setBusyAction("delete-project");
    setError(null);
    try {
      await deleteProject(projectId);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Link to="/" className="back-link">← Back to dashboard</Link>
        <p className="spinner-line">Loading project…</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="page">
        <Link to="/" className="back-link">← Back to dashboard</Link>
        <p className="msg-error">{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page">
        <Link to="/" className="back-link">← Back to dashboard</Link>
        <p className="msg-muted">Project not found.</p>
      </div>
    );
  }

  const actions = projectActions(project);
  const backingUrl = backingTrackUrl(project);
  const hasKey = Boolean(project.detected_key);
  const takes = project.takes ?? [];
  const busy = Boolean(busyAction);

  // Lock recording while the latest take is recorded but not yet exported. The
  // recorder reappears once that take is exported or deleted. Only the most
  // recent take matters — editing/auto-tuning an older take won't hide it.
  // (Backend returns takes newest-first.)
  const latestTake = takes[0] ?? null;
  const hasPendingTake = Boolean(latestTake && !latestTake.export_stored_as);
  // Keep the recorder visible while a take is actively being recorded or has an
  // unsaved preview, so a background status change can't yank it mid-recording.
  const canRecord = (actions.canRecord && !hasPendingTake) || recorderActive;

  return (
    <div className="page">
      <Link to="/" className="back-link">← Back to dashboard</Link>

      <header className="page-hero" style={{ marginBottom: "1.5rem" }}>
        {renaming ? (
          <div className="rename-row">
            <input
              type="text"
              className="rename-input"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSaveRename();
                if (event.key === "Escape") handleCancelRename();
              }}
              aria-label="Project name"
              autoFocus
              disabled={busyAction === "rename-project"}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveRename}
              disabled={busyAction === "rename-project"}
            >
              {busyAction === "rename-project" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleCancelRename}
              disabled={busyAction === "rename-project"}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="title-row">
            <h1>{project.name}</h1>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleStartRename}
              disabled={busy}
            >
              Rename
            </button>
          </div>
        )}

        <div className="meta-row">
          <span>{UPLOAD_TYPE_LABELS[project.upload_type] ?? project.upload_type}</span>
          <StatusBadge status={project.status} />
          {project.detected_key ? (
            <span>
              Key: <strong>{project.detected_key} {project.mode}</strong>
              {project.key_source ? ` (${project.key_source})` : ""}
            </span>
          ) : (
            project.status !== PROJECT_STATUS.PROCESSING && (
              <span className="msg-muted">Key not detected yet</span>
            )
          )}
        </div>
      </header>

      {actions.showSpinner && (
        <p className="spinner-line">
          Processing… vocal removal may take several minutes. Please keep this page open.
        </p>
      )}

      {error && <p className="msg-error">{error}</p>}

      <div className="card">
        {project.original_stored_as && (
          <div className="media-block">
            <h3>Original song</h3>
            <audio controls src={mediaUrls.original(project.original_stored_as)} />
          </div>
        )}

        {project.instrumental_stored_as && (
          <div className="media-block">
            <h3>Instrumental</h3>
            <audio controls src={mediaUrls.instrumental(project.instrumental_stored_as)} />
          </div>
        )}

        <div className="btn-row" style={{ marginTop: "1.25rem" }}>
          {actions.canRemoveAndDetect && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleRemoveAndDetect}
              disabled={busy}
            >
              {busyAction === "remove-and-detect"
                ? "Removing vocals & detecting key…"
                : "Remove vocals & detect key"}
            </button>
          )}

          {actions.canRedetectKey && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleRedetectKey}
              disabled={busy}
            >
              {busyAction === "redetect-key"
                ? "Detecting key…"
                : project.detected_key
                  ? "Re-detect key"
                  : "Detect key"}
            </button>
          )}
        </div>

        {busyAction === "remove-and-detect" && (
          <p className="msg-hint">
            Vocal removal can take several minutes. Please keep this page open.
          </p>
        )}
      </div>

      {canRecord && (
        <VocalRecorder
          instrumentalUrl={backingUrl ?? ""}
          onSaveVocal={handleSaveTake}
          onActiveChange={setRecorderActive}
          saving={busyAction === "save-take"}
        />
      )}

      <section className="section" aria-label="Your takes">
        <div className="section__header">
          <h2 className="neon-label">Your takes</h2>
        </div>

        {actions.canRecord && hasPendingTake && !recorderActive && (
          <p className="msg-hint">
            Export this take’s mix or delete it to record again.
          </p>
        )}

        {takes.length === 0 ? (
          <p className="msg-muted">
            No takes yet. Record above and save — each recording becomes its own take.
          </p>
        ) : (
          <div className="take-list">
            {takes.map((take) => (
              <TakeCard
                key={take.take_id}
                take={take}
                backingUrl={backingUrl}
                hasKey={hasKey}
                busyAction={busyAction}
                onAutoTune={handleAutoTuneTake}
                onExport={handleExportTake}
                onDownload={handleDownloadTake}
                onRename={handleRenameTake}
                onDelete={handleDeleteTake}
              />
            ))}
          </div>
        )}
      </section>

      <section className="danger-zone" aria-label="Delete project">
        <h2 className="neon-label">Danger zone</h2>
        <p className="msg-muted">
          Permanently remove this project and all associated audio files from your account.
        </p>
        <button
          type="button"
          className="btn-danger"
          onClick={handleDelete}
          disabled={busy}
        >
          {busyAction === "delete-project" ? "Deleting…" : "Delete project"}
        </button>
      </section>
    </div>
  );
}
