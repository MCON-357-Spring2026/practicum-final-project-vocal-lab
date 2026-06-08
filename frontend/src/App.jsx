// Root page: title + the login/upload/recordings UI.
import AudioUpload from "./components/AudioUpload";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <h1>Sound Lab</h1>
      <AudioUpload />
    </div>
  );
}
