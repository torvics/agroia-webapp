import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Comando, Bitacora
from ..utils.auth_nodo import requiere_api_key

comandos_bp = Blueprint("comandos", __name__)


@comandos_bp.route("/nodos/<int:nodo_id>/comando", methods=["POST"])
@jwt_required()
def crear_comando(nodo_id):
    """El usuario (Admin/Agricultor) ordena un comando. Queda pendiente hasta que el nodo lo consulte."""
    usuario_id = get_jwt_identity()
    data = request.get_json() or {}

    comando = Comando(
        nodo_id=nodo_id,
        usuario_id=usuario_id,
        tipo_comando=data["tipo_comando"],   # "riego" o "rele"
        valor=str(data["valor"]),
    )
    db.session.add(comando)

    db.session.add(Bitacora(
        usuario_id=usuario_id,
        nodo_id=nodo_id,
        accion=f"Ordenó {data['tipo_comando']} = {data['valor']}",
    ))

    db.session.commit()
    return jsonify({"id": comando.id}), 201


@comandos_bp.route("/nodos/<int:nodo_id>/comando", methods=["GET"])
@requiere_api_key
def consultar_comando(nodo_id):
    """El ESP32 hace polling aquí cada pocos segundos."""
    comando = (
        Comando.query
        .filter_by(nodo_id=nodo_id, ejecutado=False)
        .order_by(Comando.fecha_creacion)
        .first()
    )
    if not comando:
        return jsonify({"pendiente": False}), 200

    return jsonify({
        "pendiente": True,
        "comando_id": comando.id,
        "tipo_comando": comando.tipo_comando,
        "valor": comando.valor,
    }), 200


@comandos_bp.route("/nodos/<int:nodo_id>/comando/confirmar", methods=["POST"])
@requiere_api_key
def confirmar_comando(nodo_id):
    """El ESP32 avisa que ya ejecutó el comando."""
    data = request.get_json() or {}
    comando = Comando.query.get(data.get("comando_id"))
    if not comando:
        return jsonify({"error": "comando no encontrado"}), 404

    comando.ejecutado = True
    comando.fecha_ejecucion = datetime.datetime.utcnow()
    db.session.commit()
    return jsonify({"status": "confirmado"}), 200
