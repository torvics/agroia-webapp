import secrets
from ..extensions import db
 
 
class Nodo(db.Model):
    __tablename__ = "nodos"
 
    id = db.Column(db.Integer, primary_key=True)
    parcela_id = db.Column(db.Integer, db.ForeignKey("parcelas.id"), nullable=False)
    identificador = db.Column(db.String(50), unique=True, nullable=False)  # "1", "2", "3", "4"
    api_key = db.Column(
        db.String(255), unique=True, nullable=False,
        default=lambda: secrets.token_hex(24)
    )
    estado = db.Column(
        db.Enum("activo", "inactivo", "mantenimiento", name="estado_enum"),
        default="activo"
    )
 