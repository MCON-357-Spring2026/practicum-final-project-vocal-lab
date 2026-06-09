/**
 * Upload + key detection + vocal removal UI.
 *
 * Flow: login → upload (auto key on full song) → remove vocals →
 *       optional re-detect key on instrumental → select backing track for recording.
 */
import { useState } from "react";

// FastAPI backend URL (must match CORS allow_origins in main.py).
const API_URL = "http://127.0.0.1:8000";

// Label reflects whether key was detected on upload or after vocal removal.
function keyLabel(source) {
  if (source === "instrumental") return "Key (instrumental)";
  return "Key (full song)";
}

// Shows detected_key from the API; key_source tells the user which pass ran.
function KeyDisplay({ recording }) {
  if (!recording?.detected_key) return null;

  return (
    <p>
      {keyLabel(recording.key_source)}: {recording.detected_key} {recording.mode}{" "}
      (confidence: {recording.confidence})
    </p>
  );
}

export default function AudioUpload({ onKeyDetected, onInstrumentalReady }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Restore token from last session so user stays logged in on refresh.
  const [token, setToken] = useState(
    () => sessionStorage.getItem("access_token") ?? ""
  );
  const [file, setFile] = useState(null);
  const [instrumentalFile, setInstrumentalFile] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingInstrumental, setUploadingInstrumental] = useState(false);
  const [backingTrackLabel, setBackingTrackLabel] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [result, setResult] = useState(null);
  // Track which recording is busy (allows per-item buttons in the list).
  const [removingVocalsFor, setRemovingVocalsFor] = useState(null);
  const [redetectingKeyFor, setRedetectingKeyFor] = useState(null);
  const [error, setError] = useState(null);

  const notifyKeyDetected = (recording) => {
    if (recording?.detected_key && onKeyDetected) {
      onKeyDetected(recording.detected_key);
    }
  };

  const useAsBackingTrack = (storedAs, label) => {
    if (onInstrumentalReady) {
      onInstrumentalReady(`${API_URL}/uploads/${storedAs}`);
    }
    setBackingTrackLabel(label);
  };

  const useInstrumentalAsBackingTrack = (instrumentalStoredAs, label) => {
    if (onInstrumentalReady) {
      onInstrumentalReady(`${API_URL}/instrumentals/${instrumentalStoredAs}`);
    }
    setBackingTrackLabel(label);
  };

  // Keep upload result and "My Recordings" in sync after remove-vocals / redetect-key.
  const updateRecordingInState = (updated) => {
    setRecordings((prev) =>
      prev.map((item) => (item.file_id === updated.file_id ? updated : item))
    );
    setResult((prev) => (prev?.file_id === updated.file_id ? { ...prev, ...updated } : prev));
    notifyKeyDetected(updated);
  };

  // POST /audio/recordings/{file_id}/remove-vocals — Demucs + saves instrumental_stored_as.
  const removeVocalsForRecording = async (fileId) => {
    setRemovingVocalsFor(fileId);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/audio/recordings/${fileId}/remove-vocals`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Vocal removal failed.");
      }

      updateRecordingInState(data);

      if (data.instrumental_stored_as) {
        useInstrumentalAsBackingTrack(
          data.instrumental_stored_as,
          `Instrumental (vocals removed): ${data.filename}`
        );
      }

      return data;
    } finally {
      setRemovingVocalsFor(null);
    }
  };

  // POST /audio/recordings/{file_id}/redetect-key — key on instrumental only.
  const redetectKeyForRecording = async (fileId) => {
    setRedetectingKeyFor(fileId);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/audio/recordings/${fileId}/redetect-key`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Key re-detection failed.");
      }

      updateRecordingInState(data);
      return data;
    } finally {
      setRedetectingKeyFor(null);
    }
  };

  // GET /audio/mine — list all recordings for the logged-in user.
  const fetchRecordings = async (accessToken) => {
    const res = await fetch(`${API_URL}/audio/mine`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Could not load your recordings.");
    }

    setRecordings(data);
  };

  // POST /auth/login — get JWT, then load the user's recordings.
  const login = async () => {
    setLoggingIn(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Login failed");
      }

      setToken(data.access_token);
      sessionStorage.setItem("access_token", data.access_token);
      await fetchRecordings(data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  // POST /audio/upload — backend auto-detects key on the full song.
  const uploadFile = async () => {
    if (!file) return;
    if (!token) {
      setError("Log in first before uploading.");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file); // key must match backend param name

    try {
      const res = await fetch(`${API_URL}/audio/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : "Upload failed. Check file type and try again.";
        throw new Error(message);
      }

      setResult(data);
      await fetchRecordings(token);
      notifyKeyDetected(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadInstrumental = async () => {
    if (!instrumentalFile) return;
    if (!token) {
      setError("Log in first before uploading.");
      return;
    }

    setUploadingInstrumental(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", instrumentalFile);

    try {
      const res = await fetch(`${API_URL}/audio/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : "Instrumental upload failed. Check file type and try again.";
        throw new Error(message);
      }

      useAsBackingTrack(data.stored_as, `Instrumental: ${data.filename}`);
      await fetchRecordings(token);
      notifyKeyDetected(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingInstrumental(false);
    }
  };

  // Full-song flow: play original → remove vocals → play instrumental → optional re-detect key.
  const renderRecordingActions = (recording) => {
    const isRemoving = removingVocalsFor === recording.file_id;
    const isRedetecting = redetectingKeyFor === recording.file_id;

    return (
      <>
        {/* Original full song — static file from POST /upload */}
        <audio controls src={`${API_URL}/uploads/${recording.stored_as}`} />

        <br />

        <button
          type="button"
          onClick={() =>
            useAsBackingTrack(recording.stored_as, recording.filename)
          }
          style={{ marginRight: 8, marginTop: 8 }}
        >
          Use as Backing Track
        </button>

        <button
          type="button"
          onClick={() =>
            removeVocalsForRecording(recording.file_id).catch((err) =>
              setError(err.message)
            )
          }
          disabled={isRemoving || isRedetecting}
        >
          {isRemoving ? "Removing vocals..." : "Remove Vocals"}
        </button>

        {recording.instrumental_stored_as && (
          <div style={{ marginTop: 16 }}>
            {/* Shown after remove-vocals; re-detect updates KeyDisplay above */}
            <p>Instrumental (vocals removed)</p>
            <audio
              controls
              src={`${API_URL}/instrumentals/${recording.instrumental_stored_as}`}
            />
            <br />
            <button
              type="button"
              onClick={() =>
                useInstrumentalAsBackingTrack(
                  recording.instrumental_stored_as,
                  `Instrumental: ${recording.filename}`
                )
              }
              style={{ marginRight: 8, marginTop: 8 }}
            >
              Use Instrumental as Backing Track
            </button>
            <button
              type="button"
              onClick={() =>
                redetectKeyForRecording(recording.file_id).catch((err) =>
                  setError(err.message)
                )
              }
              disabled={isRedetecting || isRemoving}
              style={{ marginTop: 8 }}
            >
              {isRedetecting ? "Re-detecting key..." : "Re-detect Key (instrumental)"}
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Log In</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="button" onClick={login} disabled={loggingIn || !email || !password}>
          {loggingIn ? "Logging in..." : "Log In"}
        </button>
      </div>

      {token && <p style={{ color: "green" }}>Logged in — you can upload now.</p>}

      <h2 style={{ marginTop: 24 }}>Upload Instrumental</h2>
      <p>Upload a ready-made instrumental to use as backing track while recording.</p>

      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setInstrumentalFile(e.target.files[0])}
      />

      <button
        type="button"
        onClick={uploadInstrumental}
        disabled={!instrumentalFile || uploadingInstrumental || !token}
        style={{ marginLeft: 12 }}
      >
        {uploadingInstrumental ? "Uploading..." : "Upload Instrumental"}
      </button>

      <h2 style={{ marginTop: 24 }}>Upload Song</h2>
      <p>Upload a full song, then remove vocals or use it directly as backing track.</p>

      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button
        type="button"
        onClick={uploadFile}
        disabled={!file || uploading || !token}
        style={{ marginLeft: 12 }}
      >
        {uploading ? "Uploading & detecting key..." : "Upload"}
      </button>

      {backingTrackLabel && (
        <p style={{ color: "green", marginTop: 12 }}>
          Backing track selected: {backingTrackLabel}
        </p>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 16 }}>
          <p>Uploaded successfully!</p>
          <p>{result.filename}</p>
          <p>Recording id: {result.id}</p>
          {/* key_source is "original" right after upload */}
          <KeyDisplay recording={result} />
          {renderRecordingActions(result)}
        </div>
      )}

      {token && (
        <div style={{ marginTop: 24 }}>
          <h2>My Recordings</h2>
          {recordings.length === 0 ? (
            <p>No recordings yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {recordings.map((recording) => (
                <li key={recording.id} style={{ marginBottom: 16 }}>
                  <p>{recording.filename}</p>
                  <KeyDisplay recording={recording} />
                  {renderRecordingActions(recording)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
