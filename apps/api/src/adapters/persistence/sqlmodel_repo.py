"""SQLModel adapter for the DocumentRepository port (T-18).

Maps the domain entities to the ORM of branch `data-base`: role `user`
(domain) ≡ `noadmin` (BD) per D-27. Each operation uses its own session.
"""

from typing import cast

from sqlalchemy.exc import IntegrityError
from sqlalchemy import create_engine
from sqlmodel import Session, select

from db.models import Documento, Rol, User
from src.domain.document import Document
from src.domain.user import EmailAlreadyRegistered, Role, User as DomainUser

_ROL_TO_DOMAIN: dict[str, Role] = {"admin": "admin", "noadmin": "user"}


def _to_domain_user(orm_user: User) -> DomainUser:
    return DomainUser(
        id=cast(int, orm_user.id),
        email=orm_user.correo,
        password_hash=orm_user.password_hash,
        role=_ROL_TO_DOMAIN[orm_user.rol.value],
        name=orm_user.nombre,
    )


def _to_domain_document(orm_doc: Documento) -> Document:
    return Document(
        id=cast(int, orm_doc.id),
        name=orm_doc.nombre,
        location=orm_doc.ubicacion,
        size_bytes=orm_doc.peso,
        owner_id=orm_doc.usuario_id,
    )


class SQLModelDocumentRepository:
    """Persistence against the real database (PostgreSQL, branch `data-base`)."""

    def __init__(self, database_url: str) -> None:
        self._engine = create_engine(database_url, pool_pre_ping=True)

    def create_user(self, user: DomainUser) -> DomainUser:
        """Insert a user; duplicate correo → EmailAlreadyRegistered (BD manda)."""
        orm_user = User(
            nombre=user.name,
            correo=user.email,
            password_hash=user.password_hash,
            rol=Rol.ADMIN if user.role == "admin" else Rol.NOADMIN,
        )
        with Session(self._engine) as session:
            session.add(orm_user)
            try:
                session.commit()
            except IntegrityError as exc:
                raise EmailAlreadyRegistered() from exc
            session.refresh(orm_user)
            return _to_domain_user(orm_user)

    def get_user_by_email(self, email: str) -> DomainUser | None:
        with Session(self._engine) as session:
            statement = select(User).where(User.correo == email)
            orm_user = session.exec(statement).first()
            return _to_domain_user(orm_user) if orm_user else None

    def get_user(self, user_id: int) -> DomainUser | None:
        with Session(self._engine) as session:
            orm_user = session.get(User, user_id)
            return _to_domain_user(orm_user) if orm_user else None

    def create_document(self, document: Document) -> Document:
        orm_doc = Documento(
            nombre=document.name,
            ubicacion=document.location,
            peso=document.size_bytes,
            usuario_id=document.owner_id,
        )
        with Session(self._engine) as session:
            session.add(orm_doc)
            session.commit()
            session.refresh(orm_doc)
            return _to_domain_document(orm_doc)

    def get_document(self, document_id: int) -> Document | None:
        with Session(self._engine) as session:
            orm_doc = session.get(Documento, document_id)
            return _to_domain_document(orm_doc) if orm_doc else None

    def delete_document(self, document_id: int) -> None:
        with Session(self._engine) as session:
            orm_doc = session.get(Documento, document_id)
            if orm_doc is not None:
                session.delete(orm_doc)
                session.commit()

    def list_documents(self, owner_id: int | None = None) -> list[Document]:
        with Session(self._engine) as session:
            statement = select(Documento)
            if owner_id is not None:
                statement = statement.where(Documento.usuario_id == owner_id)
            return [_to_domain_document(doc) for doc in session.exec(statement)]

    def rename_document(self, document_id: int, name: str) -> Document | None:
        with Session(self._engine) as session:
            orm_doc = session.get(Documento, document_id)
            if orm_doc is None:
                return None
            orm_doc.nombre = name
            session.add(orm_doc)
            session.commit()
            session.refresh(orm_doc)
            return _to_domain_document(orm_doc)
