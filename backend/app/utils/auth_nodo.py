from functools import wraps
from flask import request, jsonify

from ..models import Nodo


def requiere_api_key(f):
    """
    Protege endpoints que solo debe poder llamar el nodo Estación.

    La Estación es el nodo que tiene conexión WiFi/internet y se comunica
    directamente con el backend. Los nodos de suelo se comunican por LoRa
    con la Estación y no autentican directamente contra la API.
    """

    @wraps(f)
    def wrapper(*args, **kwargs):

        api_key = request.headers.get("X-API-KEY")

        if not api_key:
            return jsonify({
                "error": "API key requerida"
            }), 401

        nodo = Nodo.query.filter_by(
            api_key=api_key,
            tipo="estacion"
        ).first()

        if not nodo:
            return jsonify({
                "error": "API key inválida o nodo no autorizado"
            }), 401

        if nodo.estado != "activo":
            return jsonify({
                "error": "Nodo inactivo o no disponible"
            }), 401

        request.nodo = nodo

        return f(*args, **kwargs)

    return wrapper