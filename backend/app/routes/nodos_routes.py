from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt

from ..extensions import db
from ..models import Nodo, Parcela
from ..utils.decoradores import requiere_rol
from ..utils.auth_nodo import requiere_api_key


nodos_bp = Blueprint("nodos", __name__)


@nodos_bp.route("", methods=["POST"])
@requiere_rol("admin")
def registrar_nodo():
    """Solo un administrador puede registrar nodos."""

    data = request.get_json() or {}

    parcela_id = data.get("parcela_id")
    identificador = data.get("identificador")
    tipo = data.get("tipo", "sensor_suelo")

    if not parcela_id or not identificador:
        return jsonify({
            "error": "parcela_id e identificador son obligatorios"
        }), 400

    tipos_validos = ["estacion", "sensor_suelo"]

    if tipo not in tipos_validos:
        return jsonify({
            "error": "Tipo de nodo inválido"
        }), 400

    parcela = db.session.get(Parcela, parcela_id)

    if not parcela:
        return jsonify({
            "error": "Parcela no encontrada"
        }), 404

    nodo_existente = Nodo.query.filter_by(
        identificador=identificador
    ).first()

    if nodo_existente:
        return jsonify({
            "error": "Ya existe un nodo con ese identificador"
        }), 409

    nodo = Nodo(
        parcela_id=parcela_id,
        identificador=identificador,
        tipo=tipo
    )

    db.session.add(nodo)
    db.session.commit()

    return jsonify({
        "id": nodo.id,
        "parcela_id": nodo.parcela_id,
        "identificador": nodo.identificador,
        "tipo": nodo.tipo,
        "estado": nodo.estado,
        "api_key": nodo.api_key
    }), 201


@nodos_bp.route("", methods=["GET"])
@requiere_rol("admin", "agricultor")
def listar_nodos():

    claims = get_jwt()
    usuario_id = int(get_jwt_identity())
    rol = claims.get("rol")

    if rol == "admin":
        nodos = Nodo.query.all()

    else:
        nodos = (
            Nodo.query
            .join(Parcela)
            .filter(Parcela.usuario_id == usuario_id)
            .all()
        )

    return jsonify([
        {
            "id": n.id,
            "parcela_id": n.parcela_id,
            "identificador": n.identificador,
            "tipo": n.tipo,
            "estado": n.estado
        }
        for n in nodos
    ]), 200


@nodos_bp.route("/<int:nodo_id>", methods=["PUT"])
@requiere_rol("admin")
def editar_nodo(nodo_id):

    nodo = db.session.get(Nodo, nodo_id)

    if not nodo:
        return jsonify({
            "error": "Nodo no encontrado"
        }), 404

    data = request.get_json() or {}

    if "identificador" in data:
        nuevo_identificador = data["identificador"]

        existente = Nodo.query.filter(
            Nodo.identificador == nuevo_identificador,
            Nodo.id != nodo.id
        ).first()

        if existente:
            return jsonify({
                "error": "Ya existe un nodo con ese identificador"
            }), 409

        nodo.identificador = nuevo_identificador

    if "parcela_id" in data:

        parcela = db.session.get(
            Parcela,
            data["parcela_id"]
        )

        if not parcela:
            return jsonify({
                "error": "Parcela no encontrada"
            }), 404

        nodo.parcela_id = data["parcela_id"]

    if "tipo" in data:

        tipos_validos = [
            "estacion",
            "sensor_suelo"
        ]

        if data["tipo"] not in tipos_validos:
            return jsonify({
                "error": "Tipo de nodo inválido"
            }), 400

        nodo.tipo = data["tipo"]

    if "estado" in data:

        estados_validos = [
            "activo",
            "inactivo",
            "mantenimiento"
        ]

        if data["estado"] not in estados_validos:
            return jsonify({
                "error": "Estado inválido"
            }), 400

        nodo.estado = data["estado"]

    db.session.commit()

    return jsonify({
        "id": nodo.id,
        "parcela_id": nodo.parcela_id,
        "identificador": nodo.identificador,
        "tipo": nodo.tipo,
        "estado": nodo.estado
    }), 200


@nodos_bp.route("/<int:nodo_id>", methods=["DELETE"])
@requiere_rol("admin")
def dar_baja_nodo(nodo_id):

    nodo = db.session.get(Nodo, nodo_id)

    if not nodo:
        return jsonify({
            "error": "Nodo no encontrado"
        }), 404

    nodo.estado = "inactivo"

    db.session.commit()

    return jsonify({
        "mensaje": "Nodo dado de baja correctamente",
        "id": nodo.id,
        "estado": nodo.estado
    }), 200


@nodos_bp.route("/validar-api-key", methods=["GET"])
@requiere_api_key
def validar_api_key():

    nodo = request.nodo

    return jsonify({
        "valida": True,
        "nodo_id": nodo.id,
        "identificador": nodo.identificador,
        "tipo": nodo.tipo,
        "parcela_id": nodo.parcela_id,
        "estado": nodo.estado
    }), 200