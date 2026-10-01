import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Comando, Bitacora, Nodo
from ..utils.auth_nodo import requiere_api_key

comandos_bp = Blueprint("comandos", __name__)


@comandos_bp.route("/nodos/<string:identificador_nodo>/comando", methods=["POST"])
@jwt_required()
def crear_comando(identificador_nodo):
    """El usuario (Admin/Agricultor) ordena un comando para un nodo de suelo
    específico ("1"-"4"). Queda pendiente hasta que la Estación lo consulte
    y lo reparta por LoRa."""
    usuario_id = get_jwt_identity()
    data = request.get_json() or {}

    nodo = Nodo.query.filter_by(identificador=identificador_nodo, tipo="sensor_suelo").first()
    if not nodo:
        return jsonify({"error": "nodo no encontrado"}), 404

    comando = Comando(
        nodo_id=nodo.id,
        usuario_id=usuario_id,
        tipo_comando=data["tipo_comando"],   # "riego" o "rele"
        valor=str(data["valor"]),
    )
    db.session.add(comando)

    db.session.add(Bitacora(
        usuario_id=usuario_id,
        nodo_id=nodo.id,
        accion=f"Ordenó {data['tipo_comando']} = {data['valor']} en Nodo {identificador_nodo}",
    ))

    db.session.commit()
    return jsonify({"id": comando.id}), 201


@comandos_bp.route("/estacion/comandos-pendientes", methods=["GET"])
@requiere_api_key
def comandos_pendientes_estacion():
    """La Estación consulta aquí, en una sola llamada, los comandos pendientes
    de TODOS sus nodos de suelo (1-4) — se los reparte a cada uno por LoRa.
    Reemplaza tener que preguntar nodo por nodo."""
    nodos_hijos = Nodo.query.filter_by(parcela_id=request.nodo.parcela_id, tipo="sensor_suelo").all()
    ids_hijos = [n.id for n in nodos_hijos]
    identificador_por_id = {n.id: n.identificador for n in nodos_hijos}

    pendientes = (
        Comando.query
        .filter(Comando.nodo_id.in_(ids_hijos), Comando.ejecutado.is_(False))
        .order_by(Comando.fecha_creacion)
        .all()
    )

    return jsonify({
        "comandos": [
            {
                "comando_id": c.id,
                "identificador_nodo": identificador_por_id[c.nodo_id],
                "tipo_comando": c.tipo_comando,
                "valor": c.valor,
            }
            for c in pendientes
        ]
    }), 200


@comandos_bp.route("/estacion/comandos/confirmar", methods=["POST"])
@requiere_api_key
def confirmar_comandos_estacion():
    """La Estación avisa qué comandos ya ejecutó (uno o varios de un jalón).
    Body esperado: {"comando_ids": [12, 13, 14]}"""
    data = request.get_json() or {}
    ids = data.get("comando_ids", [])

    confirmados = []
    for comando_id in ids:
        comando = Comando.query.get(comando_id)
        if comando and not comando.ejecutado:
            comando.ejecutado = True
            comando.fecha_ejecucion = datetime.datetime.utcnow()
            confirmados.append(comando_id)

    db.session.commit()
    return jsonify({"status": "confirmado", "comando_ids": confirmados}), 200