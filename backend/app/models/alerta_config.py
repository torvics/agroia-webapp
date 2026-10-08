
from datetime import datetime, timezone

from ..extensions import db


def fecha_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AlertaConfig(db.Model):
    __tablename__ = "alertas_config"

    id = db.Column(db.Integer, primary_key=True)

    # Una configuración por parcela
    parcela_id = db.Column(
        db.Integer,
        db.ForeignKey("parcelas.id"),
        nullable=False,
        unique=True,
        index=True
    )

    # Umbrales de alerta
    humedad_suelo_min = db.Column(
        db.Float,
        nullable=False,
        default=25.0
    )

    temperatura_min = db.Column(
        db.Float,
        nullable=False,
        default=10.0
    )

    # Configuración de notificaciones
    correo_destino = db.Column(
        db.String(255),
        nullable=True
    )

    activa = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    cooldown_minutos = db.Column(
        db.Integer,
        nullable=False,
        default=60
    )

    fecha_creacion = db.Column(
        db.DateTime,
        nullable=False,
        default=fecha_utc
    )

    fecha_actualizacion = db.Column(
        db.DateTime,
        nullable=False,
        default=fecha_utc,
        onupdate=fecha_utc
    )

    parcela = db.relationship(
        "Parcela",
        backref=db.backref(
            "alerta_config",
            uselist=False
        )
    )
