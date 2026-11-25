"""Validadores compartidos de entrada (mismas reglas que frontend/src/utils/validaciones.js).

Cada función devuelve (valor_normalizado, None) si es válido o (None, mensaje)
si no lo es. No sustituyen a las consultas parametrizadas del ORM: solo
garantizan datos con sentido de negocio.
"""
import math
import re

# Letra Unicode (incluye tildes, ñ, ü): cualquier \w que no sea dígito ni "_".
_LETRA = r"[^\W\d_]"

# Nombre de persona: palabras de letras separadas por un espacio, guion o apóstrofo.
_RE_NOMBRE_PERSONA = re.compile(rf"{_LETRA}+(?:[ '’-]{_LETRA}+)*")
NOMBRE_PERSONA_MIN = 2
NOMBRE_PERSONA_MAX = 60
MENSAJE_NOMBRE_PERSONA = (
    "El nombre debe tener de 2 a 60 caracteres, al menos dos letras y solo "
    "letras (incluidas tildes y ñ), espacios, guion o apóstrofo."
)

PASSWORD_MIN = 12
PASSWORD_MAX = 128
MENSAJE_PASSWORD = (
    "La contraseña debe tener de 12 a 128 caracteres, incluir al menos una "
    "letra y un número, y no empezar ni terminar con espacios."
)

# Nombre de parcela: letras, números, espacios y signos habituales; al menos
# dos letras, para rechazar valores formados solo por signos o números.
_RE_NOMBRE_PARCELA = re.compile(r"[\w][\w .,#'’()/-]*")
NOMBRE_PARCELA_MIN = 2
NOMBRE_PARCELA_MAX = 100
MENSAJE_NOMBRE_PARCELA = (
    "El nombre de la parcela debe tener de 2 a 100 caracteres, incluir al "
    "menos dos letras y no estar formado solo por números o signos "
    "(ej. «Parcela 3 Norte»)."
)

_RE_COORDENADAS = re.compile(r"\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*")
MENSAJE_COORDENADAS = (
    "La ubicación debe tener el formato «latitud, longitud», por ejemplo "
    "29.086200, -110.951200 (latitud de -90 a 90 y longitud de -180 a 180)."
)

_RE_CORREO = re.compile(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
CORREO_MAX = 150
MENSAJE_CORREO = "Introduce un correo válido (ej. usuario@dominio.com)."


def _contar_letras(texto):
    return len(re.findall(_LETRA, texto))


def validar_nombre_persona(valor):
    if not isinstance(valor, str):
        return None, "El nombre debe ser texto."
    nombre = valor.strip()
    if (
        not NOMBRE_PERSONA_MIN <= len(nombre) <= NOMBRE_PERSONA_MAX
        or _contar_letras(nombre) < 2
        or not _RE_NOMBRE_PERSONA.fullmatch(nombre)
    ):
        return None, MENSAJE_NOMBRE_PERSONA
    return nombre, None


def validar_password(valor):
    """Política para contraseñas NUEVAS. El login no la aplica."""
    if not isinstance(valor, str):
        return None, MENSAJE_PASSWORD
    if (
        not PASSWORD_MIN <= len(valor) <= PASSWORD_MAX
        or valor != valor.strip()
        or not re.search(_LETRA, valor)
        or not re.search(r"\d", valor)
    ):
        return None, MENSAJE_PASSWORD
    return valor, None


def validar_nombre_parcela(valor):
    if not isinstance(valor, str):
        return None, MENSAJE_NOMBRE_PARCELA
    nombre = re.sub(r"\s+", " ", valor.strip())
    if (
        not NOMBRE_PARCELA_MIN <= len(nombre) <= NOMBRE_PARCELA_MAX
        or _contar_letras(nombre) < 2
        or not _RE_NOMBRE_PARCELA.fullmatch(nombre)
    ):
        return None, MENSAJE_NOMBRE_PARCELA
    return nombre, None


def validar_coordenadas(valor, obligatorio=False):
    """Devuelve 'lat, lon' normalizado con 6 decimales, o None si está vacío."""
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        if obligatorio:
            return None, MENSAJE_COORDENADAS
        return None, None
    if not isinstance(valor, str):
        return None, MENSAJE_COORDENADAS
    coincidencia = _RE_COORDENADAS.fullmatch(valor)
    if not coincidencia:
        return None, MENSAJE_COORDENADAS
    lat, lon = float(coincidencia.group(1)), float(coincidencia.group(2))
    if not (math.isfinite(lat) and math.isfinite(lon)) or not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None, MENSAJE_COORDENADAS
    return f"{lat:.6f}, {lon:.6f}", None


def leer_coordenadas(texto):
    """(lat, lon) si el texto guardado es una coordenada válida; si no, None."""
    normalizado, error = validar_coordenadas(texto, obligatorio=True)
    if error:
        return None
    lat, lon = normalizado.split(", ")
    return float(lat), float(lon)


def validar_correo(valor, opcional=False, maximo=CORREO_MAX):
    """Normaliza a minúsculas. Con opcional=True, vacío/None devuelve (None, None)."""
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        if opcional:
            return None, None
        return None, MENSAJE_CORREO
    if not isinstance(valor, str):
        return None, MENSAJE_CORREO
    correo = valor.strip().lower()
    if len(correo) > maximo or not _RE_CORREO.fullmatch(correo):
        return None, MENSAJE_CORREO
    return correo, None
