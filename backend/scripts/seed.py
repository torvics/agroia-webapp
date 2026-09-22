"""Siembra los datos iniciales del piloto AgroIA:
- 1 usuario Admin
- 1 usuario Agricultor (el cliente final, dueño de las 4 parcelas del piloto)
- 4 parcelas (Centro, Este, Norte, Sur) — mismos nombres que los tags `hectarea`
  usados en InfluxDB, para que backend e InfluxDB hablen el mismo idioma.
- 1 nodo por parcela, con su api_key generada (imprimida al final para copiar
  al firmware o al simulador).
 
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
 
HECTAREAS = ["Centro", "Este", "Norte", "Sur"]
 
 
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
 
 
def obtener_o_crear_nodo(parcela_id, identificador):
    n = Nodo.query.filter_by(identificador=identificador).first()
    if n:
        print(f"  Nodo ya existe: {identificador} (api_key ya asignada antes)")
        return n
    n = Nodo(parcela_id=parcela_id, identificador=identificador)
    db.session.add(n)
    db.session.commit()
    print(f"  Nodo creado: {identificador}  ->  api_key: {n.api_key}")
    return n
 
 
with app.app_context():
    print("Sembrando usuarios...")
    admin = obtener_o_crear_usuario("Admin", "admin@agroia.com", "admin123", "admin")
    agricultor = obtener_o_crear_usuario(
        "Agricultor Piloto", "agricultor@agroia.com", "agricultor123", "agricultor"
    )
 
    print("\nSembrando parcelas (dueño: Agricultor Piloto)...")
    for hectarea in HECTAREAS:
        parcela = obtener_o_crear_parcela(hectarea, agricultor.id)
        obtener_o_crear_nodo(parcela.id, f"nodo_{hectarea.lower()}")
 
    print("\nListo. Copia las api_key de arriba si vas a correr el simulador contra estos nodos.")