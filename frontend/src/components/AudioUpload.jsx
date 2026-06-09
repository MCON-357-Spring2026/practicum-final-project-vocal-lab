import { useState } from "react";

// FastAPI backend URL (must match CORS allow_origins in main.py).
const API_URL = "http://127.0.0.1:8000";

export default function AudioUpload() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Restore token from last session so user stays logged in on refresh.
  const [token, setToken] = useState(
    () => sessionStorage.getItem("access_token") ?? ""
  );
  const [file, setFile] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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

  // POST /audio/upload — backend also runs key detection (may take a few seconds).
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
      await fetchRecordings(token); // refresh list after upload
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
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

      <h2 style={{ marginTop: 24 }}>Upload Song</h2>

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

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 16 }}>
          <p>Uploaded successfully!</p>
          <p>{result.filename}</p>
          <p>Recording id: {result.id}</p>
          {/* Auto key detection result from backend (librosa) */}
          {result.detected_key && (
            <p>
              Key: {result.detected_key} {result.mode} (confidence: {result.confidence})
            </p>
          )}
          {/* Play via static files mount: GET /uploads/{stored_as} */}
          <audio controls src={`${API_URL}/uploads/${result.stored_as}`} />
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
                  {/* Key stored in DB when upload ran auto-detection */}
                  {recording.detected_key && (
                    <p>
                      Key: {recording.detected_key} {recording.mode} (confidence:{" "}
                      {recording.confidence})
                    </p>
                  )}
                  <audio controls src={`${API_URL}/uploads/${recording.stored_as}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
