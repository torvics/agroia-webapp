
import math
from datetime import datetime, timedelta, timezone

from ..extensions import db
from ..models import AlertaConfig, AlertaEnviada


def fecha_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def registrar_alerta_critica(
    parcela_id,
    nodo_id,
    tipo_alerta,
    valor_detectado,
    mensaje_sensor
):
    """
    Comprueba el umbral y registra una alerta
    si existe una condición crítica.

    Devuelve:
    - AlertaEnviada: si creó una alerta.
    - None: si no corresponde crear una alerta.
    """

    # 1. Consultar configuración de la parcela
    config = AlertaConfig.query.filter_by(
        parcela_id=parcela_id
    ).first()

    if not config or not config.activa:
        return None

    # 2. Seleccionar el umbral correspondiente
    if tipo_alerta == "suelo_seco":
        umbral = config.humedad_suelo_min

    elif tipo_alerta == "temperatura_baja":
        umbral = config.temperatura_min

    else:
        raise ValueError("Tipo de alerta no válido")

    valor = float(valor_detectado)

    if not math.isfinite(valor):
        raise ValueError("La lectura debe ser un número finito")

    # 3. Comprobar si existe condición crítica
    if valor >= umbral:
        return None

    if config.cooldown_minutos < 1:
        raise ValueError("El cooldown debe ser positivo")

    # 4. Evitar alertas repetidas dentro del cooldown
    ahora = fecha_utc()

    limite = ahora - timedelta(
        minutes=config.cooldown_minutos
    )

    consulta = AlertaEnviada.query.filter(
        AlertaEnviada.parcela_id == parcela_id,
        AlertaEnviada.tipo_alerta == tipo_alerta,
        AlertaEnviada.canal == "correo",
        AlertaEnviada.fecha_deteccion >= limite
    )

    if nodo_id is None:
        consulta = consulta.filter(
            AlertaEnviada.nodo_id.is_(None)
        )
    else:
        consulta = consulta.filter(
            AlertaEnviada.nodo_id == nodo_id
        )

    if consulta.first():
        return None

    # 5. Registrar la condición crítica
    alerta = AlertaEnviada(
        parcela_id=parcela_id,
        nodo_id=nodo_id,
        tipo_alerta=tipo_alerta,
        valor_detectado=valor,
        umbral=umbral,
        mensaje=(
            f"{mensaje_sensor}: valor {valor}, "
            f"umbral mínimo {umbral}"
        ),
        canal="correo",
        destinatario=config.correo_destino,
        estado="pendiente",
        fecha_deteccion=ahora
    )

    try:
        db.session.add(alerta)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return alerta


def evaluar_alerta_nodo(nodo, humedad_suelo):
    """Detecta humedad crítica de un nodo de suelo."""

    if nodo.tipo != "sensor_suelo":
        raise ValueError("El dispositivo no es un nodo de suelo")

    return registrar_alerta_critica(
        parcela_id=nodo.parcela_id,
        nodo_id=nodo.id,
        tipo_alerta="suelo_seco",
        valor_detectado=humedad_suelo,
        mensaje_sensor=(
            f"Suelo seco en nodo {nodo.identificador}"
        )
    )


def evaluar_alerta_estacion(estacion, temp_ambiente):
    """Detecta temperatura ambiental baja."""

    if estacion.tipo != "estacion":
        raise ValueError("El dispositivo no es una estación")

    return registrar_alerta_critica(
        parcela_id=estacion.parcela_id,
        nodo_id=None,
        tipo_alerta="temperatura_baja",
        valor_detectado=temp_ambiente,
        mensaje_sensor=(
            f"Temperatura ambiental baja "
            f"en parcela {estacion.parcela_id}"
        )
    )
