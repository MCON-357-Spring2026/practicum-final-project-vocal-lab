import { STATUS_LABELS } from "../api/projectContract";

export default function StatusBadge({ status }) {
  return (
    <span className="status-badge" data-status={status}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
