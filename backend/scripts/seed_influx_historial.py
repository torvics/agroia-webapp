"""Genera datos históricos falsos en InfluxDB (bucket 'piloto') para poder
probar gráficas de RF3 (tiempo real) y RF4 (histórico) sin esperar días
reales de datos.

Escribe, cada 30 minutos durante los últimos 7 días:
- sensores_suelo (tag nodo_id: "1"-"4"): temp_suelo, humedad_suelo, bateria_pct
- sensores_estacion: temp_ambiente, humedad_ambiente, lluvia_mm, lluvia_acum_mm, bateria_pct

Los valores varían de forma realista (ciclo día/noche en temperatura,
humedad decayendo lentamente entre riegos, lluvia ocasional).

Uso (con Docker):
    docker compose exec backend python scripts/seed_influx_historial.py

Es seguro correrlo varias veces — InfluxDB simplemente sobreescribe los
puntos que caigan exactamente en el mismo timestamp+tags.
"""
import os
import sys
import math
import random
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://influxdb:8086")
INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "")
INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "agroia")
INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "piloto")

DIAS_HISTORIA = 7
INTERVALO_MIN = 30
NODOS = ["1", "2", "3", "4"]

random.seed(42)  # reproducible: mismos datos cada vez que se corre


def temp_ambiente_en(hora_del_dia):
    """Ciclo día/noche: mínimo ~14°C a las 5am, máximo ~30°C a las 3pm."""
    return 22 + 8 * math.sin((hora_del_dia - 7) / 24 * 2 * math.pi)


def generar_puntos():
    ahora = datetime.datetime.utcnow()
    inicio = ahora - datetime.timedelta(days=DIAS_HISTORIA)
    puntos = []

    humedad_suelo_por_nodo = {n: random.uniform(45, 60) for n in NODOS}
    lluvia_acum = 0.0

    t = inicio
    while t <= ahora:
        hora = t.hour + t.minute / 60
        temp_amb = temp_ambiente_en(hora) + random.uniform(-1, 1)
        humedad_amb = max(20, min(90, 70 - (temp_amb - 22) * 1.5 + random.uniform(-5, 5)))

        llueve = random.random() < 0.03  # ~3% de probabilidad por muestra
        lluvia_mm = round(random.uniform(1, 8), 1) if llueve else 0.0
        lluvia_acum += lluvia_mm

        puntos.append(
            Point("sensores_estacion")
            .field("temp_ambiente", round(temp_amb, 2))
            .field("humedad_ambiente", round(humedad_amb, 2))
            .field("lluvia_mm", lluvia_mm)
            .field("lluvia_acum_mm", round(lluvia_acum, 2))
            .field("bateria_pct", round(max(60, 100 - (t - inicio).days * 1.5), 1))
            .time(t)
        )

        for nodo in NODOS:
            # La humedad del suelo baja lentamente y sube si llovió
            humedad_suelo_por_nodo[nodo] -= random.uniform(0.05, 0.3)
            if llueve:
                humedad_suelo_por_nodo[nodo] += lluvia_mm * 0.8
            humedad_suelo_por_nodo[nodo] = max(15, min(75, humedad_suelo_por_nodo[nodo]))

            temp_suelo = temp_amb - random.uniform(1, 3)

            puntos.append(
                Point("sensores_suelo")
                .tag("nodo_id", nodo)
                .field("temp_suelo", round(temp_suelo, 2))
                .field("humedad_suelo", round(humedad_suelo_por_nodo[nodo], 2))
                .field("bateria_pct", float(round(max(55, 100 - (t - inicio).days * 2), 1)))
                .time(t)
            )

        t += datetime.timedelta(minutes=INTERVALO_MIN)

    return puntos


def main():
    puntos = generar_puntos()
    print(f"Generando {len(puntos)} puntos ({DIAS_HISTORIA} días, cada {INTERVALO_MIN} min, "
          f"{len(NODOS)} nodos + estación) en bucket '{INFLUXDB_BUCKET}'...")

    client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
    write_api = client.write_api(write_options=SYNCHRONOUS)

    lote = 500
    for i in range(0, len(puntos), lote):
        write_api.write(bucket=INFLUXDB_BUCKET, record=puntos[i:i + lote])
        print(f"  Escritos {min(i + lote, len(puntos))}/{len(puntos)}")

    client.close()
    print("Listo. Ya puedes probar gráficas de histórico en el Data Explorer o en el frontend.")


if __name__ == "__main__":
    main()