"""
simulador_nodos.py
─────────────────────────────────────────────────────────────
Simula los 4 nodos de suelo del sistema de riego (ya no hay ESP32 hijos).
Cada nodo le manda sus lecturas al ESP32 PADRE por HTTP (POST /datos),
haciendo el papel que antes hacía LoRa. El padre las reenvía a la página web.

  PC (este script) --HTTP--> ESP32 padre --HTTP--> Backend Flask (web)

Nodo 1 además simula el pluviómetro (campo lluvia_mm), igual que el
nodo hijo real. Si llueve, llueve en toda la parcela: los otros 3 nodos
suben su humedad cuando el Nodo 1 reporta lluvia.

Instalar dependencias:
  pip install requests

Correr:
  python simulador_nodos.py

Opcional (sin editar el archivo):
  set PADRE_IP=192.168.1.50        (Windows cmd)
  $env:PADRE_IP="192.168.1.50"     (PowerShell)
"""

import os
import time
import math
import random
import threading
import requests

# ────────────────────────────────────────────────────────────
# CONFIGURACIÓN PADRE ESP32
# ────────────────────────────────────────────────────────────
# La IP del padre la imprime el ESP32 en el monitor serial al conectarse al WiFi.
PADRE_IP       = os.getenv("PADRE_IP", "192.168.1.185")
PADRE_PORT     = int(os.getenv("PADRE_PORT", "80"))
PADRE_ENDPOINT = f"http://{PADRE_IP}:{PADRE_PORT}/datos"
ENVIAR_A_PADRE = os.getenv("ENVIAR_A_PADRE", "1") == "1"

# ────────────────────────────────────────────────────────────
# CONFIGURACIÓN NODOS SIMULADOS
# ────────────────────────────────────────────────────────────
INTERVALO_SEGUNDOS = int(os.getenv("INTERVALO_SEGUNDOS", "60"))
PROB_LLUVIA        = 0.05   # probabilidad de lluvia en cada ciclo

# "hectarea" ya no viaja a la web, pero el firmware del padre la sigue
# validando (struct_message), así que se mantiene en el paquete.
NODOS = [
    {"id": 1, "hectarea": "Norte",  "humedad_base": 70.0, "pluviometro": True},
    {"id": 2, "hectarea": "Sur",    "humedad_base": 68.0},
    {"id": 3, "hectarea": "Centro", "humedad_base": 72.0},
    {"id": 4, "hectarea": "Este",   "humedad_base": 65.0},
]


# ────────────────────────────────────────────────────────────
# CLIMA COMPARTIDO (lluvia común a toda la parcela)
# ────────────────────────────────────────────────────────────
class Clima:
    def __init__(self):
        self.lock = threading.Lock()
        self.evento = 0          # sube 1 en cada ciclo del pluviómetro
        self.lluvia_mm = 0.0     # lluvia de ese ciclo

    def nuevo_ciclo(self):
        """Lo llama el Nodo 1 (pluviómetro): decide si llovió en este ciclo."""
        with self.lock:
            self.evento += 1
            if random.random() < PROB_LLUVIA:
                self.lluvia_mm = round(random.uniform(0.5, 6.0), 1)
            else:
                self.lluvia_mm = 0.0
            return self.lluvia_mm

    def leer(self):
        with self.lock:
            return self.evento, self.lluvia_mm


clima = Clima()


# ────────────────────────────────────────────────────────────
# ESTADO DE CADA NODO
# ────────────────────────────────────────────────────────────
class EstadoNodo:
    def __init__(self, config):
        self.id            = config["id"]
        self.hectarea      = config["hectarea"]
        self.pluviometro   = config.get("pluviometro", False)
        self.humedad_suelo = config["humedad_base"]
        self.bateria       = random.uniform(80, 95)
        self.msg_count     = 0
        self.dia_ciclo     = random.randint(0, 139)
        self.ultimo_evento = 0

    def leer_temperatura_suelo(self):
        base = 14.0 + 4.0 * math.sin((self.dia_ciclo / 140) * math.pi)
        return round(base + random.uniform(-0.5, 0.5), 1)

    def leer_lluvia(self):
        """Nodo 1 mide la lluvia; los demás se enteran del mismo evento."""
        if self.pluviometro:
            lluvia = clima.nuevo_ciclo()
            self.ultimo_evento = clima.leer()[0]
            return lluvia

        evento, lluvia = clima.leer()
        if evento != self.ultimo_evento:
            self.ultimo_evento = evento
            return lluvia
        return 0.0

    def actualizar_humedad_suelo(self, lluvia_mm):
        evap = 0.02 + random.uniform(0, 0.03)
        if lluvia_mm > 0:
            self.humedad_suelo = min(95, self.humedad_suelo + lluvia_mm * 0.8)
        self.humedad_suelo = max(15, self.humedad_suelo - evap)
        return round(self.humedad_suelo, 1)

    def leer_bateria(self):
        self.bateria = max(60, self.bateria - random.uniform(0, 0.1) + random.uniform(0, 0.05))
        return int(round(self.bateria, 0))

    def generar_lectura(self):
        self.msg_count += 1
        self.dia_ciclo = (self.dia_ciclo + 1) % 140

        lluvia = self.leer_lluvia()
        return {
            "nodo_id":       self.id,
            "hectarea":      self.hectarea,
            "temp_suelo":    self.leer_temperatura_suelo(),
            "humedad_suelo": self.actualizar_humedad_suelo(lluvia),
            "bateria_pct":   self.leer_bateria(),
            # El firmware del padre solo usa lluvia_mm cuando nodo_id == 1
            "lluvia_mm":     lluvia if self.pluviometro else 0.0,
        }


# ────────────────────────────────────────────────────────────
# ESP32 PADRE — mandar datos por HTTP
# ────────────────────────────────────────────────────────────
def mandar_al_padre(lectura):
    if not ENVIAR_A_PADRE:
        return True

    try:
        resp = requests.post(PADRE_ENDPOINT, json=lectura, timeout=3)
        return resp.status_code == 200

    except requests.exceptions.ConnectionError:
        print("  [Padre] No disponible")
        return False
    except Exception as e:
        print(f"  [Padre ERROR] {e}")
        return False


# ────────────────────────────────────────────────────────────
# LOOP DE CADA NODO — corre en hilo separado
# ────────────────────────────────────────────────────────────
def loop_nodo(nodo_estado):
    extra = " + pluviómetro" if nodo_estado.pluviometro else ""
    print(f"[Nodo {nodo_estado.id}] Iniciando simulación ({nodo_estado.hectarea}{extra})")

    while True:
        lectura = nodo_estado.generar_lectura()

        print(f"\n[Nodo {lectura['nodo_id']} ({lectura['hectarea']})] #{nodo_estado.msg_count}")
        print(f"  Temp suelo:  {lectura['temp_suelo']} C")
        print(f"  Hum suelo:   {lectura['humedad_suelo']}%")
        print(f"  Bateria:     {lectura['bateria_pct']}%")
        if nodo_estado.pluviometro:
            print(f"  Lluvia:      {lectura['lluvia_mm']} mm")

        ok_padre = mandar_al_padre(lectura)
        print(f"  Padre: {'✓' if ok_padre else '✗ (offline)'}")

        time.sleep(INTERVALO_SEGUNDOS)


# ────────────────────────────────────────────────────────────
# MAIN
# ────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("SIMULADOR DE NODOS — Sistema de Riego Sonora")
    print("=" * 60)
    print(f"Padre ESP32: {PADRE_ENDPOINT}")
    print(f"Intervalo:   {INTERVALO_SEGUNDOS}s por nodo")
    print(f"Nodos:       {[n['id'] for n in NODOS]}")
    print("=" * 60)

    # Nodo 1 arranca primero (es el que decide la lluvia de cada ciclo)
    for config in NODOS:
        estado = EstadoNodo(config)
        hilo = threading.Thread(
            target=loop_nodo,
            args=(estado,),
            daemon=True,
            name=f"Nodo-{config['id']}",
        )
        hilo.start()
        time.sleep(2)

    try:
        print("\n[Sistema corriendo] Ctrl+C para detener\n")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\nSimulador detenido.")


if __name__ == "__main__":
    main()
