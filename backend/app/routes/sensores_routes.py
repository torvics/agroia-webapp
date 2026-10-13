from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from datetime import datetime, timedelta, timezone
from ..services.alertas_service import (evaluar_alerta_nodo, evaluar_alerta_estacion)

from ..extensions import db
from ..models import Nodo, Parcela
from ..utils.auth_nodo import requiere_api_key

sensores_bp = Blueprint("sensores", __name__)
estacion_bp = Blueprint("estacion", __name__)
nodos_datos_bp = Blueprint("nodos_datos", __name__)
lluvia_bp = Blueprint("lluvia", __name__)


def _cliente_influx():
    client = InfluxDBClient(
        url=current_app.config["INFLUXDB_URL"],
        token=current_app.config["INFLUXDB_TOKEN"],
        org=current_app.config["INFLUXDB_ORG"],
    )
    return client, client.write_api(write_options=SYNCHRONOUS)


@sensores_bp.route("/datos", methods=["POST"])
@requiere_api_key
def recibir_datos():
    """La Estación (único nodo con internet) sube en una sola llamada sus propios
    datos ambientales + los de los 4 nodos de suelo que recibió por LoRa.
    Equivalente a guardar_sensores_estacion() + guardar_sensores_suelo() en el
    firmware original, solo que ahora escriben a través del backend.

    Body esperado:
    {
      "estacion": {"temp_ambiente":.., "humedad_ambiente":.., "lluvia_mm":..,
                    "lluvia_acum_mm":.., "bateria_pct":..},
      "nodos": [{"identificador":"1", "temp_suelo":.., "humedad_suelo":.., "bateria_pct":..}, ...]
    }
    """
    data = request.get_json() or {}
    client, write_api = _cliente_influx()

    est = data.get("estacion", {})
    if est:
        punto_estacion = (
            Point("sensores_estacion")
            .field("temp_ambiente", float(est.get("temp_ambiente", 0)))
            .field("humedad_ambiente", float(est.get("humedad_ambiente", 0)))
            .field("lluvia_mm", float(est.get("lluvia_mm", 0)))
            .field("lluvia_acum_mm", float(est.get("lluvia_acum_mm", 0)))
            .field("bateria_pct", float(est.get("bateria_pct", 0)))
        )
        # Campos opcionales enviados por el simulador
        if "dds" in est: punto_estacion = punto_estacion.field( "dds", int(est["dds"]))
        if "modo_riego" in est: punto_estacion = punto_estacion.field( "modo_riego", int(est["modo_riego"]))

        write_api.write(bucket=current_app.config["INFLUXDB_BUCKET"], record=punto_estacion)

    for n in data.get("nodos", []):
        punto_nodo = (
            Point("sensores_suelo")
            .tag("nodo_id", str(n["identificador"]))
            .field("temp_suelo", float(n.get("temp_suelo", 0)))
            .field("humedad_suelo", float(n.get("humedad_suelo", 0)))
            .field("bateria_pct", float(n.get("bateria_pct", 0)))
        )
        write_api.write(bucket=current_app.config["INFLUXDB_BUCKET"], record=punto_nodo)

    client.close()
    return jsonify({"status": "ok", "nodos_recibidos": len(data.get("nodos", []))}), 200


@sensores_bp.route("/actual/<string:identificador_nodo>", methods=["GET"])
@jwt_required()
def sensores_actual(identificador_nodo):
    """Última lectura de un nodo de suelo específico ("1"-"4"), para el dashboard.
    Para datos de la estación, usar /sensores/estacion en su lugar."""
    client, _ = _cliente_influx()
    query_api = client.query_api()

    flux = f'''
    from(bucket: "{current_app.config["INFLUXDB_BUCKET"]}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "sensores_suelo" and r.nodo_id == "{identificador_nodo}")
      |> last()
    '''
    tables = query_api.query(flux)
    resultado = {}
    for table in tables:
        for record in table.records:
            resultado[record.get_field()] = record.get_value()
    client.close()
    return jsonify(resultado), 200


@sensores_bp.route("/estacion", methods=["GET"])
@jwt_required()
def sensores_estacion_actual():

    """Última lectura ambiental de la Estación (temp/humedad ambiente, lluvia)."""
    client, _ = _cliente_influx()
    query_api = client.query_api()

    flux = f'''
    from(bucket: "{current_app.config["INFLUXDB_BUCKET"]}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "sensores_estacion")
      |> last()
    '''
    tables = query_api.query(flux)
    resultado = {}
    for table in tables:
        for record in table.records:
            resultado[record.get_field()] = record.get_value()
    client.close()
    return jsonify(resultado), 200


@estacion_bp.route("/datos", methods=["POST"])
@requiere_api_key
def recibir_datos_estacion():
    """
    La Estación envía sus datos ambientales al backend.

    Endpoint:
    POST /api/estacion/datos

    Header:
    X-API-KEY: <api_key_estacion>

    Body esperado:
    {
        "temp_ambiente": 28.5,
        "humedad_ambiente": 55.2,
        "lluvia_mm": 0.0,
        "lluvia_acum_mm": 12.4,
        "bateria_pct": 93.0
    }
    """

    data = request.get_json() or {}

    campos_requeridos = [
        "temp_ambiente",
        "humedad_ambiente",
        "lluvia_mm"
    ]

    faltantes = [
        campo
        for campo in campos_requeridos
        if campo not in data
    ]

    if faltantes:
        return jsonify({
            "error": "Faltan campos obligatorios",
            "campos": faltantes
        }), 400

    try:
        punto = (
            Point("sensores_estacion")

            # Identificamos a qué parcela y estación
            # pertenece esta lectura.
            .tag("parcela_id", str(request.nodo.parcela_id))
            .tag("estacion_id", str(request.nodo.id))

            .field(
                "temp_ambiente",
                float(data["temp_ambiente"])
            )
            .field(
                "humedad_ambiente",
                float(data["humedad_ambiente"])
            )
            .field(
                "lluvia_mm",
                float(data["lluvia_mm"])
            )
        )

        # Estos campos pueden ser opcionales
        if "lluvia_acum_mm" in data:
            punto.field(
                "lluvia_acum_mm",
                float(data["lluvia_acum_mm"])
            )

        if "bateria_pct" in data:
            punto.field(
                "bateria_pct",
                float(data["bateria_pct"])
            )

    except (TypeError, ValueError):
        return jsonify({
            "error": "Los valores de los sensores deben ser numéricos"
        }), 400

        # 1. Guardar primero la lectura ambiental en InfluxDB
    client, write_api = _cliente_influx()

    try:
        write_api.write(
            bucket=current_app.config["INFLUXDB_BUCKET"],
            record=punto
        )
    finally:
        client.close()

    # 2. Evaluar si la temperatura ambiental es crítica
    resultado_alerta = "sin_nueva_alerta"

    try:
        alerta = evaluar_alerta_estacion(
            request.nodo,
            float(data["temp_ambiente"])
        )

        if alerta is not None:
            resultado_alerta = "registrada"

    except Exception:
        db.session.rollback()
        resultado_alerta = "error"

        current_app.logger.exception(
            "Error al evaluar alerta de estación %s",
            request.nodo.id
        )

    # 3. Confirmar la recepción de datos
    return jsonify({
        "status": "ok",
        "mensaje": "Datos de estación almacenados",
        "estacion_id": request.nodo.id,
        "parcela_id": request.nodo.parcela_id,
        "alerta_procesamiento": resultado_alerta
    }), 201

@nodos_datos_bp.route("/<int:nodo_id>/datos", methods=["POST"])
@requiere_api_key
def recibir_datos_nodo(nodo_id):
    """
    La Estación envía al backend los datos recibidos por LoRa
    desde un nodo de suelo.

    Endpoint:
    POST /api/nodos/<id>/datos

    Header:
    X-API-KEY: <api_key_estacion>

    Body esperado:
    {
        "temp_suelo": 26.3,
        "humedad_suelo": 54.8,
        "bateria_pct": 88.0
    }
    """

    nodo = db.session.get(Nodo, nodo_id)

    if not nodo or nodo.tipo != "sensor_suelo":
        return jsonify({
            "error": "Nodo de suelo no encontrado"
        }), 404

    # La estación solamente puede reportar datos
    # de nodos pertenecientes a su parcela.
    if nodo.parcela_id != request.nodo.parcela_id:
        return jsonify({
            "error": "Nodo no autorizado para esta estación"
        }), 403

    if nodo.estado != "activo":
        return jsonify({
            "error": "El nodo no está activo"
        }), 409

    data = request.get_json() or {}

    campos_requeridos = [
        "temp_suelo",
        "humedad_suelo"
    ]

    faltantes = [
        campo
        for campo in campos_requeridos
        if campo not in data
    ]

    if faltantes:
        return jsonify({
            "error": "Faltan campos obligatorios",
            "campos": faltantes
        }), 400

    try:
        punto = (
            Point("sensores_suelo")

            # ID real de MySQL
            .tag("nodo_db_id", str(nodo.id))

            # Identificador usado actualmente por el proyecto
            .tag("nodo_id", str(nodo.identificador))

            # Nos permitirá consultar por parcela después
            .tag("parcela_id", str(nodo.parcela_id))

            .field(
                "temp_suelo",
                float(data["temp_suelo"])
            )
            .field(
                "humedad_suelo",
                float(data["humedad_suelo"])
            )
        )

        if "bateria_pct" in data:
            punto.field(
                "bateria_pct",
                float(data["bateria_pct"])
            )

    except (TypeError, ValueError):
        return jsonify({
            "error": "Los valores de los sensores deben ser numéricos"
        }), 400

        # 1. Guardar primero los datos del nodo en InfluxDB
    client, write_api = _cliente_influx()

    try:
        write_api.write(
            bucket=current_app.config["INFLUXDB_BUCKET"],
            record=punto
        )
    finally:
        client.close()

    # 2. Evaluar si la humedad del suelo es crítica
    resultado_alerta = "sin_nueva_alerta"

    try:
        alerta = evaluar_alerta_nodo(
            nodo,
            float(data["humedad_suelo"])
        )

        if alerta is not None:
            resultado_alerta = "registrada"

    except Exception:
        db.session.rollback()
        resultado_alerta = "error"

        current_app.logger.exception(
            "Error al evaluar alerta del nodo %s",
            nodo.id
        )

    # 3. Confirmar la recepción de datos
    return jsonify({
        "status": "ok",
        "mensaje": "Datos del nodo almacenados",
        "nodo_id": nodo.id,
        "identificador": nodo.identificador,
        "parcela_id": nodo.parcela_id,
        "alerta_procesamiento": resultado_alerta
    }), 201


# =========================================================
# 1.3.4 OBTENER ÚLTIMAS LECTURAS POR PARCELA
# GET /api/sensores/actual?parcela_id=2
# =========================================================

@sensores_bp.route("/actual", methods=["GET"])
@jwt_required()
def sensores_actual_parcela():

    usuario_id = int(get_jwt_identity())
    rol = get_jwt().get("rol")

    # Obtenemos el ID de la parcela
    parcela_id = request.args.get(
        "parcela_id",
        type=int
    )

    if parcela_id is None or parcela_id <= 0:
        return jsonify({
            "error": "parcela_id válido es obligatorio"
        }), 400

    # Comprobamos que la parcela exista
    parcela = db.session.get(Parcela, parcela_id)

    if not parcela:
        return jsonify({
            "error": "Parcela no encontrada"
        }), 404

    # El agricultor solamente puede consultar
    # los sensores de sus propias parcelas.
    if rol != "admin":
        if parcela.usuario_id != usuario_id:
            return jsonify({
                "error": "No autorizado para consultar esta parcela"
            }), 403

    client, _ = _cliente_influx()

    bucket = current_app.config["INFLUXDB_BUCKET"]

    # Buscamos las últimas lecturas de las últimas 24 horas.
    # Solamente recuperamos datos de la parcela solicitada.
    flux = f'''
    from(bucket: "{bucket}")
      |> range(start: -24h)
      |> filter(fn: (r) =>
          r._measurement == "sensores_estacion" or
          r._measurement == "sensores_suelo"
      )
      |> filter(fn: (r) =>
          r.parcela_id == "{parcela_id}"
      )
      |> last()
    '''

    try:
        tables = client.query_api().query(flux)
    finally:
        client.close()

    estaciones = {}
    nodos = {}

    for table in tables:
        for record in table.records:

            medicion = record.get_measurement()
            campo = record.get_field()
            valor = record.get_value()
            fecha = record.get_time()

            # -----------------------------------------
            # Datos de la estación
            # -----------------------------------------
            if medicion == "sensores_estacion":

                estacion_id = record.values.get("estacion_id")

                if not estacion_id:
                    continue

                estacion = estaciones.setdefault(
                    estacion_id,
                    {
                        "estacion_id": int(estacion_id),
                        "fecha_lectura": None,
                        "_fecha": None
                    }
                )

                estacion[campo] = valor

                if (
                    estacion["_fecha"] is None or
                    fecha > estacion["_fecha"]
                ):
                    estacion["_fecha"] = fecha
                    estacion["fecha_lectura"] = fecha.isoformat()

            # -----------------------------------------
            # Datos de nodos de suelo
            # -----------------------------------------
            elif medicion == "sensores_suelo":

                nodo_id = record.values.get("nodo_db_id")

                if not nodo_id:
                    continue

                nodo = nodos.setdefault(
                    nodo_id,
                    {
                        "nodo_id": int(nodo_id),
                        "identificador": record.values.get("nodo_id"),
                        "fecha_lectura": None,
                        "_fecha": None
                    }
                )

                nodo[campo] = valor

                if (
                    nodo["_fecha"] is None or
                    fecha > nodo["_fecha"]
                ):
                    nodo["_fecha"] = fecha
                    nodo["fecha_lectura"] = fecha.isoformat()

    # Si existen varias estaciones, devolvemos
    # la que tenga la lectura más reciente.
    estacion_actual = None

    if estaciones:
        estacion_actual = max(
            estaciones.values(),
            key=lambda e: e["_fecha"]
        ).copy()

        estacion_actual.pop("_fecha", None)

    nodos_actuales = []

    for nodo in nodos.values():
        nodo.pop("_fecha", None)
        nodos_actuales.append(nodo)

    nodos_actuales.sort(key=lambda n: n["nodo_id"])

    return jsonify({
        "parcela_id": parcela_id,
        "estacion": estacion_actual,
        "nodos": nodos_actuales
    }), 200



# =========================================================
# 1.3.5 HISTÓRICO DE SENSORES POR RANGO DE FECHAS
# GET /api/sensores/historico
# =========================================================

@sensores_bp.route("/historico", methods=["GET"])
@jwt_required()
def sensores_historico():

    usuario_id = int(get_jwt_identity())
    rol = get_jwt().get("rol")

    parcela_id = request.args.get("parcela_id", type=int)
    inicio_texto = request.args.get("inicio")
    fin_texto = request.args.get("fin")
    intervalo = request.args.get("intervalo", "30m")

    # Validamos la parcela
    if parcela_id is None or parcela_id <= 0:
        return jsonify({
            "error": "parcela_id válido es obligatorio"
        }), 400

    parcela = db.session.get(Parcela, parcela_id)

    if not parcela:
        return jsonify({
            "error": "Parcela no encontrada"
        }), 404

    if rol != "admin" and parcela.usuario_id != usuario_id:
        return jsonify({
            "error": "No autorizado para consultar esta parcela"
        }), 403

    # Validamos que las fechas existan
    if not inicio_texto or not fin_texto:
        return jsonify({
            "error": "Los parámetros inicio y fin son obligatorios"
        }), 400

    # Las fechas deben incluir zona horaria.
    # Ejemplo: 2026-10-07T00:00:00Z
    try:
        inicio = datetime.fromisoformat(
            inicio_texto.replace("Z", "+00:00")
        )
        fin = datetime.fromisoformat(
            fin_texto.replace("Z", "+00:00")
        )

        if inicio.utcoffset() is None or fin.utcoffset() is None:
            raise ValueError("Falta zona horaria")

        inicio = inicio.astimezone(timezone.utc)
        fin = fin.astimezone(timezone.utc)

    except (ValueError, TypeError):
        return jsonify({
            "error": "Fechas inválidas. Usa ISO 8601 con zona horaria"
        }), 400

    if inicio >= fin:
        return jsonify({
            "error": "La fecha inicio debe ser anterior a fin"
        }), 400

    if fin - inicio > timedelta(days=31):
        return jsonify({
            "error": "El rango máximo por consulta es de 31 días"
        }), 400

    # Intervalos permitidos para las gráficas.
    # raw devuelve las lecturas originales.
    intervalos_validos = {
        "raw", "5m", "15m", "30m", "1h", "1d"
    }

    if intervalo not in intervalos_validos:
        return jsonify({
            "error": "Intervalo no válido",
            "permitidos": sorted(intervalos_validos)
        }), 400

    # Limitamos las consultas sin agrupación.
    if intervalo == "raw" and fin - inicio > timedelta(days=7):
        return jsonify({
            "error": "El intervalo raw permite máximo 7 días"
        }), 400

    inicio_iso = inicio.isoformat().replace("+00:00", "Z")
    fin_iso = fin.isoformat().replace("+00:00", "Z")

    bucket = current_app.config["INFLUXDB_BUCKET"]

    # Al agrupar, conservamos la última lectura
    # de cada campo dentro del intervalo seleccionado.
    agrupacion = ""

    if intervalo != "raw":
        agrupacion = (
            f'|> aggregateWindow('
            f'every: {intervalo}, '
            f'fn: last, '
            f'createEmpty: false)'
        )

    flux = f'''
    from(bucket: "{bucket}")
      |> range(
          start: time(v: "{inicio_iso}"),
          stop: time(v: "{fin_iso}")
      )
      |> filter(fn: (r) =>
          r.parcela_id == "{parcela_id}"
      )
      |> filter(fn: (r) =>
          r._measurement == "sensores_estacion" or
          r._measurement == "sensores_suelo"
      )
      {agrupacion}
      |> pivot(
          rowKey: ["_time"],
          columnKey: ["_field"],
          valueColumn: "_value"
      )
    '''

    client = None

    try:
        client, _ = _cliente_influx()
        tables = client.query_api().query(flux)

    except Exception:
        current_app.logger.exception(
            "Error consultando histórico en InfluxDB"
        )
        return jsonify({
            "error": "No fue posible consultar InfluxDB"
        }), 503

    finally:
        if client is not None:
            client.close()

    estaciones = {}
    nodos = {}
    total_lecturas = 0

    for table in tables:
        for record in table.records:

            valores = record.values
            medicion = valores.get("_measurement")
            fecha = record.get_time().isoformat()

            if medicion == "sensores_estacion":

                estacion_id = valores.get("estacion_id")

                if estacion_id is None:
                    continue

                estacion = estaciones.setdefault(
                    estacion_id,
                    {
                        "estacion_id": int(estacion_id),
                        "lecturas": []
                    }
                )

                lectura = {"fecha": fecha}

                for campo in (
                    "temp_ambiente",
                    "humedad_ambiente",
                    "lluvia_mm",
                    "lluvia_acum_mm",
                    "bateria_pct"
                ):
                    if valores.get(campo) is not None:
                        lectura[campo] = valores[campo]

                estacion["lecturas"].append(lectura)
                total_lecturas += 1

            elif medicion == "sensores_suelo":

                nodo_id = valores.get("nodo_db_id")

                if nodo_id is None:
                    continue

                nodo = nodos.setdefault(
                    nodo_id,
                    {
                        "nodo_id": int(nodo_id),
                        "identificador": valores.get("nodo_id"),
                        "lecturas": []
                    }
                )

                lectura = {"fecha": fecha}

                for campo in (
                    "temp_suelo",
                    "humedad_suelo",
                    "bateria_pct"
                ):
                    if valores.get(campo) is not None:
                        lectura[campo] = valores[campo]

                nodo["lecturas"].append(lectura)
                total_lecturas += 1

            # Evitamos respuestas excesivamente grandes.
            if total_lecturas > 10000:
                return jsonify({
                    "error": "Demasiadas lecturas",
                    "mensaje": "Reduce el rango o utiliza un intervalo mayor"
                }), 413

    # Ordenamos cronológicamente todas las lecturas.
    for estacion in estaciones.values():
        estacion["lecturas"].sort(
            key=lambda lectura: lectura["fecha"]
        )

    for nodo in nodos.values():
        nodo["lecturas"].sort(
            key=lambda lectura: lectura["fecha"]
        )

    return jsonify({
        "parcela_id": parcela_id,
        "inicio": inicio_iso,
        "fin": fin_iso,
        "intervalo": intervalo,
        "total_lecturas": total_lecturas,
        "estaciones": sorted(
            estaciones.values(),
            key=lambda e: e["estacion_id"]
        ),
        "nodos": sorted(
            nodos.values(),
            key=lambda n: n["nodo_id"]
        )
    }), 200



# =========================================================
# 1.3.6 INDICADOR DEL PLUVIÓMETRO
# GET /api/lluvia?parcela_id=2
# =========================================================

@lluvia_bp.route("/lluvia", methods=["GET"])
@jwt_required()
def obtener_lluvia():

    usuario_id = int(get_jwt_identity())
    rol = get_jwt().get("rol")

    parcela_id = request.args.get("parcela_id", type=int)

    # 1. Validar el ID de la parcela
    if parcela_id is None or parcela_id <= 0:
        return jsonify({
            "error": "parcela_id válido es obligatorio"
        }), 400

    parcela = db.session.get(Parcela, parcela_id)

    if not parcela:
        return jsonify({
            "error": "Parcela no encontrada"
        }), 404

    # 2. Verificar permisos del usuario
    if rol != "admin" and parcela.usuario_id != usuario_id:
        return jsonify({
            "error": "No autorizado para consultar esta parcela"
        }), 403

    bucket = current_app.config["INFLUXDB_BUCKET"]

    # 3. Buscar la última lectura de lluvia de la parcela.
    # Se limita la búsqueda a las últimas 24 horas.
    flux = f'''
    from(bucket: "{bucket}")
      |> range(start: -24h)
      |> filter(fn: (r) =>
          r._measurement == "sensores_estacion"
      )
      |> filter(fn: (r) =>
          r.parcela_id == "{parcela_id}"
      )
      |> filter(fn: (r) =>
          r._field == "lluvia_mm" or
          r._field == "lluvia_acum_mm"
      )
      |> pivot(
          rowKey: ["_time"],
          columnKey: ["_field"],
          valueColumn: "_value"
      )
      |> group()
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 1)
    '''

    client = None

    try:
        client, _ = _cliente_influx()
        tables = client.query_api().query(flux)

    except Exception:
        current_app.logger.exception(
            "Error al consultar datos de lluvia"
        )
        return jsonify({
            "error": "No fue posible consultar InfluxDB"
        }), 503

    finally:
        if client is not None:
            client.close()

    # 4. Obtener la lectura más reciente
    registros = [
        registro
        for tabla in tables
        for registro in tabla.records
    ]

    if not registros:
        return jsonify({
            "parcela_id": parcela_id,
            "estacion_id": None,
            "lluvia_mm": None,
            "lluvia_acum_mm": None,
            "lluvia_detectada": None,
            "lectura_reciente": False,
            "fecha_lectura": None,
            "estado": "sin_datos"
        }), 200

    registro = registros[0]

    estacion_id = registro.values.get("estacion_id")
    lluvia_mm = registro.values.get("lluvia_mm")
    lluvia_acum_mm = registro.values.get("lluvia_acum_mm")
    fecha = registro.get_time()

    # 5. Evaluar si la lectura es reciente.
    # Este valor se debe ajustar según la frecuencia
    # real de envío de datos de la estación.
    ahora = datetime.now(timezone.utc)
    antiguedad = ahora - fecha

    lectura_reciente = (
        timedelta(0) <= antiguedad <= timedelta(minutes=30)
    )

    # Una lectura antigua no permite determinar
    # si se ha reportado lluvia recientemente.
    if not lectura_reciente:
        estado = "lectura_desactualizada"
        lluvia_detectada = None

    elif lluvia_mm is None:
        estado = "dato_incompleto"
        lluvia_detectada = None

    elif float(lluvia_mm) > 0:
        estado = "lluvia_reportada"
        lluvia_detectada = True

    else:
        estado = "sin_lluvia_reportada"
        lluvia_detectada = False

    # 6. Responder al frontend
    return jsonify({
        "parcela_id": parcela_id,
        "estacion_id": (
            int(estacion_id) if estacion_id is not None else None
        ),
        "lluvia_mm": lluvia_mm,
        "lluvia_acum_mm": lluvia_acum_mm,
        "lluvia_detectada": lluvia_detectada,
        "lectura_reciente": lectura_reciente,
        "fecha_lectura": fecha.isoformat(),
        "estado": estado
    }), 200

# =========================================================
# SIMULADOR - EVENTOS DE RIEGO
# POST /api/sensores/eventos-riego
# =========================================================

@sensores_bp.route("/eventos-riego", methods=["POST"])
@requiere_api_key
def recibir_evento_riego():
    """
    La estación informa cuándo un relé se enciende
    o se apaga.

    Alimenta la gráfica de eventos de riego y permite
    registrar duración, litros y humedad del suelo.
    """

    d = request.get_json() or {}

    if "identificador" not in d:
        return jsonify({"error": "falta identificador"}), 400

    client, write_api = _cliente_influx()

    punto = (
        Point("eventos_riego")
        .tag("nodo_id", str(d["identificador"]))
        .field("estado", int(d.get("estado", 0)))
        .field("duracion_min", float(d.get("duracion_min", 0)))
        .field("litros", float(d.get("litros", 0)))
        .field(
            "humedad_suelo_inicio",
            float(d.get("humedad_suelo_inicio", 0))
        )
        .field(
            "humedad_suelo_fin",
            float(d.get("humedad_suelo_fin", 0))
        )
        .field("dds", int(d.get("dds", 0)))
    )

    try:
        write_api.write(
            bucket=current_app.config["INFLUXDB_BUCKET"],
            record=punto
        )
    finally:
        client.close()

    return jsonify({"status": "ok"}), 200


# =========================================================
# SIMULADOR - DECISIONES DE RIEGO
# POST /api/sensores/decisiones-riego
# =========================================================

@sensores_bp.route("/decisiones-riego", methods=["POST"])
@requiere_api_key
def recibir_decision_riego():
    """
    Registra las decisiones del modelo de riego.

    0 = Sin riego
    1 = Regar pronto
    2 = Regar hoy
    """

    d = request.get_json() or {}

    if "identificador" not in d:
        return jsonify({"error": "falta identificador"}), 400

    client, write_api = _cliente_influx()

    punto = (
        Point("decisiones_riego")
        .tag("nodo_id", str(d["identificador"]))
        .field("decision", int(d.get("decision", 0)))
        .field("agua_suelo", float(d.get("agua_suelo", 0)))
        .field("eto", float(d.get("eto", 0)))
        .field("dds", int(d.get("dds", 0)))
    )

    try:
        write_api.write(
            bucket=current_app.config["INFLUXDB_BUCKET"],
            record=punto
        )
    finally:
        client.close()

    return jsonify({"status": "ok"}), 200