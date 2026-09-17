import datetime
from ..extensions import db


class Bitacora(db.Model):
    __tablename__ = "bitacora"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    accion = db.Column(db.String(255), nullable=False)
    nodo_id = db.Column(db.Integer, db.ForeignKey("nodos.id"), nullable=True)
    fecha = db.Column(db.DateTime, default=datetime.datetime.utcnow)
