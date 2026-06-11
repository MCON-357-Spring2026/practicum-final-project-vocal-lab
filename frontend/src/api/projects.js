import { apiFetch } from "./client";

export function fetchMyProjects() {
  return apiFetch("/projects/mine");
}

export function fetchProject(projectId) {
  return apiFetch(`/projects/${projectId}`);
}

export function createProject(file, uploadType, name) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_type", uploadType);
  if (name) {
    formData.append("name", name);
  }
  return apiFetch("/projects", { method: "POST", body: formData });
}

export function removeVocals(projectId) {
  return apiFetch(`/projects/${projectId}/remove-vocals`, { method: "POST" });
}

export function redetectKey(projectId) {
  return apiFetch(`/projects/${projectId}/redetect-key`, { method: "POST" });
}

export function saveVocal(projectId, audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "vocal-recording.webm");
  return apiFetch(`/projects/${projectId}/vocal`, { method: "POST", body: formData });
}

export function clearVocal(projectId) {
  return apiFetch(`/projects/${projectId}/vocal`, { method: "DELETE" });
}

export function pitchCorrect(projectId) {
  return apiFetch(`/projects/${projectId}/pitch-correct`, { method: "POST" });
}

export function exportProject(projectId) {
  return apiFetch(`/projects/${projectId}/export`, { method: "POST" });
}

export function deleteProject(projectId) {
  return apiFetch(`/projects/${projectId}`, { method: "DELETE" });
}
