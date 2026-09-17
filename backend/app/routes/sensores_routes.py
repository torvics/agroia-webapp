from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

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
    """El ESP32 sube sus lecturas aquí (equivalente a subir_a_blynk() del firmware viejo)."""
    data = request.get_json() or {}
    client, write_api = _cliente_influx()

    punto = (
        Point("lectura_nodo")
        .tag("nodo_id", str(request.nodo.id))
        .field("temp_suelo", float(data.get("temp_suelo", 0)))
        .field("humedad_suelo", float(data.get("humedad_suelo", 0)))
        .field("bateria_pct", float(data.get("bateria_pct", 0)))
    )
    write_api.write(bucket=current_app.config["INFLUXDB_BUCKET"], record=punto)
    client.close()
    return jsonify({"status": "ok"}), 200


@sensores_bp.route("/actual/<int:nodo_id>", methods=["GET"])
@jwt_required()
def sensores_actual(nodo_id):
    """Última lectura de un nodo, para el dashboard en tiempo real."""
    client, _ = _cliente_influx()
    query_api = client.query_api()

    flux = f'''
    from(bucket: "{current_app.config["INFLUXDB_BUCKET"]}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "lectura_nodo" and r.nodo_id == "{nodo_id}")
      |> last()
    '''
    tables = query_api.query(flux)
    resultado = {}
    for table in tables:
        for record in table.records:
            resultado[record.get_field()] = record.get_value()
    client.close()
    return jsonify(resultado), 200
