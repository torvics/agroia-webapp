
import argparse
import time

from sqlalchemy import func

from .. import create_app
from ..extensions import db
from ..models import AlertaEnviada
from .correo_service import procesar_envio_alerta


app = create_app()


def procesar_pendientes(limite=20):
    """
    Busca alertas pendientes con destinatario
    y procesa cada una por SMTP.
    """

    with app.app_context():

        registros = (
            db.session.query(AlertaEnviada.id)
            .filter(
                AlertaEnviada.estado == "pendiente",
                AlertaEnviada.canal == "correo",
                AlertaEnviada.destinatario.isnot(None),
                func.trim(
                    AlertaEnviada.destinatario
                ) != ""
            )
            .order_by(
                AlertaEnviada.fecha_deteccion.asc(),
                AlertaEnviada.id.asc()
            )
            .limit(limite)
            .all()
        )

        ids = [registro[0] for registro in registros]

        # Cerramos la consulta antes de enviar correos.
        db.session.remove()

        for alerta_id in ids:

            try:
                resultado = procesar_envio_alerta(
                    alerta_id
                )

                print(
                    f"Alerta {alerta_id}: {resultado}",
                    flush=True
                )

            except Exception:
                db.session.rollback()

                app.logger.exception(
                    "Error al procesar alerta %s",
                    alerta_id
                )

            finally:
                db.session.remove()

        return len(ids)


def main():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--once",
        action="store_true",
        help="Procesar un lote y finalizar"
    )

    argumentos = parser.parse_args()

    print(
        "Worker de alertas AgroIA iniciado",
        flush=True
    )

    if argumentos.once:

        cantidad = procesar_pendientes()

        print(
            f"Alertas encontradas: {cantidad}",
            flush=True
        )

        return

    # Funcionamiento continuo.
    while True:

        try:
            procesar_pendientes()

        except Exception:
            app.logger.exception(
                "Error general del worker"
            )

        time.sleep(15)


if __name__ == "__main__":
    main()
