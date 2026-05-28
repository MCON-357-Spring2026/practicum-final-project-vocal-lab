"""
Password hashing and JWT (JSON Web Token) helpers.

- Passwords are hashed with PBKDF2 (stdlib only; no bcrypt/passlib).
- Login returns a signed JWT the client sends back on protected routes.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt

# Secret used to sign JWTs. In production, load from an environment variable.
SECRET_KEY = "supersecretkey_change_me"
# Algorithm used to sign the JWT.
ALGORITHM = "HS256"

# PBKDF2 settings (stored inside each password hash string).
_PBKDF2_NAME = "pbkdf2_sha256"
_PBKDF2_ITERATIONS = 210_000
_SALT_BYTES = 16


def hash_password(password: str) -> str:
    """
    Turn a plain password into a one-way hash string for database storage.

    Format: pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>
    """
    # Random salt so two users with the same password get different hashes.
    salt = secrets.token_bytes(_SALT_BYTES)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    salt_b64 = base64.urlsafe_b64encode(salt).decode("ascii").rstrip("=")
    dk_b64 = base64.urlsafe_b64encode(dk).decode("ascii").rstrip("=")
    return f"{_PBKDF2_NAME}${_PBKDF2_ITERATIONS}${salt_b64}${dk_b64}"


def verify_password(password: str, hashed: str) -> bool:
    """
    Compare a login password to the stored hash.

    Returns True only if the password matches.
    """
    try:
        # Parse the stored hash string back into its parts.
        name, iterations_s, salt_b64, dk_b64 = hashed.split("$", 3)
        if name != _PBKDF2_NAME:
            return False

        iterations = int(iterations_s)

        def _b64pad(s: str) -> str:
            # Base64 decoding may need padding characters.
            return s + "=" * (-len(s) % 4)

        salt = base64.urlsafe_b64decode(_b64pad(salt_b64).encode("ascii"))
        expected = base64.urlsafe_b64decode(_b64pad(dk_b64).encode("ascii"))
    except Exception:
        return False

    # Re-hash the attempted password with the same salt/iterations and compare.
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(dk, expected)


def create_access_token(data: dict, expires_minutes: int = 60) -> str:
    """
    Build a signed JWT containing `data` (e.g. {"sub": "1"} for user id).

    The token expires after `expires_minutes` (default 60).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})  # Standard JWT expiry claim.
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
