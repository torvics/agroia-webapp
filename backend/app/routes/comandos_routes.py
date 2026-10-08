import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    get_jwt
)

from ..extensions import db
from ..models import Comando, Bitacora, Nodo
from ..utils.auth_nodo import requiere_api_key


comandos_bp = Blueprint("comandos", __name__)


# =========================================================
# CONFIGURACIÓN
# =========================================================

# Un comando pendiente deja de ser válido después de 10 minutos.
EXPIRACION_COMANDO_MINUTOS = 10

# Los comandos ya ejecutados se conservan 7 días antes de limpiarlos.
RETENCION_COMANDOS_EJECUTADOS_DIAS = 7


# =========================================================
# 1.4.5 LIMPIEZA / EXPIRACIÓN
# =========================================================

def limpiar_comandos_viejos():
    """
    Elimina:

    1. Comandos pendientes que tengan más de 10 minutos.
    2. Comandos ejecutados que tengan más de 7 días.
    """

    ahora = datetime.datetime.utcnow()

    limite_pendientes = (
        ahora -
        datetime.timedelta(minutes=EXPIRACION_COMANDO_MINUTOS)
    )

    limite_ejecutados = (
        ahora -
        datetime.timedelta(days=RETENCION_COMANDOS_EJECUTADOS_DIAS)
    )

    pendientes_eliminados = (
        Comando.query
        .filter(
            Comando.ejecutado.is_(False),
            Comando.fecha_creacion < limite_pendientes
        )
        .delete(synchronize_session=False)
    )

    ejecutados_eliminados = (
        Comando.query
        .filter(
            Comando.ejecutado.is_(True),
            Comando.fecha_ejecucion.isnot(None),
            Comando.fecha_ejecucion < limite_ejecutados
        )
        .delete(synchronize_session=False)
    )

    if pendientes_eliminados or ejecutados_eliminados:
        db.session.commit()


# =========================================================
# 1.4.2 USUARIO CREA COMANDO
# POST /api/nodos/<id>/comando
# =========================================================

@comandos_bp.route(
    "/nodos/<int:nodo_id>/comando",
    methods=["POST"]
)
@jwt_required()
def crear_comando(nodo_id):

    limpiar_comandos_viejos()

    usuario_id = int(get_jwt_identity())
    rol = get_jwt().get("rol")

    data = request.get_json() or {}

    tipo_comando = data.get("tipo_comando")
    valor = data.get("valor")

    # Validamos datos obligatorios
    if not tipo_comando or valor is None:
        return jsonify({
            "error": "tipo_comando y valor son obligatorios"
        }), 400

    tipos_validos = [
        "riego",
        "rele"
    ]

    if tipo_comando not in tipos_validos:
        return jsonify({
            "error": "Tipo de comando inválido"
        }), 400

    # Buscamos el nodo de suelo
    nodo = db.session.get(Nodo, nodo_id)

    if not nodo or nodo.tipo != "sensor_suelo":
        return jsonify({
            "error": "Nodo no encontrado"
        }), 404

    # Solo enviamos comandos a nodos activos
    if nodo.estado != "activo":
        return jsonify({
            "error": "El nodo no está activo"
        }), 409

    # Agricultor solamente puede controlar nodos de sus parcelas
    if rol != "admin":

        if nodo.parcela.usuario_id != usuario_id:
            return jsonify({
                "error": "No autorizado para controlar este nodo"
            }), 403

    comando = Comando(
        nodo_id=nodo.id,
        usuario_id=usuario_id,
        tipo_comando=tipo_comando,
        valor=str(valor)
    )

    db.session.add(comando)

    # Registramos la acción en la bitácora
    db.session.add(
        Bitacora(
            usuario_id=usuario_id,
            nodo_id=nodo.id,
            accion=(
                f"Ordenó {tipo_comando} = {valor} "
                f"en Nodo {nodo.identificador}"
            )
        )
    )

    db.session.commit()

    return jsonify({
        "id": comando.id,
        "nodo_id": comando.nodo_id,
        "tipo_comando": comando.tipo_comando,
        "valor": comando.valor,
        "ejecutado": comando.ejecutado
    }), 201


# =========================================================
# 1.4.3 NODO CONSULTA COMANDO PENDIENTE
# GET /api/nodos/<id>/comando
#
# Realmente quien consulta es la Estación,
# porque los nodos de suelo solamente utilizan LoRa.
# =========================================================

@comandos_bp.route(
    "/nodos/<int:nodo_id>/comando",
    methods=["GET"]
)
@requiere_api_key
def obtener_comando_pendiente(nodo_id):

    limpiar_comandos_viejos()

    nodo = db.session.get(Nodo, nodo_id)

    if not nodo or nodo.tipo != "sensor_suelo":
        return jsonify({
            "error": "Nodo no encontrado"
        }), 404

    # La estación solamente puede consultar nodos
    # pertenecientes a su propia parcela.
    if nodo.parcela_id != request.nodo.parcela_id:
        return jsonify({
            "error": "Nodo no autorizado para esta estación"
        }), 403

    comando = (
        Comando.query
        .filter_by(
            nodo_id=nodo.id,
            ejecutado=False
        )
        .order_by(Comando.fecha_creacion.asc())
        .first()
    )

    if not comando:
        return jsonify({
            "pendiente": False
        }), 200

    return jsonify({
        "pendiente": True,
        "comando": {
            "id": comando.id,
            "nodo_id": comando.nodo_id,
            "tipo_comando": comando.tipo_comando,
            "valor": comando.valor,
            "fecha_creacion": comando.fecha_creacion.isoformat()
        }
    }), 200


# =========================================================
# 1.4.4 CONFIRMAR EJECUCIÓN
# POST /api/nodos/<id>/comando/confirmar
# =========================================================

@comandos_bp.route(
    "/nodos/<int:nodo_id>/comando/confirmar",
    methods=["POST"]
)
@requiere_api_key
def confirmar_comando(nodo_id):

    limpiar_comandos_viejos()

    nodo = db.session.get(Nodo, nodo_id)

    if not nodo or nodo.tipo != "sensor_suelo":
        return jsonify({
            "error": "Nodo no encontrado"
        }), 404

    if nodo.parcela_id != request.nodo.parcela_id:
        return jsonify({
            "error": "Nodo no autorizado para esta estación"
        }), 403

    data = request.get_json() or {}

    comando_id = data.get("comando_id")

    if not comando_id:
        return jsonify({
            "error": "comando_id es obligatorio"
        }), 400

    comando = Comando.query.filter_by(
        id=comando_id,
        nodo_id=nodo.id
    ).first()

    if not comando:
        return jsonify({
            "error": "Comando no encontrado"
        }), 404

    # Permitimos que la confirmación sea idempotente.
    if comando.ejecutado:
        return jsonify({
            "status": "ya confirmado",
            "comando_id": comando.id
        }), 200

    # Marcamos el comando como ejecutado
    comando.ejecutado = True
    comando.fecha_ejecucion = datetime.datetime.utcnow()

    # Registramos que la estación confirmó el comando.
    # Asociamos el evento al usuario que solicitó la acción.
    db.session.add(
        Bitacora(
            usuario_id=comando.usuario_id,
            nodo_id=nodo.id,
            accion=(
                f"Estación {request.nodo.identificador} "
                f"confirmó comando {comando.id}: "
                f"{comando.tipo_comando} = {comando.valor} "
                f"en Nodo {nodo.identificador}"
            )
        )
    )

    # Guardamos ambas operaciones en la misma transacción
    db.session.commit()

    return jsonify({
        "status": "confirmado",
        "comando_id": comando.id,
        "nodo_id": nodo.id
    }), 200


# =========================================================
# ENDPOINT EXTRA EXISTENTE
# ESTACIÓN CONSULTA TODOS LOS NODOS DE SU PARCELA
# =========================================================

@comandos_bp.route(
    "/estacion/comandos-pendientes",
    methods=["GET"]
)
@requiere_api_key
def comandos_pendientes_estacion():

    limpiar_comandos_viejos()

    nodos_hijos = Nodo.query.filter_by(
        parcela_id=request.nodo.parcela_id,
        tipo="sensor_suelo"
    ).all()

    ids_hijos = [
        nodo.id
        for nodo in nodos_hijos
    ]

    identificador_por_id = {
        nodo.id: nodo.identificador
        for nodo in nodos_hijos
    }

    if not ids_hijos:
        return jsonify({
            "comandos": []
        }), 200

    pendientes = (
        Comando.query
        .filter(
            Comando.nodo_id.in_(ids_hijos),
            Comando.ejecutado.is_(False)
        )
        .order_by(Comando.fecha_creacion.asc())
        .all()
    )

    return jsonify({
        "comandos": [
            {
                "comando_id": comando.id,
                "nodo_id": comando.nodo_id,
                "identificador_nodo":
                    identificador_por_id[comando.nodo_id],
                "tipo_comando": comando.tipo_comando,
                "valor": comando.valor
            }
            for comando in pendientes
        ]
    }), 200


# =========================================================
# ENDPOINT EXTRA EXISTENTE
# ESTACIÓN CONFIRMA VARIOS COMANDOS
# =========================================================

@comandos_bp.route(
    "/estacion/comandos/confirmar",
    methods=["POST"]
)
@requiere_api_key
def confirmar_comandos_estacion():

    limpiar_comandos_viejos()

    data = request.get_json() or {}

    ids = data.get("comando_ids", [])

    if not isinstance(ids, list):
        return jsonify({
            "error": "comando_ids debe ser una lista"
        }), 400

    confirmados = []

    for comando_id in ids:

        comando = db.session.get(
            Comando,
            comando_id
        )

        if not comando or comando.ejecutado:
            continue

        nodo = db.session.get(
            Nodo,
            comando.nodo_id
        )

        # Una estación no puede confirmar comandos
        # pertenecientes a otra parcela.
        if (
            not nodo or
            nodo.parcela_id != request.nodo.parcela_id
        ):
            continue

        # Marcamos el comando como ejecutado
        comando.ejecutado = True
        comando.fecha_ejecucion = datetime.datetime.utcnow()

        # Registramos la confirmación en Bitácora
        db.session.add(
            Bitacora(
                usuario_id=comando.usuario_id,
                nodo_id=nodo.id,
                accion=(
                    f"Estación {request.nodo.identificador} "
                    f"confirmó comando {comando.id}: "
                    f"{comando.tipo_comando} = {comando.valor} "
                    f"en Nodo {nodo.identificador}"
                )
            )
        )

        confirmados.append(comando.id)

    db.session.commit()

    return jsonify({
        "status": "confirmado",
        "comando_ids": confirmados
    }), 200