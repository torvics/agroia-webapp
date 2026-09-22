from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
 
from ..extensions import db
from ..models import Parcela
 
parcelas_bp = Blueprint("parcelas", __name__)
 
 
@parcelas_bp.route("", methods=["GET"])
@jwt_required()
def listar_parcelas():
    """Admin ve todas las parcelas; Agricultor ve solo las que le pertenecen."""
    usuario_id = get_jwt_identity()
    rol = get_jwt().get("rol")
 
    if rol == "admin":
        parcelas = Parcela.query.all()
    else:
        parcelas = Parcela.query.filter_by(usuario_id=usuario_id).all()
 
    return jsonify([
        {"id": p.id, "nombre": p.nombre, "ubicacion": p.ubicacion, "usuario_id": p.usuario_id}
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
 
 
@parcelas_bp.route("/<int:parcela_id>", methods=["PUT"])
@jwt_required()
def actualizar_parcela(parcela_id):
    usuario_id = get_jwt_identity()
    parcela = Parcela.query.filter_by(id=parcela_id, usuario_id=usuario_id).first()
    if not parcela:
        return jsonify({"error": "parcela no encontrada"}), 404
 
    data = request.get_json() or {}
    parcela.nombre = data.get("nombre", parcela.nombre)
    parcela.ubicacion = data.get("ubicacion", parcela.ubicacion)
    db.session.commit()
    return jsonify({"id": parcela.id, "nombre": parcela.nombre, "ubicacion": parcela.ubicacion}), 200
 
 
@parcelas_bp.route("/<int:parcela_id>", methods=["DELETE"])
@jwt_required()
def eliminar_parcela(parcela_id):
    usuario_id = get_jwt_identity()
    parcela = Parcela.query.filter_by(id=parcela_id, usuario_id=usuario_id).first()
    if not parcela:
        return jsonify({"error": "parcela no encontrada"}), 404
 
    db.session.delete(parcela)
    db.session.commit()
    return jsonify({"status": "eliminada"}), 200