"""Simula el polling del ESP32 preguntando por comandos pendientes (riego/relé)."""
import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("API_URL", "http://localhost:5000/api")
API_KEY = os.getenv("API_KEY_NODO")
NODO_ID = os.getenv("NODO_ID", "1")


def main():
    headers = {"X-API-KEY": API_KEY}
    print(f"Consultando comandos para Nodo {NODO_ID} cada 3s...")
    while True:
        try:
            r = requests.get(f"{API_URL}/nodos/{NODO_ID}/comando", headers=headers, timeout=5)
            data = r.json()
            if data.get("pendiente"):
                print(f"[Nodo {NODO_ID}] ejecutando comando: {data}")
                requests.post(
                    f"{API_URL}/nodos/{NODO_ID}/comando/confirmar",
                    json={"comando_id": data["comando_id"]},
                    headers=headers,
                    timeout=5,
                )
        except requests.RequestException as e:
            print(f"Error consultando comando: {e}")
        time.sleep(3)


if __name__ == "__main__":
    main()
