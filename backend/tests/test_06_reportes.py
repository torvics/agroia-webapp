"""Módulo 6 · Reportes.

Código probado: app/routes/reportes_routes.py, app/services/reportes_service.py
y app/services/reportes_export_service.py (exportación a CSV y PDF).
InfluxDB se sustituye por un doble de prueba; los eventos se leen de SQLite.
Ejecutar solo este módulo:  python -m pytest tests/test_06_reportes.py -v
"""

import datetime
from datetime import timezone
from unittest.mock import patch

import pytest

from app.extensions import db
from app.models import AlertaEnviada, Bitacora, Comando
from app.routes.reportes_routes import convertir_fecha
from app.services.reportes_export_service import celda_csv
from app.services.reportes_service import (
    CAMPOS_SENSORES,
    generar_reporte_parcela,
    obtener_eventos_mysql,
)

from datos import ADMIN, AGRICULTOR, OTRO_AGRICULTOR

INICIO = datetime.datetime(2026, 3, 1, tzinfo=timezone.utc)
FIN = datetime.datetime(2026, 4, 1, tzinfo=timezone.utc)
PERIODO = {"inicio": "2026-03-01T00:00:00Z", "fin": "2026-04-01T00:00:00Z"}

SENSORES_SIMULADOS = {
    "estadisticas": {
        campo: {"promedio": 41.5, "minimo": 20.0, "maximo": 63.0, "lecturas": 96}
        for campo in CAMPOS_SENSORES
    },
    "precipitacion": {
        "lluvia_acum_ultima_lectura_mm": 12.4,
        "total_periodo_mm": None,
        "observacion": "Dato simulado para pruebas",
    },
}


@pytest.fixture
def influx():
    """Sustituye la consulta a InfluxDB por datos fijos."""
    with patch(
        "app.services.reportes_service.obtener_estadisticas_sensores",
        return_value=SENSORES_SIMULADOS,
    ) as doble:
        yield doble


@pytest.fixture
def parcela(crear_parcela):
    return crear_parcela(AGRICULTOR, "Parcela de Ana", "El Marqués, Qro.")


def _naive(fecha):
    return fecha.replace(tzinfo=None)


def _alerta(parcela_id, fecha, tipo="suelo_seco"):
    return AlertaEnviada(
        parcela_id=parcela_id, tipo_alerta=tipo, valor_detectado=12.0,
        umbral=30.0, mensaje="Alerta de prueba", fecha_deteccion=_naive(fecha),
    )


@pytest.mark.caso_normal
@pytest.mark.parametrize(
    "texto, esperado",
    [
        ("2026-03-01T00:00:00Z", datetime.datetime(2026, 3, 1, 0, 0, tzinfo=timezone.utc)),
        ("2026-03-01T00:00:00+00:00", datetime.datetime(2026, 3, 1, 0, 0, tzinfo=timezone.utc)),
        ("2026-03-01T00:00:00-06:00", datetime.datetime(2026, 3, 1, 6, 0, tzinfo=timezone.utc)),
    ],
    ids=["sufijo_Z", "desfase_cero", "hora_de_mexico"],
)
def test_rep01_convertir_fecha_normaliza_a_utc(texto, esperado):
    """REP-01 | Prueba unitaria de convertir_fecha con fechas válidas.

    Entrada: fechas ISO 8601 con sufijo Z, con +00:00 y con -06:00.
    Esperado: el mismo instante expresado en UTC (medianoche de -06:00 son las 06:00 UTC).
    """
    resultado = convertir_fecha(texto)

    assert resultado == esperado
    assert resultado.utcoffset() == datetime.timedelta(0)


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "texto",
    ["", None, "2026-03-01", "2026-03-01T00:00:00", "ayer", "01/03/2026"],
    ids=["vacia", "nula", "sin_hora_ni_zona", "sin_zona", "texto_libre", "formato_local"],
)
def test_rep02_convertir_fecha_rechaza_fechas_invalidas(texto):
    """REP-02 | Prueba unitaria de convertir_fecha con fechas inválidas.

    Entrada: fecha vacía, nula, sin zona horaria o con un formato que no es ISO 8601.
    Esperado: se lanza ValueError (la zona horaria es obligatoria).
    """
    with pytest.raises(ValueError):
        convertir_fecha(texto)


@pytest.mark.caso_normal
def test_rep03_reporte_json_resume_los_eventos_del_periodo(
    app, client, auth, parcela, crear_nodo, influx
):
    """REP-03 | Reporte JSON de una parcela propia.

    Entrada: periodo de marzo de 2026 con 2 comandos (1 riego confirmado, 1 relé pendiente), 2 eventos de bitácora y 3 alertas.
    Esperado: 200 con los conteos exactos, las estadísticas de sensores y consumo de agua «no_disponible».
    """
    nodo = crear_nodo(parcela, "A1")
    dia = datetime.datetime(2026, 3, 10, 8, 0)
    with app.app_context():
        db.session.add_all([
            Comando(nodo_id=nodo.id, usuario_id=AGRICULTOR, tipo_comando="riego",
                    valor="1", ejecutado=True, fecha_creacion=dia,
                    fecha_ejecucion=dia + datetime.timedelta(minutes=1)),
            Comando(nodo_id=nodo.id, usuario_id=AGRICULTOR, tipo_comando="rele",
                    valor="0", ejecutado=False, fecha_creacion=dia),
            Bitacora(usuario_id=AGRICULTOR, nodo_id=nodo.id,
                     accion="Ordenó riego = 1 en Nodo A1", fecha=dia),
            Bitacora(usuario_id=AGRICULTOR, nodo_id=nodo.id,
                     accion="Ordenó rele = 0 en Nodo A1", fecha=dia),
            _alerta(parcela, INICIO + datetime.timedelta(days=2)),
            _alerta(parcela, INICIO + datetime.timedelta(days=3)),
            _alerta(parcela, INICIO + datetime.timedelta(days=4), "temperatura_baja"),
        ])
        db.session.commit()

    respuesta = client.get(
        f"/api/reportes/{parcela}", headers=auth(AGRICULTOR), query_string=PERIODO
    )

    assert respuesta.status_code == 200
    reporte = respuesta.get_json()
    assert reporte["parcela"] == {
        "id": parcela, "nombre": "Parcela de Ana", "ubicacion": "El Marqués, Qro.",
    }
    assert reporte["periodo"] == {
        "inicio": "2026-03-01T00:00:00Z", "fin_exclusivo": "2026-04-01T00:00:00Z",
    }
    assert reporte["sensores"]["estadisticas"]["humedad_suelo"]["promedio"] == 41.5
    comandos = reporte["eventos"]["comandos"]
    assert comandos["ordenes_creadas"] == 2
    assert comandos["ordenes_riego_creadas"] == 1
    assert comandos["comandos_confirmados"] == 1
    assert comandos["riego_confirmado"] == 1
    assert comandos["rele_confirmado"] == 0
    assert reporte["eventos"]["bitacora"]["total_eventos"] == 2
    assert reporte["eventos"]["alertas"] == {
        "total": 3, "por_tipo": {"suelo_seco": 2, "temperatura_baja": 1},
    }
    assert reporte["consumo_agua"]["estado"] == "no_disponible"
    influx.assert_called_once()


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "parametros",
    [
        {},
        {"inicio": PERIODO["inicio"]},
        {"inicio": "2026-03-01", "fin": "2026-04-01"},
        {"inicio": PERIODO["fin"], "fin": PERIODO["inicio"]},
        {**PERIODO, "formato": "xml"},
    ],
    ids=["sin_fechas", "sin_fecha_fin", "fechas_sin_zona_horaria",
         "inicio_posterior_al_fin", "formato_no_soportado"],
)
def test_rep04_solicitud_de_reporte_invalida_se_rechaza(client, auth, parcela, influx, parametros):
    """REP-04 | Parámetros inválidos al solicitar un reporte.

    Entrada: sin fechas, sin fecha fin, fechas sin zona horaria, inicio posterior al fin y formato «xml».
    Esperado: 400 con mensaje de error y sin llegar a consultar la base de sensores.
    """
    respuesta = client.get(
        f"/api/reportes/{parcela}", headers=auth(AGRICULTOR), query_string=parametros
    )

    assert respuesta.status_code == 400
    assert "error" in respuesta.get_json()
    influx.assert_not_called()


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "inicio, fin, estado_esperado",
    [
        ("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", 400),
        ("2026-01-01T00:00:00Z", "2026-01-01T00:00:01Z", 200),
        ("2026-01-01T00:00:00Z", "2027-01-02T00:00:00Z", 200),
        ("2026-01-01T00:00:00Z", "2027-01-02T00:00:01Z", 400),
    ],
    ids=["rango_de_0_s", "rango_de_1_s", "366_dias_exactos", "366_dias_y_1_s"],
)
def test_rep05_limites_del_rango_de_fechas(client, auth, parcela, influx, inicio, fin, estado_esperado):
    """REP-05 | Frontera del rango del reporte (más de 0 s y hasta 366 días).

    Entrada: rangos de 0 s, 1 s, 366 días exactos y 366 días más 1 s.
    Esperado: 400 para 0 s y para 366 días + 1 s; 200 para 1 s y para 366 días exactos.
    """
    respuesta = client.get(
        f"/api/reportes/{parcela}", headers=auth(AGRICULTOR),
        query_string={"inicio": inicio, "fin": fin},
    )

    assert respuesta.status_code == estado_esperado


@pytest.mark.regla_negocio
@pytest.mark.parametrize(
    "usuario_id, parcela_id, estado_esperado",
    [(OTRO_AGRICULTOR, 1, 403), (AGRICULTOR, 9999, 404), (ADMIN, 1, 200), (None, 1, 401)],
    ids=["agricultor_ajeno", "parcela_inexistente", "administrador", "sin_sesion"],
)
def test_rep06_solo_el_propietario_o_un_admin_consulta_el_reporte(
    client, auth, parcela, influx, usuario_id, parcela_id, estado_esperado
):
    """REP-06 | Control de acceso a los reportes.

    Entrada: otro agricultor, una parcela inexistente, un administrador y una petición sin token.
    Esperado: 403, 404, 200 y 401 respectivamente.
    """
    assert parcela == 1
    cabecera = auth(usuario_id) if usuario_id else {}

    respuesta = client.get(
        f"/api/reportes/{parcela_id}", headers=cabecera, query_string=PERIODO
    )

    assert respuesta.status_code == estado_esperado


@pytest.mark.caso_limite
def test_rep07_el_periodo_incluye_el_inicio_y_excluye_el_fin(app, parcela):
    """REP-07 | Frontera del intervalo [inicio, fin) al contar eventos.

    Entrada: alertas registradas 1 s antes del inicio, exactamente en el inicio, 1 s antes del fin y exactamente en el fin.
    Esperado: se cuentan 2 alertas: la del inicio y la anterior al fin; quedan fuera las otras dos.
    """
    segundo = datetime.timedelta(seconds=1)
    with app.app_context():
        db.session.add_all([
            _alerta(parcela, INICIO - segundo),
            _alerta(parcela, INICIO),
            _alerta(parcela, FIN - segundo, "temperatura_baja"),
            _alerta(parcela, FIN),
        ])
        db.session.commit()

        eventos = obtener_eventos_mysql(parcela, INICIO, FIN)

    assert eventos["alertas"] == {
        "total": 2, "por_tipo": {"suelo_seco": 1, "temperatura_baja": 1},
    }


@pytest.mark.caso_normal
@pytest.mark.parametrize(
    "formato, tipo_mime, inicio_del_archivo",
    [
        ("csv", "text/csv", b"\xef\xbb\xbfSeccion,Indicador,Valor,Unidad,Detalle"),
        ("pdf", "application/pdf", b"%PDF-"),
    ],
    ids=["csv", "pdf"],
)
def test_rep08_exportacion_del_reporte_a_csv_y_pdf(
    client, auth, parcela, influx, formato, tipo_mime, inicio_del_archivo
):
    """REP-08 | Descarga del reporte en CSV y PDF.

    Entrada: el mismo periodo con formato=csv y formato=pdf.
    Esperado: 200, tipo MIME correcto, descarga con nombre reporte_parcela_<id>_20260301_20260401.<ext> y contenido con la firma del formato.
    """
    respuesta = client.get(
        f"/api/reportes/{parcela}", headers=auth(AGRICULTOR),
        query_string={**PERIODO, "formato": formato},
    )

    assert respuesta.status_code == 200
    assert respuesta.mimetype == tipo_mime
    assert respuesta.headers["Content-Disposition"] == (
        f"attachment; filename=reporte_parcela_{parcela}_20260301_20260401.{formato}"
    )
    assert respuesta.data.startswith(inicio_del_archivo)
    if formato == "csv":
        texto = respuesta.data.decode("utf-8-sig")
        assert "General,Nombre,Parcela de Ana" in texto
        assert "Sensores,humedad_suelo_promedio,41.5,%" in texto


@pytest.mark.regla_negocio
@pytest.mark.parametrize(
    "valor, esperado",
    [
        ("=SUMA(A1:A9)", "'=SUMA(A1:A9)"),
        ("+52 442 000 0000", "'+52 442 000 0000"),
        ("-riego", "'-riego"),
        ("  @comando", "'  @comando"),
        ("Parcela Norte", "Parcela Norte"),
        (-5.5, -5.5),
        (0, 0),
        (None, "No disponible"),
        (True, "True"),
    ],
    ids=["empieza_con_igual", "empieza_con_mas", "empieza_con_menos",
         "arroba_tras_espacios", "texto_normal", "numero_negativo", "cero",
         "valor_nulo", "booleano"],
)
def test_rep09_el_csv_neutraliza_formulas_de_hoja_de_calculo(valor, esperado):
    """REP-09 | Prueba unitaria de celda_csv (protección contra inyección de fórmulas).

    Entrada: textos que empiezan con =, +, - o @, texto normal, números negativos, cero, None y un booleano.
    Esperado: los textos peligrosos se anteponen con un apóstrofo; los números se conservan y None se muestra como «No disponible».
    """
    assert celda_csv(valor) == esperado


@pytest.mark.caso_error
def test_rep10_si_falla_la_base_de_sensores_se_responde_503(client, auth, parcela):
    """REP-10 | Fallo de InfluxDB al generar el reporte.

    Entrada: la consulta de sensores lanza ConnectionError.
    Esperado: 503 «No fue posible generar el reporte» sin exponer el detalle del error.
    """
    with patch(
        "app.services.reportes_service.obtener_estadisticas_sensores",
        side_effect=ConnectionError("influxdb:8086 no responde"),
    ):
        respuesta = client.get(
            f"/api/reportes/{parcela}", headers=auth(AGRICULTOR), query_string=PERIODO
        )

    assert respuesta.status_code == 503
    assert respuesta.get_json() == {"error": "No fue posible generar el reporte"}


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "parcela_id, inicio, fin, excepcion",
    [
        (0, INICIO, FIN, ValueError),
        ("1", INICIO, FIN, ValueError),
        (1, INICIO.replace(tzinfo=None), FIN, ValueError),
        (1, FIN, INICIO, ValueError),
        (9999, INICIO, FIN, LookupError),
    ],
    ids=["id_cero", "id_como_texto", "fecha_sin_zona", "inicio_posterior_al_fin",
         "parcela_inexistente"],
)
def test_rep11_el_servicio_valida_sus_argumentos(app, parcela, influx, parcela_id, inicio, fin, excepcion):
    """REP-11 | Prueba unitaria de generar_reporte_parcela con argumentos inválidos.

    Entrada: id 0, id como texto, fecha sin zona horaria, inicio posterior al fin y parcela inexistente.
    Esperado: ValueError en los cuatro primeros casos y LookupError para la parcela inexistente.
    """
    with app.app_context():
        with pytest.raises(excepcion):
            generar_reporte_parcela(parcela_id, inicio, fin)
    influx.assert_not_called()
