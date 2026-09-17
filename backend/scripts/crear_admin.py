"""Crea el primer usuario Admin de prueba. Correr una sola vez.

Uso (con Docker):
    docker compose exec backend python scripts/crear_admin.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models import Usuario

app = create_app()

with app.app_context():
    existente = Usuario.query.filter_by(correo="admin@agroia.com").first()
    if existente:
        print("El usuario admin@agroia.com ya existe, no se creó de nuevo.")
    else:
        u = Usuario(nombre="Admin", correo="admin@agroia.com", rol="admin")
        u.set_password("admin123")
        db.session.add(u)
        db.session.commit()
        print("Usuario Admin creado: admin@agroia.com / admin123")
