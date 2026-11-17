"""bcrypt adapter for the PasswordHasher port (spec D-06)."""

import bcrypt


class BcryptPasswordHasher:
    """Hashes and verifies passwords with bcrypt."""

    def hash(self, password: str) -> str:
        return bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def verify(self, password: str, password_hash: str) -> bool:
        try:
            return bcrypt.checkpw(
                password.encode("utf-8"), password_hash.encode("utf-8")
            )
        except ValueError:
            # Malformed hash (corrupted data) counts as failed verification.
            return False
