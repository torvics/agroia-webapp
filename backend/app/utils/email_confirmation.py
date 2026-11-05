from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from flask import current_app


def crear_token_confirmacion(usuario):
    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    return serializer.dumps({
        "id": usuario.id,
        "correo": usuario.correo,
    }, salt="confirmacion-correo")


def obtener_datos_confirmacion(token, max_age):
    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    try:
        return serializer.loads(
            token,
            salt="confirmacion-correo",
            max_age=max_age,
        )
    except (BadSignature, SignatureExpired):
        return None
