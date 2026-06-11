import { Link, useNavigate, useParams } from "react-router-dom";

import { useCallback, useEffect, useRef, useState } from "react";

import MixPreview from "../components/MixPreview";
import VocalRecorder from "../components/VocalRecorder";

import StatusBadge from "../components/StatusBadge";

import {

  deleteProject,
  exportProject,
  fetchProject,
  pitchCorrect,
  redetectKey,
  removeVocals,
  saveVocal,
} from "../api/projects";

import {

  PROJECT_STATUS,

  UPLOAD_TYPE_LABELS,

  backingTrackUrl,

  mediaUrls,

  projectActions,

  vocalUrl,

} from "../api/projectContract";

import { downloadFile } from "../utils/downloadFile";



export default function ProjectDetail() {

  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [busyAction, setBusyAction] = useState(null);
  const [newTakeMode, setNewTakeMode] = useState(false);
  const backingAudioRef = useRef(null);



  const loadProject = useCallback(async (options = {}) => {

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

  }, [projectId]);



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



  const handleRemoveVocals = () =>

    runAction("remove-vocals", () => removeVocals(projectId));



  const handleRedetectKey = () =>

    runAction("redetect-key", () => redetectKey(projectId));



  const handleSaveVocal = async (blob) => {
    setBusyAction("save-vocal");
    setError(null);
    try {
      const updated = await saveVocal(projectId, blob);
      setProject(updated);
      setNewTakeMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
    }
  };



  const handleAutoTune = () =>

    runAction("auto-tune", () => pitchCorrect(projectId));



  const handleExport = () =>

    runAction("export", () => exportProject(projectId));

  const handleStartNewTake = () => {
    setNewTakeMode(true);
    setError(null);
  };

  const handleCancelNewTake = () => {
    setNewTakeMode(false);
  };

  const handleDownloadExport = async () => {
    if (!project?.export_stored_as) return;

    setBusyAction("download");
    setError(null);
    try {
      await downloadFile(
        mediaUrls.export(project.export_stored_as),
        project.export_stored_as,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    const message =
      `Delete "${project.name}"? All uploads, vocals, and exports will be removed. This cannot be undone.`;
    if (!window.confirm(message)) return;

    setBusyAction("delete");
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
  const showRecorder = actions.canRecord || newTakeMode;



  return (

    <div className="page">

      <Link to="/" className="back-link">← Back to dashboard</Link>



      <header className="page-hero" style={{ marginBottom: "1.5rem" }}>

        <h1>{project.name}</h1>

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



        {backingUrl && (

          <div className="media-block">

            <h3>Backing track (for recording)</h3>

            <audio ref={backingAudioRef} controls src={backingUrl} preload="auto" />

          </div>

        )}



        {project.vocal_stored_as && (

          <div className="media-block">

            <h3>
              {newTakeMode
                ? "Previous take"
                : project.status === PROJECT_STATUS.TUNED ||
                    project.status === PROJECT_STATUS.EXPORTED
                  ? "Your last take"
                  : "Vocal"}
            </h3>

            <MixPreview
              backingUrl={backingUrl}
              vocalUrl={vocalUrl(project)}
              label={
                project.status === PROJECT_STATUS.TUNED ||
                project.status === PROJECT_STATUS.EXPORTED
                  ? "Play auto-tune final mix"
                  : "Play vocal with backing track"
              }
              isAutoTuned={
                project.status === PROJECT_STATUS.TUNED ||
                project.status === PROJECT_STATUS.EXPORTED
              }
            />

            {actions.canAutoTune && !newTakeMode && (
              <div className="btn-row" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAutoTune}
                  disabled={Boolean(busyAction)}
                >
                  {busyAction === "auto-tune" ? "Applying auto-tune…" : "Auto-tune vocal"}
                </button>
              </div>
            )}

            {project.status === PROJECT_STATUS.TUNED && (
              <p className="msg-muted" style={{ marginTop: "0.5rem" }}>
                Auto-tune applied. Export your mix below, or use Record new take to try again.
              </p>
            )}

          </div>

        )}



        {project.export_stored_as && (

          <div className="media-block">

            <h3>{newTakeMode ? "Previous export" : "Export"}</h3>

            <audio controls src={mediaUrls.export(project.export_stored_as)} />

            <div className="btn-row" style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDownloadExport}
                disabled={Boolean(busyAction)}
              >
                {busyAction === "download" ? "Downloading…" : "Download export"}
              </button>

              {actions.canStartNewTake && !newTakeMode && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleStartNewTake}
                  disabled={Boolean(busyAction)}
                >
                  Record new take
                </button>
              )}
            </div>

            <p className="msg-muted" style={{ marginTop: "0.75rem" }}>
              Your export stays on this project — download it again anytime. Record new take
              keeps this export until you save a different vocal.
            </p>

          </div>

        )}



        <div className="btn-row" style={{ marginTop: "1.25rem" }}>

          {actions.canRemoveVocals && (

            <button

              type="button"

              className="btn-primary"

              onClick={handleRemoveVocals}

              disabled={Boolean(busyAction)}

            >

              {busyAction === "remove-vocals" ? "Removing vocals…" : "Remove vocals"}

            </button>

          )}

          {actions.canRedetectKey && (

            <button

              type="button"

              className="btn-secondary"

              onClick={handleRedetectKey}

              disabled={Boolean(busyAction)}

            >

              {busyAction === "redetect-key"
                ? "Detecting key…"
                : project.detected_key
                  ? "Re-detect key"
                  : "Detect key"}

            </button>

          )}

          {actions.canExport && !newTakeMode && (

            <button

              type="button"

              className="btn-secondary"

              onClick={handleExport}

              disabled={Boolean(busyAction)}

            >

              {busyAction === "export" ? "Exporting…" : "Export mix"}

            </button>

          )}

          {actions.canStartNewTake && project.status !== PROJECT_STATUS.EXPORTED && !newTakeMode && (

            <button

              type="button"

              className="btn-secondary"

              onClick={handleStartNewTake}

              disabled={Boolean(busyAction)}

            >

              Record new take

            </button>

          )}

        </div>



        {busyAction === "remove-vocals" && (

          <p className="msg-hint">

            Vocal removal can take several minutes. Please keep this page open.

          </p>

        )}

      </div>



      {newTakeMode && (
        <div className="card new-take-banner">
          <p className="msg-muted" style={{ margin: 0 }}>
            Recording a new take — your previous vocal and export stay available until you save
            this one. No need to re-upload or remove vocals.
          </p>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleCancelNewTake}
            disabled={Boolean(busyAction)}
            style={{ marginTop: "0.75rem" }}
          >
            Cancel new take
          </button>
        </div>
      )}

      {showRecorder && (

        <VocalRecorder

          instrumentalUrl={backingUrl ?? ""}

          backingAudioRef={backingAudioRef}

          onSaveVocal={handleSaveVocal}

          saving={busyAction === "save-vocal"}

        />

      )}

      <section className="danger-zone" aria-label="Delete project">
        <h2 className="neon-label">Danger zone</h2>
        <p className="msg-muted">
          Permanently remove this project and all associated audio files from your account.
        </p>
        <button
          type="button"
          className="btn-danger"
          onClick={handleDelete}
          disabled={Boolean(busyAction)}
        >
          {busyAction === "delete" ? "Deleting…" : "Delete project"}
        </button>
      </section>

    </div>

  );

}

