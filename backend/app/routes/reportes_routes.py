
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import (jwt_required, get_jwt_identity, get_jwt)
from io import BytesIO
from flask import send_file

from ..services.reportes_export_service import ( generar_csv, generar_pdf)


from ..extensions import db
from ..models import Parcela
from ..services.reportes_service import (
    generar_reporte_parcela, reporte_tiene_datos
)
from ..utils.fechas import validar_rango_no_futuro


reportes_bp = Blueprint("reportes", __name__)


def convertir_fecha(texto):
    """
    Convierte una fecha ISO 8601 a UTC.
    Es obligatorio incluir zona horaria.
    """

    if not texto:
        raise ValueError("La fecha es obligatoria")

    fecha = datetime.fromisoformat(
        texto.replace("Z", "+00:00")
    )

    if fecha.tzinfo is None or fecha.utcoffset() is None:
        raise ValueError(
            "La fecha debe incluir zona horaria"
        )

    return fecha.astimezone(timezone.utc)


@reportes_bp.route("/<int:parcela_id>", methods=["GET"])
@jwt_required()
def obtener_reporte(parcela_id):
    """
    GET /api/reportes/<parcela_id>

    Parámetros:
    - inicio: fecha ISO 8601 con zona horaria
    - fin: fecha ISO 8601 con zona horaria

    La fecha fin es exclusiva.
    """

    # 1. Validar identificador
    if parcela_id <= 0:
        return jsonify({
            "error": "El ID de parcela debe ser positivo"
        }), 400

    # 2. Verificar la existencia de la parcela
    parcela = db.session.get(
        Parcela,
        parcela_id
    )

    if parcela is None:
        return jsonify({
            "error": "Parcela no encontrada"
        }), 404

    # 3. Verificar permisos del usuario
    usuario_actual = int(get_jwt_identity())
    rol = get_jwt().get("rol")

    if (
        rol != "admin"
        and parcela.usuario_id != usuario_actual
    ):
        return jsonify({
            "error": "No autorizado para consultar esta parcela"
        }), 403

    # 4. Obtener las fechas del reporte
    inicio_texto = request.args.get("inicio")
    fin_texto = request.args.get("fin")

    if not inicio_texto or not fin_texto:
        return jsonify({
            "error": "Los parámetros inicio y fin son obligatorios"
        }), 400

    try:
        inicio = convertir_fecha(inicio_texto)
        fin = convertir_fecha(fin_texto)

    except (ValueError, TypeError):
        return jsonify({
            "error": (
                "Formato de fecha inválido. "
                "Usa ISO 8601 con zona horaria"
            )
        }), 400

    # 5. Validar rango de fechas
    if inicio >= fin:
        return jsonify({
            "error": (
                "La fecha inicio debe ser anterior "
                "a la fecha fin"
            )
        }), 400

    if fin - inicio > timedelta(days=366):
        return jsonify({
            "error": (
                "El rango máximo del reporte "
                "es de 366 días"
            )
        }), 400

    error_futuro = validar_rango_no_futuro(inicio, fin, fin_exclusivo=True)
    if error_futuro:
        return jsonify({"error": error_futuro}), 400


    # Validar el formato solicitado
    formato = request.args.get(
        "formato", "json"
    ).strip().lower()

    if formato not in ("json", "csv", "pdf"):
        return jsonify({
            "error": "Formato no válido",
            "formatos_permitidos": [
                "json", "csv", "pdf"
            ]
        }), 400


        # 6. Generar el reporte y, si corresponde, exportarlo
    try:
        reporte = generar_reporte_parcela(
            parcela_id=parcela_id,
            inicio=inicio,
            fin=fin
        )

        tiene_datos = reporte_tiene_datos(reporte)
        reporte["tiene_datos"] = tiene_datos

        if formato != "json" and not tiene_datos:
            contenido = None

        elif formato == "csv":
            contenido = generar_csv(reporte)
            tipo_archivo = "text/csv"

        elif formato == "pdf":
            contenido = generar_pdf(reporte)
            tipo_archivo = "application/pdf"

    except Exception:
        current_app.logger.exception(
            "Error generando reporte de parcela %s",
            parcela_id
        )

        return jsonify({
            "error": "No fue posible generar el reporte"
        }), 503

    # 7. Respuesta JSON habitual
    if formato == "json":
        return jsonify(reporte), 200

    # 8. Sin datos no se genera un archivo en blanco
    if not tiene_datos:
        return jsonify({
            "error": (
                "No hay información disponible para la parcela "
                "y el periodo seleccionados. No se generó el archivo."
            ),
            "sin_datos": True,
        }), 404

    # 9. Descargar el archivo solicitado
    nombre = (
        f"reporte_parcela_{parcela_id}_"
        f"{inicio:%Y%m%d}_{fin:%Y%m%d}.{formato}"
    )

    return send_file(
        BytesIO(contenido),
        mimetype=tipo_archivo,
        as_attachment=True,
        download_name=nombre
    )
