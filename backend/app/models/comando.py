import datetime
from ..extensions import db


class Comando(db.Model):
    __tablename__ = "comandos_pendientes"

    id = db.Column(db.Integer, primary_key=True)
    nodo_id = db.Column(db.Integer, db.ForeignKey("nodos.id"), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    tipo_comando = db.Column(db.Enum("riego", "rele", name="tipo_comando_enum"), nullable=False)
    valor = db.Column(db.String(50), nullable=False)
    ejecutado = db.Column(db.Boolean, default=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    fecha_ejecucion = db.Column(db.DateTime, nullable=True)
