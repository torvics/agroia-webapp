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
         "rol": u.rol, "activo": u.activo,
         "correo_confirmado": u.correo_confirmado}
        for u in usuarios
    ]), 200

# --- AgroIA: alta de usuarios por administrador (ruta adicional) ---
from flask import request as agroia_request
from ..extensions import db as agroia_db
from sqlalchemy.exc import IntegrityError as AgroIAIntegrityError
from flask import current_app
from urllib.parse import quote
from ..services.correo_service import enviar_correo_confirmacion
from ..utils.email_confirmation import crear_token_confirmacion

@usuarios_bp.route("/usuarios", methods=["POST"])
@jwt_required()
def agroia_registrar_usuario():
    if get_jwt().get("rol") != "admin":
        return jsonify({"error": "Solo un administrador puede registrar cuentas."}), 403

    datos = agroia_request.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({"error": "Se requiere un objeto JSON válido."}), 400
    nombre = str(datos.get("nombre") or "").strip()
    correo = str(datos.get("correo") or "").strip().lower()
    password = datos.get("password")
    rol = datos.get("rol", "agricultor")

    if len(nombre) < 2 or len(nombre) > 100:
        return jsonify({"error": "El nombre debe tener entre 2 y 100 caracteres."}), 400
    if len(correo) > 150 or not correo or "@" not in correo or " " in correo:
        return jsonify({"error": "Introduce un correo válido."}), 400
    if not isinstance(password, str) or not (8 <= len(password) <= 128):
        return jsonify({"error": "La contraseña debe tener entre 8 y 128 caracteres."}), 400
    if rol not in ("admin", "agricultor"):
        return jsonify({"error": "Rol inválido."}), 400
    if Usuario.query.filter_by(correo=correo).first():
        return jsonify({"error": "Ya existe una cuenta con ese correo."}), 409

    nuevo = Usuario(
        nombre=nombre,
        correo=correo,
        rol=rol,
        activo=True,
        correo_confirmado=(rol != "agricultor"),
    )
    nuevo.set_password(password)
    agroia_db.session.add(nuevo)
    try:
        agroia_db.session.flush()
        if rol == "agricultor":
            enlace = (
                f"{current_app.config['BACKEND_ORIGIN'].rstrip('/')}"
                f"/api/auth/confirmar-correo?token="
                f"{quote(crear_token_confirmacion(nuevo), safe='')}"
            )
            enviar_correo_confirmacion(nuevo.correo, enlace)
        agroia_db.session.commit()
    except ValueError as error:
        agroia_db.session.rollback()
        current_app.logger.exception("No se pudo enviar la confirmación de correo")
        return jsonify({"error": str(error)}), 503
    except AgroIAIntegrityError:
        agroia_db.session.rollback()
        return jsonify({"error": "La cuenta ya existe o los datos no son válidos."}), 409
    except Exception:
        agroia_db.session.rollback()
        current_app.logger.exception("Error al crear la cuenta")
        return jsonify({
            "error": "La cuenta no pudo crearse porque no se pudo enviar el correo de confirmación."
        }), 503
    return jsonify({"id": nuevo.id, "nombre": nuevo.nombre, "correo": nuevo.correo,
                    "rol": nuevo.rol, "activo": nuevo.activo,
                    "correo_confirmado": nuevo.correo_confirmado}), 201
# --- fin de alta de usuarios ---



# Edición de usuarios por administradores: no cambia ni expone contraseñas.
from flask import request as request_gestion
from flask_jwt_extended import get_jwt_identity as identidad_gestion
from ..extensions import db as db_gestion
from sqlalchemy.exc import IntegrityError as ErrorIntegridadGestion

@usuarios_bp.route("/usuarios/<int:usuario_id>", methods=["PUT"])
@jwt_required()
def editar_usuario_gestion(usuario_id):
    if get_jwt().get("rol") != "admin":
        return jsonify({"error": "Solo administradores pueden editar usuarios."}), 403
    usuario = db_gestion.session.get(Usuario, usuario_id)
    if not usuario:
        return jsonify({"error": "Usuario no encontrado."}), 404
    datos = request_gestion.get_json(silent=True)
    if not isinstance(datos, dict):
        return jsonify({"error": "Se requiere un objeto JSON válido."}), 400
    permitidos = {"nombre", "correo", "rol", "activo"}
    if not datos or set(datos) - permitidos:
        return jsonify({"error": "Campos inválidos. No se permite cambiar contraseñas desde este formulario."}), 400
    nombre = datos.get("nombre",usuario.nombre)
    correo = datos.get("correo",usuario.correo)
    rol = datos.get("rol",usuario.rol)
    activo = datos.get("activo",usuario.activo)
    if not isinstance(nombre,str) or not (2 <= len(nombre.strip()) <= 100):
        return jsonify({"error": "Nombre inválido."}), 400
    if not isinstance(correo,str) or not correo.strip() or "@" not in correo or " " in correo or len(correo.strip()) > 150:
        return jsonify({"error": "Correo inválido."}), 400
    if rol not in ("admin","agricultor") or not isinstance(activo,bool):
        return jsonify({"error": "Rol o estado inválido."}), 400
    if str(identidad_gestion()) == str(usuario_id) and (rol != "admin" or activo is False):
        return jsonify({"error": "No puedes desactivar tu propia cuenta ni quitar tu rol de administrador."}), 400
    correo = correo.strip().lower()
    if Usuario.query.filter(Usuario.correo==correo,Usuario.id!=usuario_id).first():
        return jsonify({"error": "Ya existe otro usuario con ese correo."}), 409
    usuario.nombre=nombre.strip()
    usuario.correo=correo
    usuario.rol=rol
    usuario.activo=activo
    try:
        db_gestion.session.commit()
    except ErrorIntegridadGestion:
        db_gestion.session.rollback()
        return jsonify({"error": "El correo ya está registrado o no es válido."}), 409
    return jsonify({
        "id": usuario.id,
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "rol": usuario.rol,
        "activo": usuario.activo,
        "correo_confirmado": usuario.correo_confirmado,
    }), 200
