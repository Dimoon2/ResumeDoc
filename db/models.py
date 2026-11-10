from datetime import datetime, timezone
from enum import Enum

from sqlmodel import Field, Relationship, SQLModel


class Rol(str, Enum):
    ADMIN = "admin"
    NOADMIN = "noadmin"


class Documento(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    nombre: str
    ubicacion: str
    peso: int
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    #relacion subido por
    usuario_id: int = Field(foreign_key="usuario.id", index=True, ondelete="CASCADE")
    usuario: "User" = Relationship(
        back_populates="documentos",
        sa_relationship_kwargs={"passive_deletes": True},
    )


class User(SQLModel, table=True):
    __tablename__ = "usuario"  # type: ignore
    id: int | None = Field(default=None, primary_key=True)
    nombre: str
    correo: str = Field(unique=True, index=True)
    password_hash: str
    rol: Rol = Field(default=Rol.NOADMIN)

    #relacion  subido por 
    documentos: list["Documento"] = Relationship(back_populates="usuario")
