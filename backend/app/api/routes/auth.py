from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import get_db
from app.models.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth import _hash_password, _verify_password, _create_token, get_current_user

router = APIRouter()


@router.post("/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    """Register a new user (recruiter or candidate)."""
    db = get_db()

    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user_doc = {
        "email": user_data.email.lower(),
        "password_hash": _hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role.value,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Generate token
    token = _create_token({"sub": user_id, "role": user_data.role.value})

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_doc["email"],
            name=user_doc["name"],
            role=user_data.role,
            created_at=user_doc["created_at"],
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email and password."""
    db = get_db()

    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not _verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = _create_token({"sub": user_id, "role": user["role"]})

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user.get("created_at"),
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info."""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
    )
