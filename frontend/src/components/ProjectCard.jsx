import { Link } from "react-router-dom";
import { UPLOAD_TYPE_LABELS } from "../api/projectContract";
import StatusBadge from "./StatusBadge";

export default function ProjectCard({ project }) {
  return (
    <li className="card card--interactive">
      <h3 className="card__title">{project.name}</h3>
      <div className="meta-row">
        <span>{UPLOAD_TYPE_LABELS[project.upload_type] ?? project.upload_type}</span>
        <StatusBadge status={project.status} />
      </div>
      {project.detected_key && (
        <p className="card__meta">
          Key: <strong>{project.detected_key} {project.mode}</strong>
        </p>
      )}
      <Link className="card__link" to={`/projects/${project.project_id}`}>
        Open project →
      </Link>
    </li>
  );
}
