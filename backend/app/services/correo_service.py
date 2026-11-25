
import os
import ssl
import smtplib

from datetime import datetime, timezone
from email.message import EmailMessage
from sqlalchemy import update

from ..extensions import db
from ..models import AlertaEnviada


def fecha_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ErrorSMTP(ValueError):
    """Error de configuración o conexión SMTP con mensaje seguro (sin secretos)."""


def configuracion_smtp():
    """Lee y valida SMTP_* del entorno. Nunca incluye valores en los errores."""
    seguridad = os.getenv("SMTP_SECURITY", "starttls").strip().lower() or "starttls"
    if seguridad not in ("ssl", "starttls"):
        raise ErrorSMTP("SMTP_SECURITY debe ser ssl o starttls")

    puerto_texto = os.getenv("SMTP_PORT", "").strip() or ("465" if seguridad == "ssl" else "587")
    if not puerto_texto.isdigit() or not 1 <= int(puerto_texto) <= 65535:
        raise ErrorSMTP("SMTP_PORT debe ser un número de puerto válido")

    usuario = os.getenv("SMTP_USER", "").strip()
    config = {
        "host": os.getenv("SMTP_HOST", "").strip(),
        "puerto": int(puerto_texto),
        "seguridad": seguridad,
        "usuario": usuario,
        "password": os.getenv("SMTP_PASSWORD", "").strip(),
        "remitente": os.getenv("SMTP_FROM", "").strip() or usuario,
    }
    faltantes = [
        nombre for nombre, clave in (
            ("SMTP_HOST", "host"), ("SMTP_USER", "usuario"),
            ("SMTP_PASSWORD", "password"),
        ) if not config[clave]
    ]
    if faltantes:
        raise ErrorSMTP(
            "Configuración SMTP incompleta: faltan las variables de entorno "
            + ", ".join(faltantes)
        )
    return config


def _validar_destinatario(destinatario):
    if (
        not isinstance(destinatario, str)
        or not destinatario.strip()
        or "\n" in destinatario
        or "\r" in destinatario
    ):
        raise ValueError("Destinatario no válido")
    return destinatario.strip()


def enviar_mensaje_smtp(mensaje, config=None):
    """Único punto de envío SMTP de la aplicación."""
    config = config or configuracion_smtp()
    if not mensaje.get("From"):
        mensaje["From"] = config["remitente"]
    contexto = ssl.create_default_context()
    try:
        if config["seguridad"] == "ssl":
            with smtplib.SMTP_SSL(config["host"], config["puerto"], timeout=10, context=contexto) as servidor:
                servidor.login(config["usuario"], config["password"])
                servidor.send_message(mensaje)
        else:
            with smtplib.SMTP(config["host"], config["puerto"], timeout=10) as servidor:
                servidor.ehlo()
                servidor.starttls(context=contexto)
                servidor.ehlo()
                servidor.login(config["usuario"], config["password"])
                servidor.send_message(mensaje)
    except smtplib.SMTPAuthenticationError as error:
        raise ErrorSMTP(
            "El servidor SMTP rechazó el usuario o la contraseña "
            "(en Gmail use una contraseña de aplicación)"
        ) from error
    except smtplib.SMTPException:
        raise
    except OSError as error:
        raise ErrorSMTP(
            f"No se pudo conectar a {config['host']}:{config['puerto']} "
            f"({type(error).__name__}). Algunos proveedores de hosting, como el "
            "plan gratuito de Render, bloquean los puertos SMTP salientes."
        ) from error


def enviar_alerta_smtp(alerta):
    """
    Construye y envía una alerta mediante SMTP.

    No cambia el estado de la base de datos.
    Si ocurre un problema, lanza una excepción.
    """

    # 1. Obtener y validar la configuración SMTP
    config = configuracion_smtp()
    remitente = config["remitente"]

    destinatario = alerta.destinatario

    if (
        not destinatario
        or "\n" in destinatario
        or "\r" in destinatario
    ):
        raise ValueError(
            "La alerta no tiene un destinatario válido"
        )

    # 3. Preparar el contenido del correo
    tipos = {
        "suelo_seco": "Suelo seco",
        "temperatura_baja": "Temperatura baja"
    }

    tipo = tipos.get(
        alerta.tipo_alerta,
        "Condición crítica"
    )

    unidad = (
        "%"
        if alerta.tipo_alerta == "suelo_seco"
        else "°C"
    )

    mensaje = EmailMessage()

    mensaje["From"] = remitente
    mensaje["To"] = destinatario

    mensaje["Subject"] = (
        f"[AgroIA] Alerta: {tipo}"
    )

    mensaje.set_content(
        f"ALERTA AGROIA\n\n"
        f"Se ha detectado una condición crítica.\n\n"
        f"Tipo: {tipo}\n"
        f"Parcela: {alerta.parcela_id}\n"
        f"Nodo: {alerta.nodo_id or 'Estación'}\n\n"
        f"Valor detectado: "
        f"{alerta.valor_detectado} {unidad}\n"
        f"Umbral mínimo: "
        f"{alerta.umbral} {unidad}\n\n"
        f"Detalle:\n"
        f"{alerta.mensaje}\n\n"
        f"Revisa las condiciones de tu parcela "
        f"en AgroIA.\n\n"
        f"Este es un mensaje automático."
    )

    # 4. Enviar mediante una conexión cifrada
    enviar_mensaje_smtp(mensaje, config)


def procesar_envio_alerta(alerta_id):
    """
    Procesa una alerta pendiente por SMTP.

    Reserva la alerta antes del envío para evitar
    que dos workers la procesen simultáneamente.

    Las alertas fallidas no se reintentan
    automáticamente.
    """

    alerta = db.session.get(
        AlertaEnviada,
        alerta_id
    )

    if alerta is None:
        return "no_encontrada"

    if alerta.estado == "enviada":
        return "ya_enviada"

    if alerta.estado == "procesando":
        return "ya_procesando"

    if alerta.estado == "fallida":
        return "requiere_revision"

    if alerta.estado != "pendiente":
        return "no_procesable"

    if alerta.canal != "correo":
        return "canal_no_soportado"

    if (
        not alerta.destinatario
        or not alerta.destinatario.strip()
    ):
        return "sin_destinatario"

    # Reservar la alerta mediante una actualización
    # condicional. Solo un worker podrá conseguirlo.
    resultado = db.session.execute(
        update(AlertaEnviada)
        .where(
            AlertaEnviada.id == alerta_id,
            AlertaEnviada.estado == "pendiente",
            AlertaEnviada.canal == "correo"
        )
        .values(
            estado="procesando",
            error_detalle=None
        )
    )

    filas_actualizadas = resultado.rowcount
    db.session.commit()

    if filas_actualizadas != 1:
        return "no_procesable"

    # Recuperar el registro después del commit.
    alerta = db.session.get(
        AlertaEnviada,
        alerta_id
    )

    try:
        enviar_alerta_smtp(alerta)

    except Exception as error:
        db.session.rollback()

        alerta = db.session.get(
            AlertaEnviada,
            alerta_id
        )

        alerta.estado = "fallida"
        alerta.error_detalle = (
            f"Error SMTP: {type(error).__name__}"
        )

        db.session.commit()

        return "fallida"

    # SMTP aceptó el mensaje.
    alerta.estado = "enviada"
    alerta.fecha_envio = fecha_utc()
    alerta.error_detalle = None

    db.session.commit()

    return "enviada"



def enviar_correo_recuperacion(destinatario, enlace):
    """Envía un enlace de recuperación con la configuración SMTP existente.

    Este envío no modifica registros de alertas ni los procesa el worker.
    """
    destinatario = _validar_destinatario(destinatario)
    if not isinstance(enlace, str) or not enlace.startswith(("http://", "https://")):
        raise ValueError("Enlace no válido")
    config = configuracion_smtp()

    mensaje = EmailMessage()
    mensaje["From"] = config["remitente"]
    mensaje["To"] = destinatario
    mensaje["Subject"] = "[AgroIA] Restablecer contraseña"
    mensaje.set_content(
        "Se solicitó un cambio de contraseña para tu cuenta de AgroIA.\n\n"
        "Abre este enlace para establecer una contraseña nueva (válido 20 minutos):\n"
        f"{enlace}\n\n"
        "Si no solicitaste este cambio, puedes ignorar este correo.\n"
        "El enlace dejará de funcionar cuando se cambie la contraseña.\n"
        "Nunca compartas este enlace con otras personas."
    )

    enviar_mensaje_smtp(mensaje, config)


def enviar_correo_confirmacion(destinatario, enlace):
    destinatario = _validar_destinatario(destinatario)
    if not isinstance(enlace, str) or not enlace.startswith(("http://", "https://")):
        raise ValueError("Enlace no válido")
    config = configuracion_smtp()

    mensaje = EmailMessage()
    mensaje["From"] = config["remitente"]
    mensaje["To"] = destinatario
    mensaje["Subject"] = "[AgroIA] Confirma tu correo electrónico"
    mensaje.set_content(
        "Hola,\n\n"
        "Confirma tu correo electrónico para activar tu cuenta de AgroIA "
        "y poder iniciar sesión:\n\n"
        f"{enlace}\n\n"
        "Este enlace caduca en 24 horas. Si no reconoces esta cuenta, "
        "puedes ignorar este mensaje."
    )

    enviar_mensaje_smtp(mensaje, config)
