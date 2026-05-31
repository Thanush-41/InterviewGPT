from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import hmac
import secrets
import base64
import json

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import get_settings
from app.db.mongodb import get_db

security = HTTPBearer()

settings = get_settings()
JWT_SECRET = settings.jwt_secret
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72


def _hash_password(password: str) -> str:
    """Hash password using PBKDF2-SHA256 (no extra deps needed)."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return f"{salt}:{dk.hex()}"


def _verify_password(password: str, hashed: str) -> bool:
    """Verify password against stored hash."""
    salt, stored_hash = hashed.split(":")
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return hmac.compare_digest(dk.hex(), stored_hash)


def _create_token(payload: dict) -> str:
    """Create a simple JWT token (HS256)."""
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    payload["exp"] = (datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)).isoformat()

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

    h = b64url(json.dumps(header).encode())
    p = b64url(json.dumps(payload, default=str).encode())
    signature = hmac.digest(JWT_SECRET.encode(), f"{h}.{p}".encode(), "sha256")
    s = b64url(signature)
    return f"{h}.{p}.{s}"


def _decode_token(token: str) -> dict:
    """Decode and verify JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token")

        def b64url_decode(data: str) -> bytes:
            padding = 4 - len(data) % 4
            return base64.urlsafe_b64decode(data + "=" * padding)

        # Verify signature
        expected_sig = hmac.digest(
            JWT_SECRET.encode(), f"{parts[0]}.{parts[1]}".encode(), "sha256"
        )
        actual_sig = b64url_decode(parts[2])
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid signature")

        payload = json.loads(b64url_decode(parts[1]))

        # Check expiry
        exp = datetime.fromisoformat(payload["exp"])
        if exp < datetime.now(timezone.utc):
            raise ValueError("Token expired")

        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """FastAPI dependency to get current authenticated user."""
    payload = _decode_token(credentials.credentials)
    db = get_db()
    from bson import ObjectId

    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
    }


async def require_recruiter(current_user: dict = Depends(get_current_user)):
    """Dependency that requires recruiter role."""
    if current_user["role"] != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiter access required")
    return current_user


async def require_candidate(current_user: dict = Depends(get_current_user)):
    """Dependency that requires candidate role."""
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403, detail="Candidate access required")
    return current_user
