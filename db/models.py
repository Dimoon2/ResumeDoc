from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import CheckConstraint, false
from sqlmodel import Field, Relationship, SQLModel


class Rol(str, Enum):
    ADMIN = "admin"
    NOADMIN = "noadmin"


class DocumentoContenidoDocumento(SQLModel, table=True):
    __tablename__ = "documento_contenido_documento"  # type: ignore
    __table_args__ = (
        CheckConstraint(
            "contenedor_id != contenido_id",
            name="ck_documento_contenido_documento_no_self",
        ),
    )

    contenedor_id: int = Field(
        foreign_key="documento.id",
        primary_key=True,
        ondelete="CASCADE",
    )
    contenido_id: int = Field(
        foreign_key="documento.id",
        primary_key=True,
        index=True,
        ondelete="CASCADE",
    )


class UsuarioAccesoUsuario(SQLModel, table=True):
    __tablename__ = "usuario_acceso_usuario"  # type: ignore
    __table_args__ = (
        CheckConstraint(
            "propietario_id != autorizado_id",
            name="ck_usuario_acceso_usuario_no_self",
        ),
    )

    # usuario dueño de los documentos que autoriza
    propietario_id: int = Field(
        foreign_key="usuario.id",
        primary_key=True,
        ondelete="CASCADE",
    )
    # usuario que recibe acceso a todos los documentos del propietario
    autorizado_id: int = Field(
        foreign_key="usuario.id",
        primary_key=True,
        index=True,
        ondelete="CASCADE",
    )
    puede_editar: bool = Field(
        default=False,
        nullable=False,
        sa_column_kwargs={"server_default": false()},
    )
    fecha_otorgamiento: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    fecha_revocacion: datetime | None = Field(default=None)


class Documento(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    nombre: str
    ubicacion: str
    peso: int
    es_resumen: bool = Field(
        default=False,
        nullable=False,
        sa_column_kwargs={"server_default": false()},
    )
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # documentos que este documento contiene
    documentos_contenidos: list["Documento"] = Relationship(
        back_populates="documentos_contenedores",
        link_model=DocumentoContenidoDocumento,
        sa_relationship_kwargs={
            "primaryjoin": "Documento.id == DocumentoContenidoDocumento.contenedor_id",
            "secondaryjoin": "Documento.id == DocumentoContenidoDocumento.contenido_id",
        },
    )

    # documentos que contienen a este documento
    documentos_contenedores: list["Documento"] = Relationship(
        back_populates="documentos_contenidos",
        link_model=DocumentoContenidoDocumento,
        sa_relationship_kwargs={
            "primaryjoin": "Documento.id == DocumentoContenidoDocumento.contenido_id",
            "secondaryjoin": "Documento.id == DocumentoContenidoDocumento.contenedor_id",
        },
    )

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
    documentos: list["Documento"] = Relationship(
        back_populates="usuario",
        sa_relationship_kwargs={"passive_deletes": "all"},
    )

    # usuarios a los que les di acceso a mis documentos
    usuarios_autorizados: list["User"] = Relationship(
        back_populates="usuarios_que_me_autorizaron",
        link_model=UsuarioAccesoUsuario,
        sa_relationship_kwargs={
            "primaryjoin": "User.id == UsuarioAccesoUsuario.propietario_id",
            "secondaryjoin": "User.id == UsuarioAccesoUsuario.autorizado_id",
        },
    )

    # usuarios que me dieron acceso a sus documentos
    usuarios_que_me_autorizaron: list["User"] = Relationship(
        back_populates="usuarios_autorizados",
        link_model=UsuarioAccesoUsuario,
        sa_relationship_kwargs={
            "primaryjoin": "User.id == UsuarioAccesoUsuario.autorizado_id",
            "secondaryjoin": "User.id == UsuarioAccesoUsuario.propietario_id",
        },
    )
