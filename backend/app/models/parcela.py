from ..extensions import db


class Parcela(db.Model):
    __tablename__ = "parcelas"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    ubicacion = db.Column(db.String(150))

    # Relación con la tabla de usuarios
    usuario_id = db.Column(
        db.Integer, 
        db.ForeignKey("usuarios.id"), 
        nullable=False
    )

    usuario = db.relationship(
        "Usuario",
        backref = db.backref("parcelas", lazy=True)
    )
