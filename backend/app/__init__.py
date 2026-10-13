
from flask import Flask
from flask_cors import CORS

from .extensions import db, jwt, migrate
from .config import Config

# Rutas del backend
from .routes.usuarios_routes import usuarios_bp
from .routes.auth_routes import auth_bp
from .routes.parcelas_routes import parcelas_bp
from .routes.nodos_routes import nodos_bp
from .routes.comandos_routes import comandos_bp

# Rutas de sensores (main + simulador)
from .routes.sensores_routes import (
    sensores_bp,
    estacion_bp,
    nodos_datos_bp,
    lluvia_bp
)

# Rutas de bitacoras, alertas y reportes
from .routes.bitacora_routes import bitacora_bp
from .routes.alertas_routes import alertas_bp
from .routes.reportes_routes import reportes_bp

# Registrar modelos para Alembic
from . import models  # noqa: F401


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configuracion CORS
    CORS(
        app,
        origins=[app.config["FRONTEND_ORIGIN"]],
        supports_credentials=True
    )

    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # ======================================
    # AUTENTICACION Y USUARIOS
    # ======================================
    app.register_blueprint(usuarios_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    # ======================================
    # PARCELAS Y NODOS
    # ======================================
    app.register_blueprint(parcelas_bp, url_prefix="/api/parcelas")
    app.register_blueprint(nodos_bp, url_prefix="/api/nodos")
    app.register_blueprint(comandos_bp, url_prefix="/api")

    # ======================================
    # SENSORES - MAIN + SIMULADOR
    # ======================================
    app.register_blueprint(sensores_bp, url_prefix="/api/sensores")
    app.register_blueprint(estacion_bp, url_prefix="/api/estacion")
    app.register_blueprint(nodos_datos_bp, url_prefix="/api/nodos")
    app.register_blueprint(lluvia_bp, url_prefix="/api")

    # ======================================
    # BITACORAS, ALERTAS Y REPORTES
    # ======================================
    app.register_blueprint(bitacora_bp, url_prefix="/api/bitacora")
    app.register_blueprint(alertas_bp, url_prefix="/api/alertas")
    app.register_blueprint(reportes_bp, url_prefix="/api/reportes")

    # El esquema de la base de datos se controla
    # mediante las migraciones de Alembic.

    # ======================================
    # HEALTH CHECK
    # ======================================
    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app
