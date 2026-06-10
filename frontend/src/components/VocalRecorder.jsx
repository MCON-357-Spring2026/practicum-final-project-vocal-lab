import { useRef, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function VocalRecorder({ songKey = "C", instrumentalUrl = "" }) {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const instrumentalRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [correctedResult, setCorrectedResult] = useState(null);
  const [tuningLoading, setTuningLoading] = useState(false);

  const startRecording = async () => {
    setAudioUrl("");
    setAudioBlob(null);
    setUploadResult(null);
    setCorrectedResult(null);
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
      instrumentalRef.current.play().catch(() => {
        // Browser may block autoplay until user gesture; Start Recording is a gesture.
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const uploadRecording = async () => {
    const formData = new FormData();
    formData.append("file", audioBlob, "vocal-recording.webm");

    const response = await fetch(`${API_URL}/recording/save`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setUploadResult(data);
  };

  const applyAutoTune = async () => {
    setTuningLoading(true);

    const response = await fetch(`${API_URL}/recording/pitch-correct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vocal_path: uploadResult.file_path,
        song_key: songKey,
      }),
    });

    const data = await response.json();
    setCorrectedResult(data);
    setTuningLoading(false);
  };

  return (
    <div>
      <h2>Record Your Vocals</h2>

      {instrumentalUrl ? (
        <p>Backing track ready — it will play while you record.</p>
      ) : (
        <p>
          Upload a song, then use it as a backing track or remove vocals first.
        </p>
      )}

      {instrumentalUrl && (
        <audio ref={instrumentalRef} src={instrumentalUrl} preload="auto" />
      )}

      {!isRecording ? (
        <button type="button" onClick={startRecording}>
          Start Recording
        </button>
      ) : (
        <button type="button" onClick={stopRecording}>
          Stop Recording
        </button>
      )}

      {isRecording && <p>Recording with instrumental...</p>}

      {audioUrl && (
        <div>
          <h3>Original Recording Preview</h3>
          <audio controls src={audioUrl}></audio>

          <br />

          <button type="button" onClick={uploadRecording}>
            Save Recording
          </button>
        </div>
      )}

      {uploadResult && (
        <div>
          <p>{uploadResult.message}</p>

          <audio
            controls
            src={`${API_URL}/recordings/${uploadResult.filename}`}
          ></audio>

          <br />

          <button
            type="button"
            onClick={applyAutoTune}
            disabled={tuningLoading}
          >
            {tuningLoading ? "Applying Auto-Tune..." : "Apply Auto-Tune"}
          </button>
        </div>
      )}

      {correctedResult && correctedResult.filename && (
        <div>
          <h3>Tuned Vocal Preview</h3>

          <p>{correctedResult.message}</p>
          <p>Shift applied: {correctedResult.semitone_shift} semitones</p>

          <audio
            controls
            src={`${API_URL}/corrected/${correctedResult.filename}`}
          ></audio>
        </div>
      )}
    </div>
  );
}
