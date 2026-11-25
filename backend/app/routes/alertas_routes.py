
import math
import re

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    get_jwt
)

from ..extensions import db
from ..models import Parcela, AlertaConfig
from ..utils.validaciones import validar_correo


alertas_bp = Blueprint("alertas", __name__)


def validar_parcela_id(valor):
    """Acepta solamente identificadores enteros positivos."""

    if isinstance(valor, bool):
        return None

    if isinstance(valor, int):
        return valor if valor > 0 else None

    if isinstance(valor, str) and re.fullmatch(r"[0-9]+", valor):
        numero = int(valor)
        return numero if numero > 0 else None

    return None


def comprobar_acceso(parcela_id):
    """Comprueba que la parcela exista y pertenezca al usuario."""

    parcela = db.session.get(Parcela, parcela_id)

    if parcela is None:
        return None, (jsonify({
            "error": "Parcela no encontrada"
        }), 404)

    usuario_actual = int(get_jwt_identity())
    rol = get_jwt().get("rol")

    if rol != "admin" and parcela.usuario_id != usuario_actual:
        return None, (jsonify({
            "error": "No autorizado para esta parcela"
        }), 403)

    return parcela, None


def serializar_config(config):
    """Convierte una configuración a JSON."""

    return {
        "id": config.id,
        "parcela_id": config.parcela_id,
        "humedad_suelo_min": config.humedad_suelo_min,
        "temperatura_min": config.temperatura_min,
        "correo_destino": config.correo_destino,
        "activa": config.activa,
        "cooldown_minutos": config.cooldown_minutos,
        "fecha_creacion": (
            config.fecha_creacion.isoformat() + "Z"
            if config.fecha_creacion else None
        ),
        "fecha_actualizacion": (
            config.fecha_actualizacion.isoformat() + "Z"
            if config.fecha_actualizacion else None
        )
    }


@alertas_bp.route("/config", methods=["GET"])
@jwt_required()
def obtener_config_alertas():

    parcela_id = validar_parcela_id(
        request.args.get("parcela_id")
    )

    if parcela_id is None:
        return jsonify({
            "error": "parcela_id debe ser un entero positivo"
        }), 400

    _, error = comprobar_acceso(parcela_id)

    if error:
        return error

    config = AlertaConfig.query.filter_by(
        parcela_id=parcela_id
    ).first()

    # Sin configuración no es un error: se responde null para que el
    # navegador no registre un 404 en consola en cada carga.
    return jsonify({
        "configuracion": (
            serializar_config(config) if config is not None else None
        )
    }), 200


@alertas_bp.route("/config", methods=["POST"])
@jwt_required()
def guardar_config_alertas():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Se requiere un objeto JSON válido"
        }), 400

    parcela_id = validar_parcela_id(
        data.get("parcela_id")
    )

    if parcela_id is None:
        return jsonify({
            "error": "parcela_id debe ser un entero positivo"
        }), 400

    _, error = comprobar_acceso(parcela_id)

    if error:
        return error

    campos_permitidos = {
        "parcela_id",
        "humedad_suelo_min",
        "temperatura_min",
        "correo_destino",
        "activa",
        "cooldown_minutos"
    }

    desconocidos = set(data) - campos_permitidos

    if desconocidos:
        return jsonify({
            "error": "Campos no permitidos",
            "campos": sorted(desconocidos)
        }), 400

    # Validamos los umbrales antes de modificar la base de datos.
    rangos = {
        "humedad_suelo_min": (0, 100),
        "temperatura_min": (-50, 60)
    }

    valores_validados = {}

    for campo, (minimo, maximo) in rangos.items():

        if campo not in data:
            continue

        valor = data[campo]

        if (
            isinstance(valor, bool)
            or not isinstance(valor, (int, float))
            or not math.isfinite(valor)
        ):
            return jsonify({
                "error": f"{campo} debe ser un número válido"
            }), 400

        if not minimo <= valor <= maximo:
            return jsonify({
                "error": (
                    f"{campo} debe estar entre "
                    f"{minimo} y {maximo}"
                )
            }), 400

        valores_validados[campo] = float(valor)

    if "cooldown_minutos" in data:

        cooldown = data["cooldown_minutos"]

        if (
            type(cooldown) is not int
            or not 1 <= cooldown <= 10080
        ):
            return jsonify({
                "error": "cooldown_minutos debe estar entre 1 y 10080"
            }), 400

        valores_validados["cooldown_minutos"] = cooldown

    if "activa" in data:

        if type(data["activa"]) is not bool:
            return jsonify({
                "error": "activa debe ser true o false"
            }), 400

        valores_validados["activa"] = data["activa"]

    if "correo_destino" in data:

        correo = data["correo_destino"]

        if correo is not None:

            if not isinstance(correo, str):
                return jsonify({
                    "error": "correo_destino debe ser texto o null"
                }), 400

            correo, error_correo = validar_correo(
                correo, opcional=True, maximo=255
            )

            if error_correo:
                return jsonify({
                    "error": "Correo de destino inválido. " + error_correo
                }), 400

        valores_validados["correo_destino"] = correo

    try:
        config = AlertaConfig.query.filter_by(
            parcela_id=parcela_id
        ).first()

        nueva = config is None

        if nueva:
            config = AlertaConfig(parcela_id=parcela_id)

        for campo, valor in valores_validados.items():
            setattr(config, campo, valor)

        db.session.add(config)
        db.session.commit()
        respuesta = serializar_config(config)

    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception(
            "Error guardando la configuración de alertas de la parcela %s",
            parcela_id
        )

        return jsonify({
            "error": (
                "No se pudo guardar la configuración en la base de datos. "
                "Intenta de nuevo."
            )
        }), 503

    return jsonify({
        "mensaje": (
            "Configuración creada"
            if nueva else "Configuración actualizada"
        ),
        "configuracion": respuesta
    }), 201 if nueva else 200

# --- AgroIA: historial de alertas para notificaciones (solo lectura) ---
from ..models import AlertaEnviada as AgroIAAlertaEnviada

@alertas_bp.route("/historial", methods=["GET"])
@jwt_required()
def agroia_historial_alertas():
    parcela_id = validar_parcela_id(request.args.get("parcela_id"))
    if parcela_id is None:
        return jsonify({"error": "parcela_id debe ser un entero positivo"}), 400
    _, error = comprobar_acceso(parcela_id)
    if error:
        return error
    registros = (AgroIAAlertaEnviada.query.filter_by(parcela_id=parcela_id)
                 .order_by(AgroIAAlertaEnviada.fecha_deteccion.desc(), AgroIAAlertaEnviada.id.desc())
                 .limit(30).all())
    return jsonify({"alertas": [{
        "id": r.id, "tipo_alerta": r.tipo_alerta, "nodo_id": r.nodo_id,
        "valor_detectado": r.valor_detectado, "umbral": r.umbral,
        "estado": r.estado,
        "fecha_deteccion": r.fecha_deteccion.isoformat() + "Z" if r.fecha_deteccion else None
    } for r in registros]}), 200
# --- fin del historial de alertas ---
