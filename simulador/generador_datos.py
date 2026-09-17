"""Simula un nodo ESP32 subiendo lecturas de sensores cada 10 segundos."""
import os
import time
import random
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("API_URL", "http://localhost:5000/api")
API_KEY = os.getenv("API_KEY_NODO")
NODO_ID = os.getenv("NODO_ID", "1")


def generar_lectura():
    return {
        "temp_suelo": round(random.uniform(18, 32), 1),
        "humedad_suelo": round(random.uniform(20, 70), 1),
        "bateria_pct": round(random.uniform(60, 100), 1),
    }


def main():
    headers = {"X-API-KEY": API_KEY}
    print(f"Simulando Nodo {NODO_ID} -> {API_URL}/sensores/datos")
    while True:
        data = generar_lectura()
        try:
            r = requests.post(f"{API_URL}/sensores/datos", json=data, headers=headers, timeout=5)
            print(f"[Nodo {NODO_ID}] enviado: {data} -> {r.status_code}")
        except requests.RequestException as e:
            print(f"Error enviando datos: {e}")
        time.sleep(10)


if __name__ == "__main__":
    main()
