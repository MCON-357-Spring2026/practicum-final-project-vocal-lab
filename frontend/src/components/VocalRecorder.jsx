import { useRef, useState } from "react";

export default function VocalRecorder({
  instrumentalUrl = "",
  onSaveVocal,
  saving = false,
}) {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const instrumentalRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);

  const startRecording = async () => {
    setAudioUrl("");
    setAudioBlob(null);
    audioChunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));

      if (instrumentalRef.current) {
        instrumentalRef.current.pause();
        instrumentalRef.current.currentTime = 0;
      }

      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    };

    setIsRecording(true);
    mediaRecorder.start();

    if (instrumentalUrl && instrumentalRef.current) {
      instrumentalRef.current.currentTime = 0;
      instrumentalRef.current.play().catch(() => {});
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleSave = () => {
    if (audioBlob && onSaveVocal) {
      onSaveVocal(audioBlob);
    }
  };

  return (
    <div className={`card panel recorder-panel${isRecording ? " recorder-panel--active" : ""}`}>
      <h3>Record your vocals</h3>

      {instrumentalUrl ? (
        <p className="msg-muted">Backing track will play while you record.</p>
      ) : (
        <p className="msg-muted">Waiting for a backing track before recording.</p>
      )}

      {instrumentalUrl && (
        <audio ref={instrumentalRef} src={instrumentalUrl} preload="auto" hidden />
      )}

      <div className="btn-row">
        {!isRecording ? (
          <button
            type="button"
            className="btn-primary"
            onClick={startRecording}
            disabled={!instrumentalUrl || saving}
          >
            Start recording
          </button>
        ) : (
          <button type="button" className="btn-danger" onClick={stopRecording}>
            Stop recording
          </button>
        )}
      </div>

      {isRecording && <p className="recording-indicator">● Recording with backing track…</p>}

      {audioUrl && (
        <div className="media-block">
          <h4>Preview</h4>
          <audio controls src={audioUrl} />
          <div className="btn-row">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !audioBlob}
            >
              {saving ? "Saving…" : "Save vocal to project"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
