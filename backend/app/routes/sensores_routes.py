from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

from ..models import Nodo
from ..utils.auth_nodo import requiere_api_key

sensores_bp = Blueprint("sensores", __name__)


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
                    "lluvia_acum_mm":.., "bateria_pct":.., "dds":.., "modo_riego":..},
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
        # Opcionales (los manda el firmware del padre). Siempre enteros, para
        # no chocar con el tipo de campo que InfluxDB fija en la primera escritura.
        if "dds" in est:
            punto_estacion = punto_estacion.field("dds", int(est["dds"]))
        if "modo_riego" in est:
            punto_estacion = punto_estacion.field("modo_riego", int(est["modo_riego"]))
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


@sensores_bp.route("/eventos-riego", methods=["POST"])
@requiere_api_key
def recibir_evento_riego():
    """La Estación avisa cada vez que un relé se enciende (estado=1) o se
    apaga (estado=0, con duración y litros). Alimenta la gráfica de eventos
    de riego (RF4) y permite saber el estado actual de cada relé.

    Body: {"identificador":"2", "estado":1, "duracion_min":0, "litros":0,
           "humedad_suelo_inicio":.., "humedad_suelo_fin":.., "dds":..}
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
        .field("humedad_suelo_inicio", float(d.get("humedad_suelo_inicio", 0)))
        .field("humedad_suelo_fin", float(d.get("humedad_suelo_fin", 0)))
        .field("dds", int(d.get("dds", 0)))
    )
    write_api.write(bucket=current_app.config["INFLUXDB_BUCKET"], record=punto)
    client.close()
    return jsonify({"status": "ok"}), 200


@sensores_bp.route("/decisiones-riego", methods=["POST"])
@requiere_api_key
def recibir_decision_riego():
    """Decisión diaria del modelo (0=sin riego, 1=regar pronto, 2=regar hoy)
    por nodo, con los datos que usó. Sirve para reportes (RF5).

    Body: {"identificador":"2", "decision":2, "agua_suelo":.., "eto":.., "dds":..}
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
    write_api.write(bucket=current_app.config["INFLUXDB_BUCKET"], record=punto)
    client.close()
    return jsonify({"status": "ok"}), 200


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