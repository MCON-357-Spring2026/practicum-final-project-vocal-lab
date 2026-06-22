import { apiFetch } from "./client";

export function fetchMyProjects() {
  return apiFetch("/projects/mine");
}

export function fetchProject(projectId) {
  return apiFetch(`/projects/${projectId}`);
}

export function updateProject(projectId, name) {
  return apiFetch(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
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

export function createTake(projectId, audioBlob, name) {
  const formData = new FormData();
  formData.append("file", audioBlob, "vocal-recording.webm");
  if (name) {
    formData.append("name", name);
  }
  return apiFetch(`/projects/${projectId}/takes`, { method: "POST", body: formData });
}

export function renameTake(projectId, takeId, name) {
  return apiFetch(`/projects/${projectId}/takes/${takeId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteTake(projectId, takeId) {
  return apiFetch(`/projects/${projectId}/takes/${takeId}`, { method: "DELETE" });
}

export function pitchCorrectTake(projectId, takeId) {
  return apiFetch(`/projects/${projectId}/takes/${takeId}/pitch-correct`, {
    method: "POST",
  });
}

export function exportTake(projectId, takeId) {
  return apiFetch(`/projects/${projectId}/takes/${takeId}/export`, { method: "POST" });
}

export function deleteProject(projectId) {
  return apiFetch(`/projects/${projectId}`, { method: "DELETE" });
}
