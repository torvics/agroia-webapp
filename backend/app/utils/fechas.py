"""Zona horaria de la aplicación y rechazo de fechas futuras.

Mismo criterio que frontend/src/utils/fechas.js: un día es válido si no es
posterior a «hoy» en la zona horaria de la aplicación (America/Hermosillo).
"""
from datetime import date, datetime, timedelta, timezone

try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
except ImportError:  # pragma: no cover
    ZoneInfo = None
    ZoneInfoNotFoundError = Exception

ZONA_HORARIA_APP_NOMBRE = "America/Hermosillo"
MENSAJE_FECHA_FUTURA = (
    "No se permiten fechas posteriores a hoy "
    "(zona horaria America/Hermosillo)."
)


def _cargar_zona():
    try:
        return ZoneInfo(ZONA_HORARIA_APP_NOMBRE)
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        # Sin base de zonas (p. ej. Windows sin tzdata). Hermosillo no usa
        # horario de verano: es UTC-7 todo el año.
        return timezone(timedelta(hours=-7), ZONA_HORARIA_APP_NOMBRE)


ZONA_HORARIA_APP = _cargar_zona()


def hoy_app(ahora=None):
    """Fecha de hoy en la zona horaria de la aplicación."""
    ahora = ahora or datetime.now(timezone.utc)
    return ahora.astimezone(ZONA_HORARIA_APP).date()


def dia_app(fecha):
    """Día calendario de una fecha en la zona de la aplicación.

    Las fechas sin zona horaria se interpretan como UTC (convención de la BD).
    Un objeto date se devuelve tal cual.
    """
    if not isinstance(fecha, datetime):
        return fecha
    if fecha.tzinfo is None or fecha.utcoffset() is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(ZONA_HORARIA_APP).date()


def validar_rango_no_futuro(inicio=None, fin=None, fin_exclusivo=False, ahora=None):
    """Devuelve None si ningún extremo cae en un día futuro, o el mensaje de error.

    Con fin_exclusivo=True, «fin» es el primer instante fuera del rango
    (p. ej. 00:00 del día siguiente al último día incluido).
    """
    hoy = hoy_app(ahora)
    for fecha, exclusiva in ((inicio, False), (fin, fin_exclusivo)):
        if fecha is None:
            continue
        if exclusiva and isinstance(fecha, datetime):
            fecha = fecha - timedelta(microseconds=1)
        dia = dia_app(fecha)
        if isinstance(dia, date) and dia > hoy:
            return MENSAJE_FECHA_FUTURA
    return None
