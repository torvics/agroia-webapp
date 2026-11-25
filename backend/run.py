from app import create_app
from app.config import modo_debug

app = create_app()

if __name__ == "__main__":
    # El depurador de Flask permite ejecutar código desde el navegador: solo se
    # activa si FLASK_DEBUG=1/true/yes/on. Por defecto (producción) queda apagado.
    app.run(host="0.0.0.0", port=5000, debug=modo_debug())
