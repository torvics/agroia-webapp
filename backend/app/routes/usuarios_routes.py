from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from ..models import Usuario

usuarios_bp = Blueprint("usuarios", __name__)


@usuarios_bp.route("/usuarios", methods=["GET"])
@jwt_required()
def listar_usuarios():
    if get_jwt().get("rol") != "admin":
        return jsonify({"error": "no autorizado"}), 403

    usuarios = Usuario.query.order_by(Usuario.id).all()
    return jsonify([
        {"id": u.id, "nombre": u.nombre, "correo": u.correo,
         "rol": u.rol, "activo": u.activo}
        for u in usuarios
    ]), 200