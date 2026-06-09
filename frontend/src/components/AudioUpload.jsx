import { useState } from "react";

// FastAPI backend URL (must match CORS allow_origins in main.py).
const API_URL = "http://127.0.0.1:8000";

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
  const [instrumentalResult, setInstrumentalResult] = useState(null);
  const [removingVocals, setRemovingVocals] = useState(false);
  const [error, setError] = useState(null);

  const removeVocals = async (filePath) => {
    setRemovingVocals(true);
    setError(null);
    setInstrumentalResult(null);

    const response = await fetch(`${API_URL}/audio/remove-vocals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_path: filePath,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setRemovingVocals(false);
      throw new Error(data.detail || "Vocal removal failed.");
    }

    console.log(data);
    setInstrumentalResult(data);
    if (onInstrumentalReady) {
      onInstrumentalReady(`${API_URL}/instrumentals/${data.filename}`);
    }
    setBackingTrackLabel(`Instrumental (vocals removed): ${data.filename}`);
    setRemovingVocals(false);
    return data;
  };

  const useAsBackingTrack = (storedAs, label) => {
    if (onInstrumentalReady) {
      onInstrumentalReady(`${API_URL}/uploads/${storedAs}`);
    }
    setBackingTrackLabel(label);
  };

  const detectKeyForUpload = async (data) => {
    let detectedKey = data.detected_key;

    if (!detectedKey) {
      const keyRes = await fetch(`${API_URL}/audio/detect-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: `uploads/${data.stored_as}` }),
      });

      if (keyRes.ok) {
        const keyData = await keyRes.json();
        detectedKey = keyData.key;
      }
    }

    if (detectedKey && onKeyDetected) {
      onKeyDetected(detectedKey);
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

  // POST /audio/upload — send file as form-data with Bearer token.
  const uploadFile = async () => {
    if (!file) return;
    if (!token) {
      setError("Log in first before uploading.");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    setInstrumentalResult(null);

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
      await detectKeyForUpload(data);
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
      await detectKeyForUpload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingInstrumental(false);
    }
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
        {uploading ? "Uploading..." : "Upload"}
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
          {/* Play via static files mount: GET /uploads/{stored_as} */}
          <audio controls src={`${API_URL}/uploads/${result.stored_as}`} />

          <br />

          <button
            type="button"
            onClick={() =>
              useAsBackingTrack(result.stored_as, `Song: ${result.filename}`)
            }
            style={{ marginRight: 8 }}
          >
            Use as Backing Track
          </button>

          <button
            type="button"
            onClick={() =>
              removeVocals(`uploads/${result.stored_as}`).catch((err) =>
                setError(err.message)
              )
            }
            disabled={removingVocals}
          >
            {removingVocals ? "Removing vocals..." : "Remove Vocals"}
          </button>

          {instrumentalResult && (
            <div style={{ marginTop: 16 }}>
              <p>{instrumentalResult.message}</p>
              <audio
                controls
                src={`${API_URL}/instrumentals/${instrumentalResult.filename}`}
              />
            </div>
          )}
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
                  <audio controls src={`${API_URL}/uploads/${recording.stored_as}`} />
                  <br />
                  <button
                    type="button"
                    onClick={() =>
                      useAsBackingTrack(
                        recording.stored_as,
                        recording.filename
                      )
                    }
                    style={{ marginRight: 8 }}
                  >
                    Use as Backing Track
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      removeVocals(`uploads/${recording.stored_as}`).catch((err) =>
                        setError(err.message)
                      )
                    }
                    disabled={removingVocals}
                  >
                    {removingVocals ? "Removing vocals..." : "Remove Vocals"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
