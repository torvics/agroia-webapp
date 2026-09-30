from flask import Blueprint, request, jsonify

from ..extensions import db
from ..models import Nodo
from ..utils.decoradores import requiere_rol

nodos_bp = Blueprint("nodos", __name__)


@nodos_bp.route("", methods=["POST"])
@requiere_rol("admin")
def registrar_nodo():
    """Solo Admin puede dar de alta un nodo. Regresa la api_key generada UNA vez."""
    data = request.get_json() or {}
    nodo = Nodo(
        parcela_id=data["parcela_id"],
        identificador=data["identificador"],
    )
    db.session.add(nodo)
    db.session.commit()
    return jsonify({
        "id": nodo.id,
        "identificador": nodo.identificador,
        "api_key": nodo.api_key,  # cópiala al firmware del ESP32, no se vuelve a mostrar
    }), 201


@nodos_bp.route("", methods=["GET"])
@requiere_rol("admin", "agricultor")
def listar_nodos():
    nodos = Nodo.query.all()
    return jsonify([
        {"id": n.id, "identificador": n.identificador, "tipo": n.tipo, "estado": n.estado}
        for n in nodos
    ]), 200