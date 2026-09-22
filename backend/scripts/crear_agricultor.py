"""Crea un usuario de prueba con rol Agricultor, para probar RBAC (control de acceso por rol).

Uso (con Docker):
    docker compose exec backend python scripts/crear_agricultor.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models import Usuario

app = create_app()

CORREO = "agricultor@agroia.com"
PASSWORD = "agricultor123"

with app.app_context():
    existente = Usuario.query.filter_by(correo=CORREO).first()
    if existente:
        print(f"El usuario {CORREO} ya existe, no se creó de nuevo.")
    else:
        u = Usuario(nombre="Agricultor Prueba", correo=CORREO, rol="agricultor")
        u.set_password(PASSWORD)
        db.session.add(u)
        db.session.commit()
        print(f"Usuario Agricultor creado: {CORREO} / {PASSWORD}")
