import { apiFetch } from "./client";

export function login(email, password) {
  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", password);

  return apiFetch("/auth/login", { method: "POST", body });
}

export function register(email, password) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
