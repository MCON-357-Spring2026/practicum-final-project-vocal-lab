// One recorded take: preview playback plus auto-tune, export, download,
// rename, and delete controls. State/actions are owned by ProjectDetail.
import { useState } from "react";

import MixPreview from "./MixPreview";
import { takeExportUrl, takeVocalUrl } from "../api/projectContract";

export default function TakeCard({
  take,
  backingUrl,
  hasKey,
  busyAction,
  onAutoTune,
  onExport,
  onDownload,
  onRename,
  onDelete,
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(take.name);

  const vocalSrc = takeVocalUrl(take);
  const exportSrc = takeExportUrl(take);
  const anyBusy = Boolean(busyAction);
  const busyHere = (action) => busyAction === `${action}:${take.take_id}`;

  const startRename = () => {
    setDraft(take.name);
    setRenaming(true);
  };

  const saveRename = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === take.name) {
      setRenaming(false);
      return;
    }
    await onRename(take, trimmed);
    setRenaming(false);
  };

  return (
    <div className="card take-card">
      {renaming ? (
        <div className="rename-row">
          <input
            type="text"
            className="rename-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveRename();
              if (event.key === "Escape") setRenaming(false);
            }}
            aria-label="Take name"
            autoFocus
            disabled={busyHere("rename")}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={saveRename}
            disabled={busyHere("rename")}
          >
            {busyHere("rename") ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setRenaming(false)}
            disabled={busyHere("rename")}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="title-row">
          <h3 style={{ margin: 0 }}>{take.name}</h3>
          {take.is_tuned && (
            <span className="status-badge" data-status="tuned">
              Auto-tuned
            </span>
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={startRename}
            disabled={anyBusy}
          >
            Rename
          </button>
        </div>
      )}

      {vocalSrc && backingUrl && (
        <MixPreview
          backingUrl={backingUrl}
          vocalUrl={vocalSrc}
          label="Play this take with backing track"
          isAutoTuned={take.is_tuned}
        />
      )}

      <div className="btn-row" style={{ marginTop: "1rem" }}>
        {!take.is_tuned && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => onAutoTune(take)}
            disabled={anyBusy || !hasKey}
          >
            {busyHere("auto-tune") ? "Applying auto-tune…" : "Auto-tune this take"}
          </button>
        )}
        {!take.export_stored_as && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onExport(take)}
            disabled={anyBusy}
          >
            {busyHere("export") ? "Exporting…" : "Export mix"}
          </button>
        )}
        {exportSrc && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onDownload(take)}
            disabled={anyBusy}
          >
            {busyHere("download") ? "Downloading…" : "Download mix"}
          </button>
        )}
        <button
          type="button"
          className="btn-danger"
          onClick={() => onDelete(take)}
          disabled={anyBusy}
        >
          {busyHere("delete") ? "Deleting…" : "Delete take"}
        </button>
      </div>

      {!hasKey && !take.is_tuned && (
        <p className="msg-muted" style={{ marginTop: "0.5rem" }}>
          Detect the song key above to enable auto-tune.
        </p>
      )}
    </div>
  );
}
