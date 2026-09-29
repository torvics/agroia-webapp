"""Siembra los datos iniciales del piloto AgroIA:
- 1 usuario Admin
- 1 usuario Agricultor (el cliente final, dueño de la parcela del piloto)
- 1 parcela (5 hectáreas contiguas, como en la simulación original de Taiwan)
- 1 nodo "Estación" (tipo=estacion) — el único con WiFi/internet, el único
  con api_key real que autentica contra el backend.
- 4 nodos de suelo (tipo=sensor_suelo, identificadores "1"-"4") — solo hablan
  LoRa con la Estación, nunca llaman al backend por sí mismos. Existen en
  MySQL para ownership, bitácora y comandos, con api_key generada pero
  sin uso real (requiere_api_key solo acepta tipo=estacion).

Uso (con Docker):
    docker compose exec backend python scripts/seed.py

Es seguro correrlo varias veces: si algo ya existe, no lo duplica.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models import Usuario, Parcela, Nodo

app = create_app()

NODOS_SUELO = ["1", "2", "3", "4"]


def obtener_o_crear_usuario(nombre, correo, password, rol):
    u = Usuario.query.filter_by(correo=correo).first()
    if u:
        print(f"  Usuario ya existe: {correo}")
        return u
    u = Usuario(nombre=nombre, correo=correo, rol=rol)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    print(f"  Usuario creado: {correo} / {password} (rol={rol})")
    return u


def obtener_o_crear_parcela(nombre, usuario_id):
    p = Parcela.query.filter_by(nombre=nombre, usuario_id=usuario_id).first()
    if p:
        print(f"  Parcela ya existe: {nombre}")
        return p
    p = Parcela(nombre=nombre, ubicacion="Valle del Yaqui, Sonora", usuario_id=usuario_id)
    db.session.add(p)
    db.session.commit()
    print(f"  Parcela creada: {nombre}")
    return p


def obtener_o_crear_nodo(parcela_id, identificador, tipo):
    n = Nodo.query.filter_by(identificador=identificador).first()
    if n:
        print(f"  Nodo '{identificador}' ({tipo}) ya existe")
        return n
    n = Nodo(parcela_id=parcela_id, identificador=identificador, tipo=tipo)
    db.session.add(n)
    db.session.commit()
    etiqueta = "  <-- USAR ESTA api_key EN EL FIRMWARE DEL PADRE" if tipo == "estacion" else ""
    print(f"  Nodo '{identificador}' ({tipo}) creado  ->  api_key: {n.api_key}{etiqueta}")
    return n


with app.app_context():
    print("Sembrando usuarios...")
    admin = obtener_o_crear_usuario("Admin", "admin@agroia.com", "admin123", "admin")
    agricultor = obtener_o_crear_usuario(
        "Agricultor Piloto", "agricultor@agroia.com", "agricultor123", "agricultor"
    )

    print("\nSembrando parcela (dueño: Agricultor Piloto)...")
    parcela = obtener_o_crear_parcela("Parcela 1", agricultor.id)

    print("\nSembrando nodo Estación (padre, único con internet)...")
    obtener_o_crear_nodo(parcela.id, "estacion", "estacion")

    print("\nSembrando nodos de suelo (hijos, solo LoRa)...")
    for identificador in NODOS_SUELO:
        obtener_o_crear_nodo(parcela.id, identificador, "sensor_suelo")

    print("\nListo. Bucket de InfluxDB a usar: piloto")
    print("Solo la api_key de 'estacion' se usa para autenticar contra el backend.")