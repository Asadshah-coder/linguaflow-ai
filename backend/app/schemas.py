"""Pydantic request/response schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---- Auth ----
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- History ----
class HistoryCreate(BaseModel):
    source_text: str = Field(min_length=1, max_length=5000)
    translated_text: str = Field(min_length=1, max_length=20000)
    source: str = Field(min_length=1, max_length=16)
    target: str = Field(min_length=1, max_length=16)
    detected_source: str | None = Field(default=None, max_length=16)
    provider: str = Field(default="mymemory", max_length=32)


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source_text: str
    translated_text: str
    source: str
    target: str
    detected_source: str | None
    provider: str
    created_at: datetime
