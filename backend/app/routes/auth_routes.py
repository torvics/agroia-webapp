from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

from ..models import Usuario
from datetime import datetime, timezone

from flask import current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..extensions import db
from ..models import TokenRevocado

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



@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """
    Revoca el JWT utilizado en la solicitud.

    El token queda invalidado en el backend,
    incluso si todavía no ha expirado.
    """

    claims = get_jwt()

    # Identificador único del JWT.
    jti = claims["jti"]

    # Fecha de expiración del token.
    expiracion = datetime.fromtimestamp(
        claims["exp"],
        tz=timezone.utc
    ).replace(tzinfo=None)

    # Guardamos solamente el identificador.
    token_revocado = TokenRevocado(
        jti=jti,
        fecha_expiracion=expiracion
    )

    try:
        db.session.add(token_revocado)
        db.session.commit()

    except IntegrityError:
        # La revocación ya fue registrada
        # por otra solicitud simultánea.
        db.session.rollback()

        return jsonify({
            "mensaje": "Sesión cerrada correctamente"
        }), 200

    except SQLAlchemyError:
        db.session.rollback()

        current_app.logger.exception(
            "Error al revocar JWT durante logout"
        )

        return jsonify({
            "error": "No fue posible cerrar la sesión"
        }), 503

    return jsonify({
        "mensaje": "Sesión cerrada correctamente"
    }), 200
