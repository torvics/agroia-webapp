from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from ..extensions import db
from ..models import Parcela
from ..utils.validaciones import validar_coordenadas, validar_nombre_parcela


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
        parcelas = Parcela.query.filter_by(
            usuario_id=usuario_id
        ).all()

    return jsonify([
        {
            "id": p.id,
            "nombre": p.nombre,
            "ubicacion": p.ubicacion,
            "usuario_id": p.usuario_id
        }
        for p in parcelas
    ]), 200


@parcelas_bp.route("", methods=["POST"])
@jwt_required()
def crear_parcela():

    usuario_id = get_jwt_identity()
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Se requiere un objeto JSON válido"}), 400

    nombre, error = validar_nombre_parcela(data.get("nombre"))
    if error:
        return jsonify({"error": error}), 400

    ubicacion, error = validar_coordenadas(data.get("ubicacion"))
    if error:
        return jsonify({"error": error}), 400

    parcela = Parcela(
        nombre=nombre,
        ubicacion=ubicacion,
        usuario_id=usuario_id
    )

    db.session.add(parcela)
    db.session.commit()

    return jsonify({
        "id": parcela.id,
        "nombre": parcela.nombre,
        "ubicacion": parcela.ubicacion,
        "usuario_id": parcela.usuario_id
    }), 201


@parcelas_bp.route("/<int:parcela_id>", methods=["PUT"])
@jwt_required()
def editar_parcela(parcela_id):

    usuario_id = get_jwt_identity()

    parcela = db.session.get(Parcela, parcela_id)
    if parcela and get_jwt().get("rol") != "admin" and str(parcela.usuario_id) != str(usuario_id):
        parcela = None

    if not parcela:
        return jsonify({
            "error": "Parcela no encontrada"
        }), 404

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Se requiere un objeto JSON válido"}), 400

    # Validar todo antes de modificar el objeto: un error no deja cambios a medias.
    cambios = {}
    if "nombre" in data:
        cambios["nombre"], error = validar_nombre_parcela(data["nombre"])
        if error:
            return jsonify({"error": error}), 400

    if "ubicacion" in data:
        cambios["ubicacion"], error = validar_coordenadas(data["ubicacion"])
        if error:
            return jsonify({"error": error}), 400

    for campo, valor in cambios.items():
        setattr(parcela, campo, valor)

    db.session.commit()

    return jsonify({
        "id": parcela.id,
        "nombre": parcela.nombre,
        "ubicacion": parcela.ubicacion,
        "usuario_id": parcela.usuario_id
    }), 200


@parcelas_bp.route("/<int:parcela_id>", methods=["DELETE"])
@jwt_required()
def eliminar_parcela(parcela_id):

    usuario_id = get_jwt_identity()

    parcela = db.session.get(Parcela, parcela_id)
    if parcela and get_jwt().get("rol") != "admin" and str(parcela.usuario_id) != str(usuario_id):
        parcela = None

    if not parcela:
        return jsonify({
            "error": "Parcela no encontrada"
        }), 404

    from ..models import Nodo
    from sqlalchemy.exc import IntegrityError
    if Nodo.query.filter_by(parcela_id=parcela_id).first():
        return jsonify({"error": "Esta parcela tiene nodos asociados. No se puede eliminar sin resolver sus dependencias."}), 409
    try:
        db.session.delete(parcela)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "La parcela tiene datos relacionados y no puede eliminarse por seguridad."}), 409

    return jsonify({
        "mensaje": "Parcela eliminada correctamente"
    }), 200