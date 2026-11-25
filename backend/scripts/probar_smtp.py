"""Diagnóstico SMTP sin mostrar secretos.

Uso (desde backend/):
    python scripts/probar_smtp.py                 # valida config, conexión y login (no envía)
    python scripts/probar_smtp.py --enviar a@b.c  # además envía un correo de prueba a esa dirección
"""
import argparse
import os
import smtplib
import ssl
import sys
from email.message import EmailMessage

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from app.services.correo_service import ErrorSMTP, configuracion_smtp, enviar_mensaje_smtp  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--enviar", metavar="CORREO", help="envía un correo de prueba a esta dirección")
    args = parser.parse_args()

    try:
        config = configuracion_smtp()
    except ErrorSMTP as error:
        print(f"[X] Configuración: {error}")
        return 1
    print(f"[OK] Configuración completa: {config['host']}:{config['puerto']} ({config['seguridad']})")

    try:
        contexto = ssl.create_default_context()
        if config["seguridad"] == "ssl":
            servidor = smtplib.SMTP_SSL(config["host"], config["puerto"], timeout=10, context=contexto)
        else:
            servidor = smtplib.SMTP(config["host"], config["puerto"], timeout=10)
            servidor.ehlo()
            servidor.starttls(context=contexto)
            servidor.ehlo()
        print("[OK] Conexión cifrada establecida")
        with servidor:
            servidor.login(config["usuario"], config["password"])
        print("[OK] Autenticación aceptada")
    except smtplib.SMTPAuthenticationError:
        print("[X] El servidor rechazó usuario/contraseña (en Gmail use una contraseña de aplicación).")
        return 1
    except OSError as error:
        print(f"[X] Sin conexión a {config['host']}:{config['puerto']} ({type(error).__name__}). "
              "Si el backend está en el plan gratuito de Render, los puertos SMTP salientes están bloqueados.")
        return 1

    if args.enviar:
        mensaje = EmailMessage()
        mensaje["To"] = args.enviar
        mensaje["Subject"] = "[AgroIA] Prueba de correo"
        mensaje.set_content("Correo de prueba de la configuración SMTP de AgroIA.")
        enviar_mensaje_smtp(mensaje, config)
        print("[OK] Correo de prueba aceptado por el servidor SMTP")
    return 0


if __name__ == "__main__":
    sys.exit(main())
