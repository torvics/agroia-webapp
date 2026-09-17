from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def requiere_rol(*roles_permitidos):
    """Protege un endpoint para que solo ciertos roles (admin/agricultor) puedan usarlo."""
    def decorador(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("rol") not in roles_permitidos:
                return jsonify({"error": "no autorizado para este recurso"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorador
