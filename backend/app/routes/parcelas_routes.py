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

    nombre = data.get("nombre")
    ubicacion = data.get("ubicacion")

    if not nombre:
        return jsonify({"error": "El nombre de la parcela es obligatorio"}), 400

    parcela = Parcela(
        nombre=data.get("nombre"),
        ubicacion=data.get("ubicacion"),
        usuario_id=usuario_id,
    )

    db.session.add(parcela)
    db.session.commit()
    return jsonify({"id": parcela.id}), 201


@parcelas_bp.route("/<int:parcela_id>", methods=["PUT"])
@jwt_required()
def editar_parcela(parcela_id):
    usuario_id = get_jwt_identity()

    parcela = Parcela.query.filter_by( id=parcela_id, usuario_id=usuario_id ).first()

    if not parcela: 
        return jsonify({ "error": "Parcela no encontrada"}), 404

    data = request.get_json() or {}

    if "nombre" in data: 
        parcela.nombre = data["nombre"]

    if "ubicacion" in data: 
        parcela.ubicacion = data["ubicacion"]

    db.session.commit()

    return jsonify({ "id": parcela.id, "nombre": parcela.nombre, "ubicacion": parcela.ubicacion}), 200


@parcelas_bp.route("/<int:parcela_id>", methods=["DELETE"])
@jwt_required()
def eliminar_parcela(parcela_id):
    usuario_id = get_jwt_identity()

    parcela = Parcela.query.filter_by( id=parcela_id, usuario_id=usuario_ida).first()

    if not parcela: 
        return jsonify({ "error": "Parcela no encontrada" }), 404

    db.session.delete(parcela)
    db.session.commit()

    return jsonify({ "mensaje": "Parcela eliminada correctamente" }), 200