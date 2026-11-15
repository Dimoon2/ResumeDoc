"""Pydantic schemas of the HTTP API (user-visible messages stay in Spanish)."""

import re
from typing import Literal

from pydantic import BaseModel, field_validator

# Frontend contract (feat/Landing-Page-and-Auth): AuthResponse {user}.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    """Self-registration (D-28: sin permisos, solo ve sus propios documentos)."""

    name: str
    email: str
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Introduce tu nombre.")
        return value

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        if not _EMAIL_RE.match(value):
            raise ValueError("Introduce un correo válido.")
        return value

    @field_validator("password")
    @classmethod
    def password_min_length(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres.")
        return value


class UserResponse(BaseModel):
    id: int
    name: str
    email: str


class AuthSessionResponse(BaseModel):
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        if not _EMAIL_RE.match(value):
            raise ValueError("Introduce un correo válido.")
        return value


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UploadedDocumentResponse(BaseModel):
    id: int
    status: Literal["pending"] = "pending"  # estado de aplicación, no de BD (D-24)


class DocumentStatusResponse(BaseModel):
    id: int
    status: str
    error: str = ""
