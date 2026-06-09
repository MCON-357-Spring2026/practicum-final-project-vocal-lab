import { useState } from "react";
import AudioUpload from "./components/AudioUpload";
import VocalRecorder from "./components/VocalRecorder";
import PlaybackExport from "./components/PlaybackExport";
import "./App.css";

export default function App() {
  const [songKey, setSongKey] = useState("C");
  const [instrumentalUrl, setInstrumentalUrl] = useState("");

  return (
    <div className="app">
      <h1>SoundJBeats Studio</h1>
      <AudioUpload
        onKeyDetected={setSongKey}
        onInstrumentalReady={setInstrumentalUrl}
      />
      <VocalRecorder songKey={songKey} instrumentalUrl={instrumentalUrl} />
      <PlaybackExport />
    </div>
  );
}
