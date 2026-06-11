import { API_URL } from "./projectContract";

export function getToken() {
  return sessionStorage.getItem("access_token") ?? "";
}

export function setToken(token) {
  sessionStorage.setItem("access_token", token);
}

export function clearToken() {
  sessionStorage.removeItem("access_token");
}

export async function apiFetch(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    if (options.body instanceof URLSearchParams) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else {
      headers["Content-Type"] = "application/json";
    }
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((e) => e.msg).join(", ")
          : "Request failed";
    throw new Error(message);
  }

  return data;
}
