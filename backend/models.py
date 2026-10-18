"""Pydantic models for request validation and response shapes.

Note: user_id is NOT part of any request body any more — the backend reads
it from the login token (see auth.get_current_user).
"""

from typing import Literal

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    identifier: str  # email OR username
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., max_length=200)
    new_password: str = Field(..., max_length=200)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=255)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., max_length=2000)
    new_password: str = Field(..., max_length=200)


class QuestionCompleteRequest(BaseModel):
    question_id: int
    platform: str = Field(..., max_length=50)
    difficulty: Literal["Easy", "Medium", "Hard"]


class RevisionCompleteRequest(BaseModel):
    question_id: int
    platform: str = Field(..., max_length=50)
    difficulty: Literal["Easy", "Medium", "Hard"]
    revision_counter: int = Field(
        ..., ge=0, description="The question's CURRENT revision_counter before this completion"
    )


class ErrorResponse(BaseModel):
    detail: str
