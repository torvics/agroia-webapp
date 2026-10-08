
from datetime import datetime, timezone

from ..extensions import db


def fecha_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AlertaEnviada(db.Model):
    __tablename__ = "alertas_enviadas"

    id = db.Column(db.Integer, primary_key=True)

    parcela_id = db.Column(
        db.Integer,
        db.ForeignKey("parcelas.id"),
        nullable=False,
        index=True
    )

    # Es opcional porque una alerta ambiental
    # puede corresponder a toda la parcela.
    nodo_id = db.Column(
        db.Integer,
        db.ForeignKey("nodos.id"),
        nullable=True
    )

    # suelo_seco / temperatura_baja
    tipo_alerta = db.Column(
        db.String(50),
        nullable=False
    )

    valor_detectado = db.Column(
        db.Float,
        nullable=False
    )

    umbral = db.Column(
        db.Float,
        nullable=False
    )

    mensaje = db.Column(
        db.String(500),
        nullable=False
    )

    # correo / whatsapp
    canal = db.Column(
        db.String(30),
        nullable=False,
        default="correo"
    )

    destinatario = db.Column(
        db.String(255),
        nullable=True
    )

    # pendiente / enviada / fallida
    estado = db.Column(
        db.String(30),
        nullable=False,
        default="pendiente"
    )

    error_detalle = db.Column(
        db.String(500),
        nullable=True
    )

    fecha_deteccion = db.Column(
        db.DateTime,
        nullable=False,
        default=fecha_utc
    )

    fecha_envio = db.Column(
        db.DateTime,
        nullable=True
    )

    parcela = db.relationship(
        "Parcela",
        backref=db.backref(
            "historial_alertas",
            lazy=True
        )
    )

    nodo = db.relationship(
        "Nodo",
        backref=db.backref(
            "alertas_enviadas",
            lazy=True
        )
    )
