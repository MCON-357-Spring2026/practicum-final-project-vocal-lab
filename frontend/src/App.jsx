import AudioUpload from "./components/AudioUpload";
import VocalRecorder from "./components/VocalRecorder";
import PlaybackExport from "./components/PlaybackExport";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <h1>Sound Lab</h1>
      <AudioUpload />
      <VocalRecorder />
      <PlaybackExport />
    </div>
  );
}
