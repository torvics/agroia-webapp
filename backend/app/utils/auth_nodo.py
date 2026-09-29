from functools import wraps
from flask import request, jsonify
from ..models import Nodo


def requiere_api_key(f):
    """Protege endpoints que solo debe poder llamar el nodo Estación (el único con
    WiFi/internet). Los 4 nodos de suelo hablan solo LoRa con la Estación —
    nunca autentican directo contra el backend, aunque existan como registro
    en MySQL para ownership, bitácora y comandos."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        api_key = request.headers.get("X-API-KEY")
        nodo = Nodo.query.filter_by(api_key=api_key, tipo="estacion").first()
        if not nodo:
            return jsonify({"error": "nodo no autorizado"}), 401
        request.nodo = nodo
        return f(*args, **kwargs)
    return wrapper