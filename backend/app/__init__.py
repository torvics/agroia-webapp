from flask import Flask
from flask_cors import CORS

from .extensions import db, jwt
from .config import Config

from .routes.auth_routes import auth_bp
from .routes.parcelas_routes import parcelas_bp
from .routes.nodos_routes import nodos_bp
from .routes.comandos_routes import comandos_bp
from .routes.sensores_routes import sensores_bp
from .routes.bitacora_routes import bitacora_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=[app.config["FRONTEND_ORIGIN"]], supports_credentials=True)

    db.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(parcelas_bp, url_prefix="/api/parcelas")
    app.register_blueprint(nodos_bp, url_prefix="/api/nodos")
    app.register_blueprint(comandos_bp, url_prefix="/api")
    app.register_blueprint(sensores_bp, url_prefix="/api/sensores")
    app.register_blueprint(bitacora_bp, url_prefix="/api/bitacora")

    with app.app_context():
        from . import models  # noqa: F401  (registra los modelos antes de create_all)
        db.create_all()

    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app
