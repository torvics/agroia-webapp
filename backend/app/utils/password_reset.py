"""Tokens de recuperación ligados al hash vigente de contraseña.

No se almacena el token ni se requiere una tabla nueva. Cambiar el hash
invalida todos los enlaces emitidos antes del cambio.
"""
import hashlib
import hmac

from flask import current_app
from itsdangerous import BadSignature, URLSafeTimedSerializer

PLAZO_RECUPERACION_SEGUNDOS = 20 * 60
_SAL_RECUPERACION = "agroia-recuperacion-v1"


def _clave():
    clave = (
        current_app.config.get("JWT_SECRET_KEY")
        or current_app.config.get("SECRET_KEY")
    )
    if not clave:
        raise RuntimeError("Configure JWT_SECRET_KEY o SECRET_KEY para recuperar contraseñas")
    return clave.encode("utf-8") if isinstance(clave, str) else clave


def version_credencial(usuario):
    """Firma interna de la versión de credenciales, no del texto de contraseña."""
    contenido = f"{usuario.id}:{usuario.password_hash}".encode("utf-8")
    return hmac.new(_clave(), contenido, hashlib.sha256).hexdigest()


def _serializador():
    return URLSafeTimedSerializer(
        secret_key=_clave(),
        salt=_SAL_RECUPERACION,
        signer_kwargs={"digest_method": hashlib.sha256},
    )


def crear_token_recuperacion(usuario):
    import secrets
    return _serializador().dumps({
        "uid": usuario.id,
        "ver": version_credencial(usuario),
        "nonce": secrets.token_urlsafe(12),
    })


def validar_token_recuperacion(token, usuario):
    """Verifica firma, edad y que el usuario no haya cambiado contraseña."""
    if not isinstance(token, str) or not 10 <= len(token) <= 4096:
        return False
    try:
        datos = _serializador().loads(
            token, max_age=PLAZO_RECUPERACION_SEGUNDOS
        )
    except (BadSignature, ValueError, TypeError):
        return False
    return (
        isinstance(datos, dict)
        and isinstance(datos.get("uid"), int)
        and not isinstance(datos["uid"], bool)
        and datos["uid"] == usuario.id
        and isinstance(datos.get("ver"), str)
        and hmac.compare_digest(datos["ver"], version_credencial(usuario))
    )


def obtener_id_token(token):
    """Valida la firma y la caducidad antes de consultar el usuario."""
    if not isinstance(token, str) or not 10 <= len(token) <= 4096:
        return None
    try:
        datos = _serializador().loads(token, max_age=PLAZO_RECUPERACION_SEGUNDOS)
    except (BadSignature, ValueError, TypeError):
        return None
    if (
        isinstance(datos, dict)
        and isinstance(datos.get("uid"), int)
        and not isinstance(datos["uid"], bool)
        and 0 < datos["uid"] < 2**31
    ):
        return datos["uid"]
    return None
