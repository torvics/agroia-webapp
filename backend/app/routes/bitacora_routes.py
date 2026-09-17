from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from ..models import Bitacora

bitacora_bp = Blueprint("bitacora", __name__)


@bitacora_bp.route("", methods=["GET"])
@jwt_required()
def listar_bitacora():
    registros = Bitacora.query.order_by(Bitacora.fecha.desc()).limit(100).all()
    return jsonify([
        {
            "id": b.id,
            "usuario_id": b.usuario_id,
            "accion": b.accion,
            "nodo_id": b.nodo_id,
            "fecha": b.fecha.isoformat(),
        }
        for b in registros
    ]), 200
