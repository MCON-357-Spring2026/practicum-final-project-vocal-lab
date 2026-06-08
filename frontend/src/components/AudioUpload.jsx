import { useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function AudioUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/audio/upload`, {
        method: "POST",
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
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload Song</h2>

      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button
        type="button"
        onClick={uploadFile}
        disabled={!file || uploading}
        style={{ marginLeft: 12 }}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 16 }}>
          <p>Uploaded successfully!</p>
          <p>{result.filename}</p>
          <audio controls src={`${API_URL}/uploads/${result.stored_as}`} />
        </div>
      )}
    </div>
  );
}
