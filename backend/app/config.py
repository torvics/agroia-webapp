import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "cambia-esto")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cambia-esto-tambien")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://agroia:agroia@mysql:3306/agroia_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Las BD en la nube cierran conexiones inactivas. Sin pre_ping, la primera
    # consulta con una conexión caducada del pool falla (500 sin JSON).
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    BACKEND_ORIGIN = os.getenv("BACKEND_ORIGIN", "http://localhost:5000")
    EMAIL_CONFIRMATION_MAX_AGE = 24 * 60 * 60

    INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://influxdb:8086")
    INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "")
    INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "agroia")
    INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "piloto")