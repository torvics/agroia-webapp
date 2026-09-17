"""Lista los usuarios registrados, para verificar que todo se guardó bien.

Uso (con Docker):
    docker compose exec backend python scripts/listar_usuarios.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import Usuario

app = create_app()

with app.app_context():
    usuarios = Usuario.query.all()
    if not usuarios:
        print("No hay usuarios registrados todavía.")
    for u in usuarios:
        print(f"id={u.id}  correo={u.correo}  rol={u.rol}  activo={u.activo}")
