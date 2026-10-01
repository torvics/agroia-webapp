from functools import wraps
from flask import request, jsonify

from ..models import Nodo


def requiere_api_key(f):
    """Protege endpoints utilizados por nodos mediante X-API-KEY."""

    @wraps(f)
    def wrapper(*args, **kwargs):

        api_key = request.headers.get("X-API-KEY")

        if not api_key:
            return jsonify({
                "error": "API key requerida"
            }), 401

        nodo = Nodo.query.filter_by(
            api_key=api_key
        ).first()

        if not nodo:
            return jsonify({
                "error": "API key inválida"
            }), 401

        if nodo.estado != "activo":
            return jsonify({
                "error": "Nodo inactivo o no disponible"
            }), 401

        request.nodo = nodo

        return f(*args, **kwargs)

    return wrapper