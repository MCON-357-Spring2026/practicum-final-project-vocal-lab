"""
Authentication API routes: register, login, and current user.

All routes are mounted under /auth (see main.py).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import User
from .schemas import Token, UserCreate
from .utils import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    hash_password,
    verify_password,
)

# Groups all auth endpoints; included in main.py with prefix="/auth".
router = APIRouter()

# Tells FastAPI to read the JWT from: Authorization: Bearer <token>
# tokenUrl is used by Swagger's "Authorize" button (points at login).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    """
    Open one database session per request and close it when done.

    Used via: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user account.

    Expects JSON: {"email": "...", "password": "..."}
    Password is hashed before saving; plain password is never stored.
    """
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = User(email=user.email, password_hash=hash_password(user.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created"}


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Log in with email + password (form field `username` = email).

    Accepts application/x-www-form-urlencoded so Swagger Authorize works.
    On success, returns {"access_token": "...", "token_type": "bearer"}.
    """
    db_user = db.query(User).filter(User.email == form_data.username).first()
    if not db_user or not verify_password(form_data.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    # "sub" (subject) is a standard JWT claim — here we store the user's id.
    token = create_access_token({"sub": str(db_user.id)})
    return {"access_token": token, "token_type": "bearer"}


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """
    Dependency: decode JWT from Authorization header and load the User row.

    Raises 401 if the token is missing, invalid, or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    """
    Return the logged-in user's id and email.

    Requires header: Authorization: Bearer <access_token>
    No JSON body — only the Bearer token.
    """
    return {"id": current_user.id, "email": current_user.email}
