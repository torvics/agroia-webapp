
from datetime import date, datetime, time, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    get_jwt
)

from ..extensions import db
from ..models import Bitacora, Nodo, Parcela
from ..utils.fechas import validar_rango_no_futuro


bitacora_bp = Blueprint("bitacora", __name__)


# =========================================================
# FUNCIONES AUXILIARES
# =========================================================

def entero_positivo(nombre, defecto=None):
    valor = request.args.get(nombre)

    if valor is None:
        return defecto

    try:
        numero = int(valor)

        if numero <= 0:
            raise ValueError

        return numero

    except ValueError:
        raise ValueError(
            f"El parámetro {nombre} debe ser un entero positivo"
        )


def convertir_fecha(texto, fin_del_dia=False):
    """
    Acepta:
    - 2026-10-07
    - 2026-10-07T12:30:00Z
    - 2026-10-07T05:30:00-07:00

    La base de datos guarda fechas UTC sin zona horaria.
    """

    # Si únicamente enviamos la fecha, usamos el día
    # completo en UTC.
    if len(texto) == 10:
        dia = date.fromisoformat(texto)

        hora = time.max if fin_del_dia else time.min

        return datetime.combine(dia, hora)

    fecha = datetime.fromisoformat(
        texto.replace("Z", "+00:00")
    )

    if fecha.tzinfo is None:
        raise ValueError("La fecha debe incluir zona horaria")

    return fecha.astimezone(
        timezone.utc
    ).replace(tzinfo=None)


# =========================================================
# 1.5.3 CONSULTA FILTRABLE DE BITÁCORA
# GET /api/bitacora
# =========================================================

@bitacora_bp.route("", methods=["GET"])
@jwt_required()
def listar_bitacora():

    usuario_actual = int(get_jwt_identity())
    rol = get_jwt().get("rol")

    # 1. Obtener y validar filtros
    try:
        parcela_id = entero_positivo("parcela_id")
        nodo_id = entero_positivo("nodo_id")
        usuario_id = entero_positivo("usuario_id")

        pagina = entero_positivo("pagina", 1)
        limite = entero_positivo("limite", 100)

    except ValueError as error:
        return jsonify({
            "error": str(error)
        }), 400

    if limite > 100:
        return jsonify({
            "error": "El límite máximo es de 100 registros"
        }), 400

    accion = request.args.get("accion", "").strip()

    inicio_texto = request.args.get("inicio")
    fin_texto = request.args.get("fin")

    try:
        inicio = (
            convertir_fecha(inicio_texto)
            if inicio_texto else None
        )

        fin = (
            convertir_fecha(fin_texto, fin_del_dia=True)
            if fin_texto else None
        )

    except ValueError:
        return jsonify({
            "error": "Formato de fecha inválido"
        }), 400

    if inicio and fin and inicio > fin:
        return jsonify({
            "error": "La fecha inicio debe ser anterior a fin"
        }), 400

    # Una fecha sola (AAAA-MM-DD) se compara como día; con hora, en la zona
    # de la aplicación.
    error_futuro = validar_rango_no_futuro(
        date.fromisoformat(inicio_texto) if inicio_texto and len(inicio_texto) == 10 else inicio,
        date.fromisoformat(fin_texto) if fin_texto and len(fin_texto) == 10 else fin,
    )
    if error_futuro:
        return jsonify({"error": error_futuro}), 400

    # 2. Verificar permisos sobre la parcela solicitada
    if parcela_id is not None:

        parcela = db.session.get(Parcela, parcela_id)

        if not parcela:
            return jsonify({
                "error": "Parcela no encontrada"
            }), 404

        if rol != "admin" and parcela.usuario_id != usuario_actual:
            return jsonify({
                "error": "No autorizado para consultar esta parcela"
            }), 403

    # 3. Verificar permisos sobre el nodo solicitado
    if nodo_id is not None:

        nodo = db.session.get(Nodo, nodo_id)

        if not nodo:
            return jsonify({
                "error": "Nodo no encontrado"
            }), 404

        if rol != "admin" and nodo.parcela.usuario_id != usuario_actual:
            return jsonify({
                "error": "No autorizado para consultar este nodo"
            }), 403

    # 4. Construir consulta
    consulta = (
        Bitacora.query
        .outerjoin(
            Nodo,
            Bitacora.nodo_id == Nodo.id
        )
    )

    # Un agricultor solamente puede consultar
    # registros asociados a nodos de sus parcelas.
    if rol != "admin":
        consulta = (
            consulta
            .join(
                Parcela,
                Nodo.parcela_id == Parcela.id
            )
            .filter(
                Parcela.usuario_id == usuario_actual
            )
        )

    # 5. Aplicar filtros opcionales
    if parcela_id is not None:
        consulta = consulta.filter(
            Nodo.parcela_id == parcela_id
        )

    if nodo_id is not None:
        consulta = consulta.filter(
            Bitacora.nodo_id == nodo_id
        )

    if usuario_id is not None:
        consulta = consulta.filter(
            Bitacora.usuario_id == usuario_id
        )

    if accion:
        consulta = consulta.filter(
            Bitacora.accion.contains(
                accion,
                autoescape=True
            )
        )

    if inicio is not None:
        consulta = consulta.filter(
            Bitacora.fecha >= inicio
        )

    if fin is not None:
        consulta = consulta.filter(
            Bitacora.fecha <= fin
        )

    # 6. Ordenamiento y paginación
    registros = (
        consulta
        .order_by(
            Bitacora.fecha.desc(),
            Bitacora.id.desc()
        )
        .offset((pagina - 1) * limite)
        .limit(limite)
        .all()
    )

    # 7. Devolver resultados
    return jsonify([
        {
            "id": b.id,
            "usuario_id": b.usuario_id,
            "nodo_id": b.nodo_id,
            "accion": b.accion,
            "fecha": (
                b.fecha.replace(
                    tzinfo=timezone.utc
                ).isoformat().replace("+00:00", "Z")
                if b.fecha else None
            )
        }
        for b in registros
    ]), 200
