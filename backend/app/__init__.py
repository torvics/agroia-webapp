
from flask import Flask
from flask_cors import CORS

from .extensions import db, jwt, migrate
from .config import Config

# ======================================
# MODELOS
# ======================================
from . import models  # noqa: F401
from .models import TokenRevocado

# ======================================
# RUTAS DEL BACKEND
# ======================================
from .routes.usuarios_routes import usuarios_bp
from .routes.auth_routes import auth_bp
from .routes.parcelas_routes import parcelas_bp
from .routes.nodos_routes import nodos_bp
from .routes.comandos_routes import comandos_bp

# ======================================
# RUTAS DE SENSORES
# ======================================
from .routes.sensores_routes import (
    sensores_bp,
    estacion_bp,
    nodos_datos_bp,
    lluvia_bp
)

# ======================================
# BITACORAS, ALERTAS Y REPORTES
# ======================================
from .routes.bitacora_routes import bitacora_bp
from .routes.alertas_routes import alertas_bp
from .routes.reportes_routes import reportes_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ======================================
    # CONFIGURACION CORS
    # ======================================
    CORS(
        app,
        origins=[app.config["FRONTEND_ORIGIN"]],
        supports_credentials=True
    )

    # ======================================
    # INICIALIZAR EXTENSIONES
    # ======================================
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # ======================================
    # VERIFICACION DE TOKENS REVOCADOS
    # API-AUTENTICACION
    # ======================================
    @jwt.token_in_blocklist_loader
    def verificar_token_revocado(jwt_header, jwt_payload):

        jti = jwt_payload["jti"]

        token = (
            db.session.query(TokenRevocado.id)
            .filter_by(jti=jti)
            .first()
        )

        # True significa que el JWT fue revocado.
        return token is not None

    # ======================================
    # AUTENTICACION Y USUARIOS
    # ======================================
    app.register_blueprint(
        usuarios_bp,
        url_prefix="/api"
    )

    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )

    # ======================================
    # PARCELAS Y NODOS
    # ======================================
    app.register_blueprint(
        parcelas_bp,
        url_prefix="/api/parcelas"
    )

    app.register_blueprint(
        nodos_bp,
        url_prefix="/api/nodos"
    )

    app.register_blueprint(
        comandos_bp,
        url_prefix="/api"
    )

    # ======================================
    # SENSORES - MAIN + SIMULADOR
    # ======================================
    app.register_blueprint(
        sensores_bp,
        url_prefix="/api/sensores"
    )

    app.register_blueprint(
        estacion_bp,
        url_prefix="/api/estacion"
    )

    app.register_blueprint(
        nodos_datos_bp,
        url_prefix="/api/nodos"
    )

    app.register_blueprint(
        lluvia_bp,
        url_prefix="/api"
    )

    # ======================================
    # BITACORAS, ALERTAS Y REPORTES
    # ======================================
    app.register_blueprint(
        bitacora_bp,
        url_prefix="/api/bitacora"
    )

    app.register_blueprint(
        alertas_bp,
        url_prefix="/api/alertas"
    )

    app.register_blueprint(
        reportes_bp,
        url_prefix="/api/reportes"
    )

    # El esquema de la base de datos se administra
    # mediante migraciones de Alembic.

    # ======================================
    # HEALTH CHECK
    # ======================================
    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app
