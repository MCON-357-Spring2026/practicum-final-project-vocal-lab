"""
Pydantic request/response schemas.

These define the JSON shape FastAPI expects (request bodies)
and what it returns (response bodies). They are NOT database tables.
"""

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """JSON body for POST /auth/register."""

    email: EmailStr  # Must be a valid email format.
    password: str  # Plain password from the client (hashed before saving).


class UserLogin(BaseModel):
    """JSON body for POST /auth/login."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """JSON response returned after a successful login."""

    access_token: str  # JWT string the client sends on protected routes.
    token_type: str  # Always "bearer" — used in Authorization: Bearer <token>.
