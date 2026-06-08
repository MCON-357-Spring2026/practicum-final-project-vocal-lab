import { useRef, useState } from "react";

export default function VocalRecorder() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const startRecording = async () => {
    setAudioUrl("");
    setAudioBlob(null);
    setUploadResult(null);
    audioChunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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

      const url = URL.createObjectURL(blob);

      setAudioBlob(blob);
      setAudioUrl(url);

      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const uploadRecording = async () => {
    const formData = new FormData();
    formData.append("file", audioBlob, "vocal-recording.webm");

    const response = await fetch("http://127.0.0.1:8000/recording/save", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setUploadResult(data);
  };

  return (
    <div>
      <h2>Record Your Vocals</h2>

      {!isRecording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop Recording</button>
      )}

      {isRecording && <p>Recording...</p>}

      {audioUrl && (
        <div>
          <h3>Preview</h3>
          <audio controls src={audioUrl}></audio>

          <br />

          <button onClick={uploadRecording}>Save Recording</button>
        </div>
      )}

      {uploadResult && (
        <div>
          <p>{uploadResult.message}</p>
          <audio
            controls
            src={`http://127.0.0.1:8000/recordings/${uploadResult.filename}`}
          ></audio>
        </div>
      )}
    </div>
  );
}
