import { useState } from "react";

export default function PlaybackExport() {
  const [instrumentalPath, setInstrumentalPath] = useState("");
  const [vocalPath, setVocalPath] = useState("");
  const [exportResult, setExportResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const getFileName = (path) => {
    return path.split("/").pop();
  };

  const exportMix = async () => {
    setLoading(true);
    setExportResult(null);

    const response = await fetch("http://127.0.0.1:8000/audio/mix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instrumental_path: instrumentalPath,
        vocal_path: vocalPath,
      }),
    });

    const data = await response.json();
    setExportResult(data);
    setLoading(false);
  };

  return (
    <div>
      <h2>Playback & Export</h2>

      <div>
        <label>Instrumental File Path</label>
        <input
          value={instrumentalPath}
          onChange={(e) => setInstrumentalPath(e.target.value)}
          placeholder="uploads/song.mp3"
        />
      </div>

      <div>
        <label>Vocal Recording File Path</label>
        <input
          value={vocalPath}
          onChange={(e) => setVocalPath(e.target.value)}
          placeholder="recordings/vocal-recording.webm"
        />
      </div>

      {instrumentalPath && (
        <div>
          <h3>Instrumental Preview</h3>
          <audio
            controls
            src={`http://127.0.0.1:8000/uploads/${getFileName(instrumentalPath)}`}
          />
        </div>
      )}

      {vocalPath && (
        <div>
          <h3>Vocal Preview</h3>
          <audio
            controls
            src={`http://127.0.0.1:8000/recordings/${getFileName(vocalPath)}`}
          />
        </div>
      )}

      <button
        onClick={exportMix}
        disabled={!instrumentalPath || !vocalPath || loading}
      >
        {loading ? "Exporting..." : "Export Final Track"}
      </button>

      {exportResult && exportResult.filename && (
        <div>
          <h3>Final Export</h3>

          <audio
            controls
            src={`http://127.0.0.1:8000/exports/${exportResult.filename}`}
          />

          <br />

          <a
            href={`http://127.0.0.1:8000/exports/${exportResult.filename}`}
            download
          >
            Download MP3
          </a>
        </div>
      )}
    </div>
  );
}
