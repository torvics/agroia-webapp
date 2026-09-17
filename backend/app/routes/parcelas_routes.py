from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Parcela

parcelas_bp = Blueprint("parcelas", __name__)


@parcelas_bp.route("", methods=["GET"])
@jwt_required()
def listar_parcelas():
    usuario_id = get_jwt_identity()
    parcelas = Parcela.query.filter_by(usuario_id=usuario_id).all()
    return jsonify([
        {"id": p.id, "nombre": p.nombre, "ubicacion": p.ubicacion}
        for p in parcelas
    ]), 200


@parcelas_bp.route("", methods=["POST"])
@jwt_required()
def crear_parcela():
    usuario_id = get_jwt_identity()
    data = request.get_json() or {}
    parcela = Parcela(
        nombre=data.get("nombre"),
        ubicacion=data.get("ubicacion"),
        usuario_id=usuario_id,
    )
    db.session.add(parcela)
    db.session.commit()
    return jsonify({"id": parcela.id}), 201
