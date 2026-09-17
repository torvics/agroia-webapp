from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

from ..models import Usuario

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    correo = data.get("correo")
    password = data.get("password")

    usuario = Usuario.query.filter_by(correo=correo, activo=True).first()
    if not usuario or not usuario.check_password(password):
        return jsonify({"error": "credenciales inválidas"}), 401

    token = create_access_token(
        identity=str(usuario.id),
        additional_claims={"rol": usuario.rol, "nombre": usuario.nombre},
    )
    return jsonify({
        "access_token": token,
        "rol": usuario.rol,
        "nombre": usuario.nombre,
    }), 200


@auth_bp.route("/perfil", methods=["GET"])
@jwt_required()
def perfil():
    usuario_id = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        "id": usuario_id,
        "rol": claims.get("rol"),
        "nombre": claims.get("nombre"),
    }), 200
