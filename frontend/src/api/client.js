// Thin fetch wrapper: attaches the auth token, sets JSON/form headers, and
// normalizes API error responses into thrown Error messages.
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

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      "Could not reach the API. The backend may be starting up (wait 30s and retry) or the server database may be misconfigured.",
    );
  }
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
