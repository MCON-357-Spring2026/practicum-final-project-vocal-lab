// Records a vocal over the backing track in the browser, previews the result,
// and hands the audio blob to the parent to save as a new take.
import { useEffect, useRef, useState } from "react";

import MixPreview from "./MixPreview";
import { pauseAndReset, playFromStart } from "../utils/audioPlayback";

export default function VocalRecorder({
  instrumentalUrl = "",
  onSaveVocal,
  onActiveChange,
  saving = false,
}) {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const backingRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [playError, setPlayError] = useState(null);

  // Tell the parent when we're "busy" (recording, or holding an unsaved
  // preview) so it never unmounts us mid-take — even if status changes would
  // otherwise hide the recorder.
  useEffect(() => {
    onActiveChange?.(isRecording || Boolean(audioBlob));
  }, [isRecording, audioBlob, onActiveChange]);

  // Defensive cleanup: if this component ever unmounts while live, stop the
  // mic stream and backing track so audio doesn't keep playing in the background.
  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // recorder already stopped
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      pauseAndReset(backingRef.current);
    };
  }, []);

  const startRecording = async () => {
    setAudioUrl("");
    setAudioBlob(null);
    setPlayError(null);
    audioChunksRef.current = [];

    const backing = backingRef.current;

    // Only the backing track should be audible while recording — silence
    // every other audio player on the page (original/instrumental/previews).
    document.querySelectorAll("audio").forEach((el) => {
      if (el !== backing) {
        el.pause();
      }
    });

    // Request the mic FIRST. The permission/initialization delay used to happen
    // after the backing track had already started, which pushed the recording
    // (and the red indicator) ~1s behind the music. Doing it up front lets the
    // track and the recorder start together, in sync.
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
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

    if (instrumentalUrl && backing) {
      try {
        await playFromStart(backing);
      } catch {
        stream.getTracks().forEach((track) => track.stop());
        setPlayError(
          "Could not start the backing track. Press play on the backing track player below, then try again."
        );
        return;
      }
    }

    // Start the indicator and the recorder together, right as the track plays.
    setIsRecording(true);
    mediaRecorder.start();
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleSave = async () => {
    if (!audioBlob || !onSaveVocal) return;
    try {
      await onSaveVocal(audioBlob);
      // Saved as a take — clear the preview so the next take starts fresh.
      setAudioBlob(null);
      setAudioUrl("");
    } catch {
      // Parent surfaces the error; keep the preview so the user can retry.
    }
  };

  // Drop the unsaved preview so "Start recording" comes back for a fresh take.
  const handleDiscard = () => {
    setAudioBlob(null);
    setAudioUrl("");
    setPlayError(null);
  };

  return (
    <div className={`card panel recorder-panel${isRecording ? " recorder-panel--active" : ""}`}>
      <h3>Record your vocals</h3>

      {instrumentalUrl ? (
        <div className="media-block">
          <h4>Backing track</h4>
          <audio ref={backingRef} controls src={instrumentalUrl} preload="auto" />
          <p className="msg-muted" style={{ marginTop: "0.5rem" }}>
            This plays while you record. Preview it here, then press Start recording — it will
            restart from the beginning and play in sync.
          </p>
        </div>
      ) : (
        <p className="msg-muted">Waiting for a backing track before recording.</p>
      )}

      {playError && <p className="msg-error">{playError}</p>}

      {isRecording ? (
        <div className="btn-row">
          <button type="button" className="btn-danger" onClick={stopRecording}>
            Stop recording
          </button>
        </div>
      ) : (
        // While an unsaved preview exists, hide "Start recording" — the user
        // saves it as a take or discards it to record again.
        !audioBlob && (
          <div className="btn-row">
            <button
              type="button"
              className="btn-primary"
              onClick={startRecording}
              disabled={!instrumentalUrl || saving}
            >
              Start recording
            </button>
          </div>
        )
      )}

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
            Save this as a take. It appears in “Your takes” below, where you can auto-tune,
            export, or rename it. Record as many takes as you like.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !audioBlob}
            >
              {saving ? "Saving…" : "Save as new take"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleDiscard}
              disabled={saving}
            >
              Discard &amp; re-record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
