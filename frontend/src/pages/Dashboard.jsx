import { useCallback, useEffect, useState } from "react";
import { clearToken, getToken, setToken } from "../api/client";
import { fetchMyProjects } from "../api/projects";
import AuthForm from "../components/AuthForm";
import ProjectCard from "../components/ProjectCard";
import ProjectUpload from "../components/ProjectUpload";

export default function Dashboard() {
  const [token, setTokenState] = useState(() => getToken());
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!getToken()) return;

    setLoadingProjects(true);
    setError(null);
    try {
      const data = await fetchMyProjects();
      setProjects(data);
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes("credentials") || err.message.includes("401")) {
        clearToken();
        setTokenState("");
        setProjects([]);
      }
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadProjects();
    }
  }, [token, loadProjects]);

  const handleAuthenticated = (accessToken) => {
    setToken(accessToken);
    setTokenState(accessToken);
    setError(null);
  };

  const logout = () => {
    clearToken();
    setTokenState("");
    setProjects([]);
    setError(null);
  };

  const handleProjectCreated = (project) => {
    setProjects((prev) => [project, ...prev.filter((p) => p.project_id !== project.project_id)]);
  };

  return (
    <div className={`page${!token ? " page--auth" : ""}`}>
      {!token ? (
        <div className="auth-page">
          <header className="page-hero page-hero--centered">
            <p className="page-hero__tagline">
              SoundLab is a web app that turns any song into a backing track, guides you through
              recording vocals, and exports a finished mix with AI-assisted pitch correction.
            </p>
          </header>

          <div className="card form-panel auth-page__form">
            <AuthForm onAuthenticated={handleAuthenticated} />
          </div>
        </div>
      ) : (
        <>
          <header className="page-hero">
            <p className="page-hero__tagline">
              SoundLab is a web app that turns any song into a backing track, guides you through
              recording vocals, and exports a finished mix with AI-assisted pitch correction.
            </p>
          </header>
          <div className="toolbar">
            <span className="toolbar__status msg-success">Logged in</span>
            <button type="button" className="btn-ghost" onClick={logout}>
              Log out
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={loadProjects}
              disabled={loadingProjects}
            >
              {loadingProjects ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="card">
            <ProjectUpload onProjectCreated={handleProjectCreated} />
          </div>
        </>
      )}

      {error && <p className="msg-error">{error}</p>}

      {token && (
        <section className="section">
          <div className="section__header">
            <h2 className="neon-label">My projects</h2>
          </div>

          {loadingProjects && projects.length === 0 ? (
            <p className="spinner-line">Loading projects…</p>
          ) : projects.length === 0 ? (
            <p className="msg-muted">
              No projects yet — upload a song or instrumental above to get started.
            </p>
          ) : (
            <ul className="card-list">
              {projects.map((project) => (
                <ProjectCard key={project.project_id} project={project} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
