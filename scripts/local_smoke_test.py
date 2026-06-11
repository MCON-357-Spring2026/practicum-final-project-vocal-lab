"""Part 1 local smoke test — full API workflow (instrumental path)."""
from __future__ import annotations

import json
import sys
import time
import uuid
from pathlib import Path

import requests

API = "http://127.0.0.1:8000"
BACKEND = Path(__file__).resolve().parents[1] / "backend"
INSTRUMENTAL = BACKEND / "uploads" / "f2481153-d8db-46e9-9b20-4aef06bd65fb.mp3"
VOCAL = BACKEND / "recordings" / "0116bc48-dbb6-41d5-8a31-d78de767822c.webm"

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    # 0. Servers up
    try:
        r = requests.get(f"{API}/docs", timeout=5)
        check("Backend reachable", r.status_code == 200, f"HTTP {r.status_code}")
    except Exception as e:
        check("Backend reachable", False, str(e))
        return 1

    try:
        r = requests.get("http://localhost:5173/", timeout=5)
        check("Frontend reachable", r.status_code == 200, f"HTTP {r.status_code}")
    except Exception as e:
        check("Frontend reachable", False, str(e))

    if not INSTRUMENTAL.is_file():
        check("Test instrumental file exists", False, str(INSTRUMENTAL))
        return 1
    if not VOCAL.is_file():
        check("Test vocal file exists", False, str(VOCAL))
        return 1

    email = f"smoke-{uuid.uuid4().hex[:8]}@example.com"
    password = "smoke-test-pass-123"

    # 1. Register
    r = requests.post(
        f"{API}/auth/register",
        json={"email": email, "password": password},
        timeout=30,
    )
    check("Register", r.status_code == 200, r.text[:120] if r.status_code != 200 else email)
    if r.status_code != 200:
        return 1

    # 2. Login
    r = requests.post(
        f"{API}/auth/login",
        data={"username": email, "password": password},
        timeout=30,
    )
    check("Login", r.status_code == 200, r.text[:120] if r.status_code != 200 else "")
    if r.status_code != 200:
        return 1

    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Upload instrumental
    with INSTRUMENTAL.open("rb") as f:
        r = requests.post(
            f"{API}/projects",
            headers=headers,
            data={"upload_type": "instrumental", "name": "Smoke test instrumental"},
            files={"file": ("test.mp3", f, "audio/mpeg")},
            timeout=120,
        )
    check("Upload instrumental", r.status_code == 200, r.text[:120] if r.status_code != 200 else "")
    if r.status_code != 200:
        return 1

    project = r.json()
    project_id = project["project_id"]

    # 4. Wait for ready_to_record
    status = project.get("status")
    for _ in range(30):
        if status == "ready_to_record":
            break
        time.sleep(2)
        r = requests.get(f"{API}/projects/{project_id}", headers=headers, timeout=30)
        if r.status_code != 200:
            break
        status = r.json().get("status")
    check(
        "Project ready_to_record",
        status == "ready_to_record",
        f"status={status}, key={project.get('detected_key') or r.json().get('detected_key')}",
    )
    project = r.json() if r.status_code == 200 else project

    # 5. Save vocal
    with VOCAL.open("rb") as f:
        r = requests.post(
            f"{API}/projects/{project_id}/vocal",
            headers=headers,
            files={"file": ("vocal-recording.webm", f, "audio/webm")},
            timeout=120,
        )
    check("Save vocal", r.status_code == 200, r.text[:120] if r.status_code != 200 else "")
    if r.status_code != 200:
        return 1
    project = r.json()
    check("Status vocal_recorded", project.get("status") == "vocal_recorded", project.get("status", ""))

    # 6. Auto-tune
    r = requests.post(f"{API}/projects/{project_id}/pitch-correct", headers=headers, timeout=600)
    check("Auto-tune", r.status_code == 200, r.text[:120] if r.status_code != 200 else "")
    if r.status_code != 200:
        return 1
    project = r.json()
    check("Status tuned", project.get("status") == "tuned", project.get("status", ""))

    # 7. Export
    r = requests.post(f"{API}/projects/{project_id}/export", headers=headers, timeout=300)
    check("Export mix", r.status_code == 200, r.text[:120] if r.status_code != 200 else "")
    if r.status_code != 200:
        return 1
    project = r.json()
    export_file = project.get("export_stored_as")
    check("Status exported", project.get("status") == "exported", project.get("status", ""))

    if export_file:
        r = requests.get(f"{API}/exports/{export_file}", timeout=30)
        check("Download export", r.status_code == 200 and len(r.content) > 1000, f"{len(r.content)} bytes")

    # 8. Discard vocal & re-record
    r = requests.delete(f"{API}/projects/{project_id}/vocal", headers=headers, timeout=30)
    check("Discard vocal (re-record)", r.status_code == 200, r.text[:120] if r.status_code != 200 else "")
    if r.status_code == 200:
        project = r.json()
        check("Back to ready_to_record", project.get("status") == "ready_to_record", project.get("status", ""))

    # 9. Delete project
    r = requests.delete(f"{API}/projects/{project_id}", headers=headers, timeout=30)
    check("Delete project", r.status_code == 200, r.text[:120] if r.status_code != 200 else "")

    r = requests.get(f"{API}/projects/{project_id}", headers=headers, timeout=30)
    check("Project gone after delete", r.status_code == 404, f"HTTP {r.status_code}")

    failed = [n for n, ok, _ in results if not ok]
    print()
    print(f"Summary: {len(results) - len(failed)}/{len(results)} passed")
    if failed:
        print("Failed:", ", ".join(failed))
        return 1
    print("All automated checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
