
from datetime import datetime, timezone

from ..extensions import db


def fecha_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class TokenRevocado(db.Model):
    __tablename__ = "tokens_revocados"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    # Identificador único del JWT.
    # No almacenamos el token completo.
    jti = db.Column(
        db.String(36),
        unique=True,
        nullable=False,
        index=True
    )

    fecha_revocacion = db.Column(
        db.DateTime,
        nullable=False,
        default=fecha_utc
    )

    fecha_expiracion = db.Column(
        db.DateTime,
        nullable=False
    )
