import { Link } from "react-router-dom";
import soundlabLogo from "../assets/soundlab-logo.png";
import PageDecorations from "./PageDecorations";

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <PageDecorations />

      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="app-brand">
            <img src={soundlabLogo} alt="SoundLab" className="app-brand__logo" />
          </Link>
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}
