from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
import re

from app.models import Usuario
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

    # Obtener los datos actuales del usuario desde MySQL
    usuario = Usuario.query.filter_by(id=usuario_id).first()

    if usuario is None:
        return jsonify({
            "error": "Usuario no encontrado"
        }), 404

    return jsonify({
        "id": str(usuario.id),
        "rol": claims.get("rol"),
        "nombre": usuario.nombre,
        "correo": usuario.correo,
    }), 200


@auth_bp.route("/perfil", methods=["PATCH"])
@jwt_required()
def actualizar_perfil():
    """
    Permite que un usuario autenticado actualice
    exclusivamente su propio nombre o correo.
    """
    datos = request.get_json(silent=True)

    if not isinstance(datos, dict):
        return jsonify({
            "error": "Se requiere un objeto JSON válido"
        }), 400

    if "nombre" not in datos and "correo" not in datos:
        return jsonify({
            "error": "Debes enviar nombre o correo"
        }), 400

    # La identidad se obtiene del JWT, nunca del cuerpo.
    usuario_id = get_jwt_identity()

    usuario = Usuario.query.filter_by(
        id=usuario_id,
        activo=True
    ).first()

    if usuario is None:
        return jsonify({
            "error": "Usuario no encontrado o inactivo"
        }), 404

    nuevo_nombre = usuario.nombre
    nuevo_correo = usuario.correo

    # Validar nombre.
    if "nombre" in datos:
        if not isinstance(datos["nombre"], str):
            return jsonify({
                "error": "El nombre debe ser texto"
            }), 400

        nuevo_nombre = datos["nombre"].strip()

        if not 2 <= len(nuevo_nombre) <= 100:
            return jsonify({
                "error": "El nombre debe tener entre 2 y 100 caracteres"
            }), 400

    # Validar correo.
    if "correo" in datos:
        if not isinstance(datos["correo"], str):
            return jsonify({
                "error": "El correo debe ser texto"
            }), 400

        nuevo_correo = datos["correo"].strip().lower()

        if (
            len(nuevo_correo) > 150
            or not re.fullmatch(
                r"[^@\s]+@[^@\s]+\.[^@\s]+",
                nuevo_correo
            )
        ):
            return jsonify({
                "error": "Formato de correo no válido"
            }), 400

    correo_cambia = (
        nuevo_correo.lower() != usuario.correo.lower()
    )

    # Cambiar el correo requiere la contraseña actual.
    if correo_cambia:
        password_actual = datos.get("password_actual")

        if (
            not isinstance(password_actual, str)
            or not usuario.check_password(password_actual)
        ):
            return jsonify({
                "error": "Contraseña actual incorrecta"
            }), 403

        # Comprobar si el correo ya pertenece a otra cuenta.
        existente = Usuario.query.filter(
            db.func.lower(Usuario.correo) == nuevo_correo,
            Usuario.id != usuario.id
        ).first()

        if existente:
            return jsonify({
                "error": "El correo ya está registrado"
            }), 409

    # Aplicar cambios después de todas las validaciones.
    usuario.nombre = nuevo_nombre
    usuario.correo = nuevo_correo

    try:
        db.session.commit()

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "error": "El correo ya está registrado"
        }), 409

    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception(
            "Error al actualizar el perfil"
        )
        return jsonify({
            "error": "No se pudo actualizar el perfil"
        }), 503

    return jsonify({
        "mensaje": "Perfil actualizado correctamente",
        "id": str(usuario.id),
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "rol": usuario.rol
    }), 200



@auth_bp.route("/password", methods=["PATCH"])
@jwt_required()
def cambiar_password():
    """
    Cambia la contraseña del usuario autenticado.
    Requiere la contraseña actual y revoca el JWT utilizado.
    """
    datos = request.get_json(silent=True)

    if not isinstance(datos, dict):
        return jsonify({
            "error": "Se requiere un objeto JSON válido"
        }), 400

    password_actual = datos.get("password_actual")
    password_nueva = datos.get("password_nueva")

    if not isinstance(password_actual, str) or not isinstance(password_nueva, str):
        return jsonify({
            "error": "Debes proporcionar ambas contraseñas"
        }), 400

    if not 12 <= len(password_nueva) <= 128:
        return jsonify({
            "error": "La nueva contraseña debe tener entre 12 y 128 caracteres"
        }), 400

    usuario = Usuario.query.filter_by(
        id=get_jwt_identity(),
        activo=True
    ).first()

    if usuario is None:
        return jsonify({
            "error": "Usuario no encontrado o inactivo"
        }), 404

    if not usuario.check_password(password_actual):
        return jsonify({
            "error": "La contraseña actual es incorrecta"
        }), 403

    if usuario.check_password(password_nueva):
        return jsonify({
            "error": "La nueva contraseña debe ser diferente"
        }), 400

    # Guardar el nuevo hash, nunca la contraseña en texto plano.
    usuario.set_password(password_nueva)

    # Revocar el JWT utilizado para realizar el cambio.
    claims = get_jwt()

    expiracion = datetime.fromtimestamp(
        claims["exp"],
        tz=timezone.utc
    ).replace(tzinfo=None)

    token_revocado = TokenRevocado(
        jti=claims["jti"],
        fecha_expiracion=expiracion
    )

    try:
        db.session.add(token_revocado)
        db.session.commit()

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "error": "No se pudo completar el cambio de contraseña"
        }), 409

    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception(
            "Error al cambiar la contraseña"
        )
        return jsonify({
            "error": "No se pudo actualizar la contraseña"
        }), 503

    return jsonify({
        "mensaje": "Contraseña actualizada. Inicia sesión nuevamente."
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
