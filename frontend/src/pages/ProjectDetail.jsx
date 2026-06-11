import { Link, useNavigate, useParams } from "react-router-dom";

import { useCallback, useEffect, useState } from "react";

import VocalRecorder from "../components/VocalRecorder";

import StatusBadge from "../components/StatusBadge";

import {

  clearVocal,
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



export default function ProjectDetail() {

  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [busyAction, setBusyAction] = useState(null);



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

    await runAction("save-vocal", () => saveVocal(projectId, blob));

  };



  const handleAutoTune = () =>

    runAction("auto-tune", () => pitchCorrect(projectId));



  const handleExport = () =>

    runAction("export", () => exportProject(projectId));

  const handleRerecord = () => {
    const message =
      "Discard your vocal" +
      (project?.export_stored_as ? " and export" : "") +
      "? You can record again from scratch.";
    if (!window.confirm(message)) return;
    runAction("rerecord", () => clearVocal(projectId));
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



  return (

    <div className="page">

      <Link to="/" className="back-link">← Back to dashboard</Link>



      <header className="page-hero" style={{ marginBottom: "1.5rem" }}>

        <h1>{project.name}</h1>

        <div className="meta-row">

          <span>{UPLOAD_TYPE_LABELS[project.upload_type] ?? project.upload_type}</span>

          <StatusBadge status={project.status} />

          {project.detected_key && (

            <span>

              Key: <strong>{project.detected_key} {project.mode}</strong>

              {project.key_source ? ` (${project.key_source})` : ""}

            </span>

          )}

        </div>

      </header>



      {actions.showSpinner && (

        <p className="spinner-line">

          Processing… key detection or vocal removal may take a moment.

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

            <audio controls src={backingUrl} />

          </div>

        )}



        {project.vocal_stored_as && (

          <div className="media-block">

            <h3>Vocal</h3>

            <audio controls src={vocalUrl(project)} />

          </div>

        )}



        {project.export_stored_as && (

          <div className="media-block">

            <h3>Export</h3>

            <audio controls src={mediaUrls.export(project.export_stored_as)} />

            <p style={{ marginTop: "0.75rem" }}>

              <a

                href={mediaUrls.export(project.export_stored_as)}

                download

                className="btn-secondary"

                style={{ display: "inline-block", padding: "0.5rem 1rem", borderRadius: "10px" }}

              >

                Download export

              </a>

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

              {busyAction === "redetect-key" ? "Detecting key…" : "Re-detect key"}

            </button>

          )}

          {actions.canAutoTune && (

            <button

              type="button"

              className="btn-primary"

              onClick={handleAutoTune}

              disabled={Boolean(busyAction)}

            >

              {busyAction === "auto-tune" ? "Applying auto-tune…" : "Auto-tune"}

            </button>

          )}

          {actions.canExport && (

            <button

              type="button"

              className="btn-secondary"

              onClick={handleExport}

              disabled={Boolean(busyAction)}

            >

              {busyAction === "export" ? "Exporting…" : "Export mix"}

            </button>

          )}

          {actions.canRerecord && (

            <button

              type="button"

              className="btn-danger"

              onClick={handleRerecord}

              disabled={Boolean(busyAction)}

            >

              {busyAction === "rerecord" ? "Discarding…" : "Discard vocal & re-record"}

            </button>

          )}

        </div>



        {busyAction === "remove-vocals" && (

          <p className="msg-hint">

            Vocal removal can take several minutes. Please keep this page open.

          </p>

        )}

      </div>



      {actions.canRecord && (

        <VocalRecorder

          instrumentalUrl={backingUrl ?? ""}

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

