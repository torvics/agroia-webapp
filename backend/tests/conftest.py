"""Configuración compartida de PyTest para las pruebas unitarias de AgroIA.

Cada prueba recibe una aplicación Flask nueva con SQLite en memoria, por lo
que no necesita MySQL, InfluxDB, SMTP ni dispositivos reales, y ninguna
prueba depende del resultado de otra.
"""

import smtplib
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import Nodo, Parcela, Usuario
from app.routes import auth_routes
from app.utils.password_reset import version_credencial

from datos import ADMIN, AGRICULTOR, PASSWORD, USUARIOS_BASE, correo_de


@pytest.fixture(scope="session")
def password_hash():
    """El hash se calcula una sola vez porque es una operación costosa."""
    return generate_password_hash(PASSWORD)


@pytest.fixture(autouse=True)
def correos(monkeypatch):
    """Sustituye el envío de correos por dobles de prueba (mocks).

    Además bloquea smtplib para garantizar que ninguna prueba pueda abrir
    una conexión SMTP real aunque exista un archivo .env configurado.
    """

    def _smtp_bloqueado(*args, **kwargs):
        raise AssertionError("Las pruebas no deben abrir conexiones SMTP reales")

    monkeypatch.setattr(smtplib, "SMTP", _smtp_bloqueado)
    monkeypatch.setattr(smtplib, "SMTP_SSL", _smtp_bloqueado)

    confirmacion = MagicMock(name="enviar_correo_confirmacion")
    recuperacion = MagicMock(name="enviar_correo_recuperacion")
    monkeypatch.setattr(
        "app.routes.usuarios_routes.enviar_correo_confirmacion", confirmacion
    )
    monkeypatch.setattr(
        "app.routes.auth_routes.enviar_correo_recuperacion", recuperacion
    )
    return SimpleNamespace(confirmacion=confirmacion, recuperacion=recuperacion)


@pytest.fixture(autouse=True)
def limitador_recuperacion_limpio():
    """El limitador de solicitudes vive en memoria: se vacía en cada prueba."""
    auth_routes._intentos_recuperacion.clear()
    yield
    auth_routes._intentos_recuperacion.clear()


@pytest.fixture
def app(password_hash):
    with patch.multiple(
        Config,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        SECRET_KEY="clave-aislada-de-pruebas-sin-uso-real",
        JWT_SECRET_KEY="jwt-aislado-de-pruebas-sin-uso-real",
        FRONTEND_ORIGIN="http://localhost:5173",
        BACKEND_ORIGIN="http://localhost:5000",
        INFLUXDB_URL="http://127.0.0.1:9",
        INFLUXDB_TOKEN="",
    ):
        aplicacion = create_app()
    aplicacion.config.update(TESTING=True)

    with aplicacion.app_context():
        db.create_all()
        for usuario_id, nombre, rol in USUARIOS_BASE:
            db.session.add(Usuario(
                id=usuario_id,
                nombre=nombre,
                correo=correo_de(usuario_id),
                password_hash=password_hash,
                rol=rol,
                activo=True,
                correo_confirmado=True,
            ))
        db.session.commit()

    yield aplicacion

    with aplicacion.app_context():
        db.session.remove()
        db.drop_all()
        db.engine.dispose()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth(app):
    """Devuelve la cabecera Authorization de un usuario base.

    El token lleva los mismos claims que emite POST /api/auth/login.
    """

    def _auth(usuario_id=ADMIN):
        with app.app_context():
            usuario = db.session.get(Usuario, usuario_id)
            token = create_access_token(
                identity=str(usuario.id),
                additional_claims={
                    "rol": usuario.rol,
                    "nombre": usuario.nombre,
                    "credencial_ver": version_credencial(usuario),
                },
            )
        return {"Authorization": f"Bearer {token}"}

    return _auth


@pytest.fixture
def login(client):
    """Inicia sesión por la API real y devuelve la respuesta."""

    def _login(correo, password=PASSWORD):
        return client.post(
            "/api/auth/login", json={"correo": correo, "password": password}
        )

    return _login


@pytest.fixture
def crear_usuario(app, password_hash):
    """Inserta un usuario adicional directamente en la base de datos."""

    def _crear(correo, rol="agricultor", activo=True, correo_confirmado=True,
               nombre="Usuario Extra"):
        with app.app_context():
            usuario = Usuario(
                nombre=nombre, correo=correo, password_hash=password_hash,
                rol=rol, activo=activo, correo_confirmado=correo_confirmado,
            )
            db.session.add(usuario)
            db.session.commit()
            return usuario.id

    return _crear


@pytest.fixture
def crear_parcela(app):
    def _crear(usuario_id=AGRICULTOR, nombre="Parcela Norte",
               ubicacion="Querétaro"):
        with app.app_context():
            parcela = Parcela(
                nombre=nombre, ubicacion=ubicacion, usuario_id=usuario_id
            )
            db.session.add(parcela)
            db.session.commit()
            return parcela.id

    return _crear


@pytest.fixture
def crear_nodo(app):
    """Crea un nodo y devuelve un objeto con su id y su api_key."""

    def _crear(parcela_id, identificador, tipo="sensor_suelo",
               estado="activo"):
        with app.app_context():
            nodo = Nodo(
                parcela_id=parcela_id, identificador=identificador,
                tipo=tipo, estado=estado,
            )
            db.session.add(nodo)
            db.session.commit()
            return SimpleNamespace(id=nodo.id, api_key=nodo.api_key)

    return _crear
