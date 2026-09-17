from functools import wraps
from flask import request, jsonify
from ..models import Nodo


def requiere_api_key(f):
    """Protege endpoints que solo deben poder llamar los nodos ESP32, vía X-API-KEY."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        api_key = request.headers.get("X-API-KEY")
        nodo = Nodo.query.filter_by(api_key=api_key).first()
        if not nodo:
            return jsonify({"error": "nodo no autorizado"}), 401
        request.nodo = nodo
        return f(*args, **kwargs)
    return wrapper
