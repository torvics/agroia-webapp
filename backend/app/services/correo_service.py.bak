
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


def enviar_alerta_smtp(alerta):
    """
    Construye y envía una alerta mediante SMTP.

    No cambia el estado de la base de datos.
    Si ocurre un problema, lanza una excepción.
    """

    # 1. Obtener la configuración SMTP
    host = os.getenv("SMTP_HOST", "").strip()

    seguridad = os.getenv(
        "SMTP_SECURITY", "starttls"
    ).lower().strip()

    puerto_predeterminado = (
        "465" if seguridad == "ssl" else "587"
    )

    puerto = int(os.getenv(
        "SMTP_PORT", puerto_predeterminado
    ))

    usuario = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")

    remitente = os.getenv(
        "SMTP_FROM", usuario
    ).strip()

    # 2. Validar la configuración
    if seguridad not in ("ssl", "starttls"):
        raise ValueError(
            "SMTP_SECURITY debe ser ssl o starttls"
        )

    if not host or not usuario or not password or not remitente:
        raise ValueError(
            "Configuración SMTP incompleta"
        )

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

    # 4. Establecer una conexión cifrada
    contexto = ssl.create_default_context()

    if seguridad == "ssl":

        with smtplib.SMTP_SSL(
            host,
            puerto,
            timeout=10,
            context=contexto
        ) as servidor:

            servidor.login(usuario, password)
            servidor.send_message(mensaje)

    else:

        with smtplib.SMTP(
            host,
            puerto,
            timeout=10
        ) as servidor:

            servidor.ehlo()

            servidor.starttls(
                context=contexto
            )

            servidor.ehlo()

            servidor.login(usuario, password)
            servidor.send_message(mensaje)



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
