
from datetime import timedelta, timezone

from flask import current_app
from influxdb_client import InfluxDBClient
from sqlalchemy import func

from ..extensions import db
from ..models import (
    Parcela,
    Nodo,
    Comando,
    Bitacora,
    AlertaEnviada
)


CAMPOS_SENSORES = (
    "humedad_suelo",
    "temp_suelo",
    "temp_ambiente",
    "humedad_ambiente"
)


def fecha_iso(fecha):
    if fecha is None:
        return None

    return (
        fecha.replace(tzinfo=timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )


def obtener_estadisticas_sensores(
    parcela_id,
    inicio,
    fin
):
    """
    Calcula estadísticas de lecturas por parcela.

    Las fechas de consulta usan el intervalo:
    inicio inclusivo y fin exclusivo.
    """

    estadisticas = {
        campo: {
            "promedio": None,
            "minimo": None,
            "maximo": None,
            "lecturas": 0
        }
        for campo in CAMPOS_SENSORES
    }

    inicio_iso = inicio.isoformat().replace(
        "+00:00", "Z"
    )

    fin_iso = fin.isoformat().replace(
        "+00:00", "Z"
    )

    bucket = current_app.config["INFLUXDB_BUCKET"]

    # Solo lecturas etiquetadas con la parcela.
    flux_base = f'''
    from(bucket: "{bucket}")
      |> range(
          start: time(v: "{inicio_iso}"),
          stop: time(v: "{fin_iso}")
      )
      |> filter(fn: (r) =>
          exists r.parcela_id and
          r.parcela_id == "{parcela_id}"
      )
      |> filter(fn: (r) =>
          r._field == "humedad_suelo" or
          r._field == "temp_suelo" or
          r._field == "temp_ambiente" or
          r._field == "humedad_ambiente"
      )
      |> filter(fn: (r) =>
          r._measurement == "sensores_suelo" or
          r._measurement == "sensores_estacion"
      )
      |> group(columns: ["_measurement", "_field"])
    '''

    operaciones = {
        "mean": "promedio",
        "min": "minimo",
        "max": "maximo",
        "count": "lecturas"
    }

    client = InfluxDBClient(
        url=current_app.config["INFLUXDB_URL"],
        token=current_app.config["INFLUXDB_TOKEN"],
        org=current_app.config["INFLUXDB_ORG"]
    )

    try:
        query_api = client.query_api()

        for operacion, atributo in operaciones.items():

            consulta = (
                flux_base +
                f"\n |> {operacion}()"
            )

            tablas = query_api.query(consulta)

            for tabla in tablas:
                for registro in tabla.records:

                    campo = registro.get_field()
                    valor = registro.get_value()

                    if campo not in estadisticas:
                        continue

                    if valor is None:
                        continue

                    if atributo == "lecturas":
                        estadisticas[campo][atributo] = int(valor)
                    else:
                        estadisticas[campo][atributo] = round(
                            float(valor), 2
                        )

        # Solo obtenemos la última lectura del
        # acumulador, no el total del período.
        consulta_lluvia = f'''
        from(bucket: "{bucket}")
          |> range(
              start: time(v: "{inicio_iso}"),
              stop: time(v: "{fin_iso}")
          )
          |> filter(fn: (r) =>
              exists r.parcela_id and
              r.parcela_id == "{parcela_id}"
          )
          |> filter(fn: (r) =>
              r._measurement == "sensores_estacion"
          )
          |> filter(fn: (r) =>
              r._field == "lluvia_acum_mm"
          )
          |> group()
          |> last()
        '''

        tablas_lluvia = query_api.query(
            consulta_lluvia
        )

        lluvia_ultima = None

        for tabla in tablas_lluvia:
            for registro in tabla.records:
                lluvia_ultima = float(
                    registro.get_value()
                )

    finally:
        client.close()

    return {
        "estadisticas": estadisticas,
        "precipitacion": {
            "lluvia_acum_ultima_lectura_mm": lluvia_ultima,
            "total_periodo_mm": None,
            "observacion": (
                "El acumulador no representa "
                "necesariamente la lluvia del período. "
                "Se requiere validar sus reinicios."
            )
        }
    }


def obtener_eventos_mysql(parcela_id, inicio, fin):
    """Agrupa comandos, bitácora y alertas."""

    # MySQL almacena las fechas actuales
    # como datetime UTC sin zona horaria.
    inicio_db = inicio.replace(tzinfo=None)
    fin_db = fin.replace(tzinfo=None)

    # Historial de bitácora asociado a nodos
    # que actualmente pertenecen a la parcela.
    bitacora = (
        Bitacora.query
        .join(Nodo, Bitacora.nodo_id == Nodo.id)
        .filter(
            Nodo.parcela_id == parcela_id,
            Bitacora.fecha >= inicio_db,
            Bitacora.fecha < fin_db
        )
    )

    total_eventos = bitacora.count()

    ultimos_eventos = (
        bitacora
        .order_by(
            Bitacora.fecha.desc(),
            Bitacora.id.desc()
        )
        .limit(100)
        .all()
    )

    eventos = [
        {
            "id": evento.id,
            "usuario_id": evento.usuario_id,
            "nodo_id": evento.nodo_id,
            "accion": evento.accion,
            "fecha": fecha_iso(evento.fecha)
        }
        for evento in ultimos_eventos
    ]

    # Los comandos tienen retención limitada.
    comandos_base = (
        Comando.query
        .join(Nodo, Comando.nodo_id == Nodo.id)
        .filter(Nodo.parcela_id == parcela_id)
    )

    ordenes = comandos_base.filter(
        Comando.fecha_creacion >= inicio_db,
        Comando.fecha_creacion < fin_db
    )

    confirmados = comandos_base.filter(
        Comando.ejecutado.is_(True),
        Comando.fecha_ejecucion >= inicio_db,
        Comando.fecha_ejecucion < fin_db
    )

    resumen_comandos = {
        "ordenes_creadas": ordenes.count(),
        "ordenes_riego_creadas": ordenes.filter(
            Comando.tipo_comando == "riego"
        ).count(),
        "comandos_confirmados": confirmados.count(),
        "riego_confirmado": confirmados.filter(
            Comando.tipo_comando == "riego"
        ).count(),
        "rele_confirmado": confirmados.filter(
            Comando.tipo_comando == "rele"
        ).count(),
        "observacion": (
            "Los comandos ejecutados pueden eliminarse "
            "después de siete días. Los conteos históricos "
            "pueden estar incompletos."
        )
    }

    # Estadísticas de alertas detectadas.
    alertas_base = AlertaEnviada.query.filter(
        AlertaEnviada.parcela_id == parcela_id,
        AlertaEnviada.fecha_deteccion >= inicio_db,
        AlertaEnviada.fecha_deteccion < fin_db
    )

    total_alertas = alertas_base.count()

    conteos_tipo = (
        db.session.query(
            AlertaEnviada.tipo_alerta,
            func.count(AlertaEnviada.id)
        )
        .filter(
            AlertaEnviada.parcela_id == parcela_id,
            AlertaEnviada.fecha_deteccion >= inicio_db,
            AlertaEnviada.fecha_deteccion < fin_db
        )
        .group_by(AlertaEnviada.tipo_alerta)
        .all()
    )

    tipos_alertas = {
        tipo: cantidad
        for tipo, cantidad in conteos_tipo
    }

    return {
        "bitacora": {
            "total_eventos": total_eventos,
            "eventos_mostrados": len(eventos),
            "ultimos_eventos": eventos
        },
        "comandos": resumen_comandos,
        "alertas": {
            "total": total_alertas,
            "por_tipo": tipos_alertas
        }
    }


def generar_reporte_parcela(
    parcela_id,
    inicio,
    fin
):
    """Combina los datos de MySQL e InfluxDB."""

    if not isinstance(parcela_id, int) or parcela_id <= 0:
        raise ValueError("Parcela inválida")

    if (
        inicio.utcoffset() is None
        or fin.utcoffset() is None
    ):
        raise ValueError(
            "Las fechas deben incluir zona horaria"
        )

    inicio = inicio.astimezone(timezone.utc)
    fin = fin.astimezone(timezone.utc)

    if inicio >= fin:
        raise ValueError(
            "La fecha inicio debe ser anterior a fin"
        )

    if fin - inicio > timedelta(days=366):
        raise ValueError(
            "El período máximo es de 366 días"
        )

    parcela = db.session.get(Parcela, parcela_id)

    if parcela is None:
        raise LookupError("Parcela no encontrada")

    sensores = obtener_estadisticas_sensores(
        parcela_id,
        inicio,
        fin
    )

    eventos = obtener_eventos_mysql(
        parcela_id,
        inicio,
        fin
    )

    return {
        "parcela": {
            "id": parcela.id,
            "nombre": parcela.nombre,
            "ubicacion": parcela.ubicacion
        },
        "periodo": {
            "inicio": inicio.isoformat().replace(
                "+00:00", "Z"
            ),
            "fin_exclusivo": fin.isoformat().replace(
                "+00:00", "Z"
            )
        },
        "sensores": sensores,
        "eventos": eventos,
        "consumo_agua": {
            "litros": None,
            "estado": "no_disponible",
            "observacion": (
                "No existen mediciones de caudal "
                "ni volumen de agua de riego."
            )
        }
    }
