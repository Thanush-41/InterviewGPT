from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    RECRUITER = "recruiter"
    CANDIDATE = "candidate"


class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=6)
    name: str
    role: UserRole


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    created_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
