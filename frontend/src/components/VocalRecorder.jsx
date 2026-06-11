import { useEffect, useRef, useState } from "react";

import MixPreview from "./MixPreview";
import { pauseAndReset, playFromStart } from "../utils/audioPlayback";

export default function VocalRecorder({
  instrumentalUrl = "",
  backingAudioRef = null,
  onSaveVocal,
  saving = false,
}) {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const fallbackBackingRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [playError, setPlayError] = useState(null);

  // Fallback player when parent does not pass a shared backing <audio> ref.
  useEffect(() => {
    if (backingAudioRef) return undefined;

    const audio = new Audio();
    audio.preload = "auto";
    fallbackBackingRef.current = audio;

    return () => {
      pauseAndReset(audio);
      audio.src = "";
      fallbackBackingRef.current = null;
    };
  }, [backingAudioRef]);

  useEffect(() => {
    const audio = fallbackBackingRef.current;
    if (!audio || !instrumentalUrl || backingAudioRef) return;
    audio.src = instrumentalUrl;
    audio.load();
  }, [instrumentalUrl, backingAudioRef]);

  const getBackingAudio = () => {
    if (backingAudioRef?.current) return backingAudioRef.current;
    return fallbackBackingRef.current;
  };

  const startRecording = async () => {
    setAudioUrl("");
    setAudioBlob(null);
    setPlayError(null);
    audioChunksRef.current = [];

    const backing = getBackingAudio();
    if (instrumentalUrl && backing) {
      try {
        backing.src = instrumentalUrl;
        await playFromStart(backing);
      } catch {
        setPlayError(
          "Could not start the backing track. Press play on the backing track player above, then try again."
        );
        return;
      }
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      pauseAndReset(backing);
      setPlayError("Microphone access was denied or unavailable.");
      return;
    }
    streamRef.current = stream;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      pauseAndReset(backing);
      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    };

    setIsRecording(true);
    mediaRecorder.start();
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
        <p className="msg-muted">
          Use the backing track player above to test audio, then start recording — it will play
          in sync.
        </p>
      ) : (
        <p className="msg-muted">Waiting for a backing track before recording.</p>
      )}

      {playError && <p className="msg-error">{playError}</p>}

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
          <MixPreview
            backingUrl={instrumentalUrl}
            vocalUrl={audioUrl}
            label="Play vocal with backing track"
          />
          <p className="msg-hint" style={{ marginTop: "0.75rem" }}>
            Save your vocal to the project, then use Auto-tune in the Vocal section above.
          </p>
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
