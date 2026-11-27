"""Módulo 5 · Alertas.

Código probado: app/routes/alertas_routes.py (configuración de umbrales) y
app/services/alertas_service.py (detección de condiciones críticas y cooldown).
Ejecutar solo este módulo:  python -m pytest tests/test_05_alertas.py -v
"""

import datetime
from unittest.mock import patch

import pytest

from app.extensions import db
from app.models import AlertaConfig, AlertaEnviada, Nodo
from app.routes.alertas_routes import validar_parcela_id
from app.services.alertas_service import evaluar_alerta_estacion, evaluar_alerta_nodo

from datos import ADMIN, AGRICULTOR, OTRO_AGRICULTOR

AHORA = datetime.datetime(2026, 11, 16, 12, 0, 0)


@pytest.fixture
def parcela(crear_parcela):
    return crear_parcela(AGRICULTOR, "Parcela de Ana")


@pytest.fixture
def configurar(app):
    """Guarda la configuración de alertas de una parcela directamente en la base."""

    def _configurar(parcela_id, **campos):
        valores = {
            "humedad_suelo_min": 30.0,
            "temperatura_min": 5.0,
            "cooldown_minutos": 60,
            "activa": True,
            "correo_destino": "ana@example.test",
        }
        valores.update(campos)
        with app.app_context():
            db.session.add(AlertaConfig(parcela_id=parcela_id, **valores))
            db.session.commit()

    return _configurar


def _guardar(client, auth, parcela_id, usuario_id=AGRICULTOR, **campos):
    return client.post(
        "/api/alertas/config", headers=auth(usuario_id),
        json={"parcela_id": parcela_id, **campos},
    )


def _evaluar_humedad(app, nodo_id, humedad, ahora=AHORA):
    """Evalúa una lectura de humedad con el reloj del servicio congelado."""
    with app.app_context():
        nodo = db.session.get(Nodo, nodo_id)
        with patch("app.services.alertas_service.fecha_utc", return_value=ahora):
            alerta = evaluar_alerta_nodo(nodo, humedad)
        return None if alerta is None else alerta.id


@pytest.mark.caso_normal
def test_ale01_crear_y_actualizar_la_configuracion_de_alertas(client, auth, parcela):
    """ALE-01 | Alta y actualización de umbrales de una parcela.

    Entrada: primer POST con humedad mínima 35 y correo; segundo POST que cambia la humedad a 40.
    Esperado: 201 «Configuración creada» con valores por defecto (temperatura 10, cooldown 60); después 200 «Configuración actualizada» y GET devuelve 40.
    """
    creada = _guardar(
        client, auth, parcela, humedad_suelo_min=35, correo_destino="ana@example.test"
    )
    actualizada = _guardar(client, auth, parcela, humedad_suelo_min=40)
    consulta = client.get(
        f"/api/alertas/config?parcela_id={parcela}", headers=auth(AGRICULTOR)
    )

    assert creada.status_code == 201
    assert creada.get_json()["mensaje"] == "Configuración creada"
    config = creada.get_json()["configuracion"]
    assert config["humedad_suelo_min"] == 35.0
    assert config["temperatura_min"] == 10.0
    assert config["cooldown_minutos"] == 60
    assert config["activa"] is True
    assert actualizada.status_code == 200
    assert actualizada.get_json()["mensaje"] == "Configuración actualizada"
    guardada = consulta.get_json()["configuracion"]
    assert guardada["humedad_suelo_min"] == 40.0
    assert guardada["correo_destino"] == "ana@example.test"


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "campo, valor, estado_esperado",
    [
        ("humedad_suelo_min", -0.1, 400),
        ("humedad_suelo_min", 0, 201),
        ("humedad_suelo_min", 100, 201),
        ("humedad_suelo_min", 100.1, 400),
        ("temperatura_min", -50.1, 400),
        ("temperatura_min", -50, 201),
        ("temperatura_min", 60, 201),
        ("temperatura_min", 60.1, 400),
    ],
)
def test_ale02_rangos_validos_de_los_umbrales(client, auth, parcela, campo, valor, estado_esperado):
    """ALE-02 | Frontera de los umbrales: humedad 0 a 100 % y temperatura -50 a 60 °C.

    Entrada: valores justo en el límite (0, 100, -50, 60) y justo fuera (-0.1, 100.1, -50.1, 60.1).
    Esperado: 201 dentro del rango (límites incluidos) y 400 fuera de él.
    """
    respuesta = _guardar(client, auth, parcela, **{campo: valor})

    assert respuesta.status_code == estado_esperado


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "cooldown, estado_esperado",
    [(0, 400), (1, 201), (10080, 201), (10081, 400), (1.5, 400), ("60", 400), (True, 400)],
    ids=["0_rechazado", "1_minimo", "10080_maximo", "10081_rechazado",
         "decimal_rechazado", "texto_rechazado", "booleano_rechazado"],
)
def test_ale03_rango_del_cooldown(client, auth, parcela, cooldown, estado_esperado):
    """ALE-03 | Frontera del cooldown: entero de 1 a 10080 minutos (7 días).

    Entrada: 0, 1, 10080, 10081 y valores que no son enteros (1.5, "60", true).
    Esperado: 201 solo para 1 y 10080; 400 en los demás casos.
    """
    respuesta = _guardar(client, auth, parcela, cooldown_minutos=cooldown)

    assert respuesta.status_code == estado_esperado


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "campos",
    [
        {"umbral_secreto": 1},
        {"humedad_suelo_min": "alta"},
        {"humedad_suelo_min": True},
        {"activa": "si"},
        {"correo_destino": "sin-arroba"},
        {"correo_destino": 12345},
    ],
    ids=["campo_desconocido", "humedad_no_numerica", "humedad_booleana",
         "activa_no_booleana", "correo_mal_formado", "correo_no_es_texto"],
)
def test_ale04_configuracion_con_datos_invalidos_se_rechaza(app, client, auth, parcela, campos):
    """ALE-04 | Configuración con tipos de dato o campos inválidos.

    Entrada: campo desconocido, humedad como texto o booleano, «activa» como texto y correos mal formados.
    Esperado: 400 y no se guarda ninguna configuración.
    """
    respuesta = _guardar(client, auth, parcela, **campos)

    assert respuesta.status_code == 400
    assert "error" in respuesta.get_json()
    with app.app_context():
        assert AlertaConfig.query.count() == 0


@pytest.mark.caso_error
def test_ale05_acceso_a_la_configuracion_de_alertas(client, auth, parcela):
    """ALE-05 | Permisos y parcelas inexistentes en la configuración de alertas.

    Entrada: otro agricultor intenta guardar; parcela inexistente; parcela sin configuración; parcela_id «abc»; el administrador guarda.
    Esperado: 403, 404, 404, 400 y 201 respectivamente.
    """
    assert _guardar(client, auth, parcela, OTRO_AGRICULTOR, humedad_suelo_min=20).status_code == 403
    assert _guardar(client, auth, 9999, humedad_suelo_min=20).status_code == 404
    assert client.get(
        f"/api/alertas/config?parcela_id={parcela}", headers=auth(AGRICULTOR)
    ).status_code == 404
    assert client.get(
        "/api/alertas/config?parcela_id=abc", headers=auth(AGRICULTOR)
    ).status_code == 400
    assert _guardar(client, auth, parcela, ADMIN, humedad_suelo_min=20).status_code == 201


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "valor, esperado",
    [
        (1, 1), ("25", 25), (2**31, 2**31),
        (0, None), ("0", None), (-3, None), ("-3", None),
        (True, None), (1.0, None), ("1.5", None), (" 7", None),
        ("", None), (None, None), ("abc", None),
    ],
)
def test_ale06_validar_parcela_id_acepta_solo_enteros_positivos(valor, esperado):
    """ALE-06 | Prueba unitaria de validar_parcela_id.

    Entrada: enteros y textos válidos (1, "25"), el cero, negativos, booleanos, decimales, espacios, vacío y None.
    Esperado: devuelve el entero cuando es positivo; None en cualquier otro caso.
    """
    assert validar_parcela_id(valor) == esperado


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "humedad, genera_alerta",
    [(29.9, True), (30.0, False), (30.1, False)],
    ids=["29.9_bajo_el_umbral", "30.0_igual_al_umbral", "30.1_sobre_el_umbral"],
)
def test_ale07_solo_una_lectura_bajo_el_umbral_genera_alerta(
    app, parcela, crear_nodo, configurar, humedad, genera_alerta
):
    """ALE-07 | Frontera del umbral de humedad (mínimo configurado: 30 %).

    Entrada: lecturas de 29.9, 30.0 y 30.1 % en un nodo de suelo.
    Esperado: solo 29.9 genera una alerta «suelo_seco» pendiente; una lectura igual al umbral no es crítica.
    """
    configurar(parcela, humedad_suelo_min=30.0)
    nodo = crear_nodo(parcela, "A1")

    alerta_id = _evaluar_humedad(app, nodo.id, humedad)

    assert (alerta_id is not None) is genera_alerta
    with app.app_context():
        alertas = AlertaEnviada.query.all()
        assert len(alertas) == (1 if genera_alerta else 0)
        if genera_alerta:
            alerta = alertas[0]
            assert alerta.tipo_alerta == "suelo_seco"
            assert alerta.nodo_id == nodo.id
            assert alerta.valor_detectado == 29.9
            assert alerta.umbral == 30.0
            assert alerta.estado == "pendiente"
            assert alerta.destinatario == "ana@example.test"
            assert alerta.mensaje == (
                "Suelo seco en nodo A1: valor 29.9, umbral mínimo 30.0"
            )


@pytest.mark.regla_negocio
@pytest.mark.parametrize(
    "minutos_despues, segundos_extra, genera_segunda_alerta",
    [(1, 0, False), (60, 0, False), (60, 1, True)],
    ids=["1_min_despues", "60_min_exactos", "60_min_y_1_s"],
)
def test_ale08_el_cooldown_evita_alertas_repetidas(
    app, parcela, crear_nodo, configurar, minutos_despues, segundos_extra,
    genera_segunda_alerta,
):
    """ALE-08 | Cooldown de 60 minutos entre alertas del mismo nodo.

    Entrada: segunda lectura crítica 1 min, 60 min exactos y 60 min 1 s después de la primera alerta (reloj simulado).
    Esperado: no se repite la alerta dentro de los 60 minutos (límite incluido); pasado el cooldown se genera una nueva.
    """
    configurar(parcela, cooldown_minutos=60)
    nodo = crear_nodo(parcela, "A1")
    despues = AHORA + datetime.timedelta(minutes=minutos_despues, seconds=segundos_extra)

    primera = _evaluar_humedad(app, nodo.id, 12.0, ahora=AHORA)
    segunda = _evaluar_humedad(app, nodo.id, 11.0, ahora=despues)

    assert primera is not None
    assert (segunda is not None) is genera_segunda_alerta
    with app.app_context():
        assert AlertaEnviada.query.count() == (2 if genera_segunda_alerta else 1)


@pytest.mark.regla_negocio
def test_ale09_el_cooldown_es_independiente_por_nodo_y_por_tipo(
    app, parcela, crear_nodo, configurar
):
    """ALE-09 | El cooldown no silencia a otros nodos ni a otro tipo de alerta.

    Entrada: lecturas críticas simultáneas en dos nodos de suelo y temperatura baja en la estación.
    Esperado: 3 alertas: dos «suelo_seco» (una por nodo) y una «temperatura_baja» sin nodo asociado.
    """
    configurar(parcela, humedad_suelo_min=30.0, temperatura_min=5.0)
    nodo_1 = crear_nodo(parcela, "A1")
    nodo_2 = crear_nodo(parcela, "A2")
    estacion = crear_nodo(parcela, "estacion-A", tipo="estacion")

    assert _evaluar_humedad(app, nodo_1.id, 10.0) is not None
    assert _evaluar_humedad(app, nodo_2.id, 10.0) is not None
    with app.app_context():
        with patch("app.services.alertas_service.fecha_utc", return_value=AHORA):
            alerta = evaluar_alerta_estacion(db.session.get(Nodo, estacion.id), 4.9)
        assert alerta.tipo_alerta == "temperatura_baja"
        assert alerta.nodo_id is None
        tipos = sorted(a.tipo_alerta for a in AlertaEnviada.query.all())

    assert tipos == ["suelo_seco", "suelo_seco", "temperatura_baja"]


@pytest.mark.regla_negocio
@pytest.mark.parametrize("caso", ["sin_configuracion", "configuracion_desactivada"])
def test_ale10_sin_configuracion_activa_no_hay_alertas(app, parcela, crear_nodo, configurar, caso):
    """ALE-10 | Las alertas solo se generan con una configuración activa.

    Entrada: lectura crítica (5 %) en una parcela sin configuración y en otra con activa=false.
    Esperado: no se registra ninguna alerta.
    """
    if caso == "configuracion_desactivada":
        configurar(parcela, activa=False)
    nodo = crear_nodo(parcela, "A1")

    assert _evaluar_humedad(app, nodo.id, 5.0) is None
    with app.app_context():
        assert AlertaEnviada.query.count() == 0


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "lectura", [float("nan"), float("inf"), "no-es-numero"],
    ids=["nan", "infinito", "texto"],
)
def test_ale11_lecturas_no_numericas_se_rechazan(app, parcela, crear_nodo, configurar, lectura):
    """ALE-11 | Lecturas corruptas del sensor.

    Entrada: lectura NaN, infinita o un texto.
    Esperado: se lanza ValueError y no se registra ninguna alerta.
    """
    configurar(parcela)
    nodo = crear_nodo(parcela, "A1")

    with pytest.raises(ValueError):
        _evaluar_humedad(app, nodo.id, lectura)
    with app.app_context():
        assert AlertaEnviada.query.count() == 0


@pytest.mark.caso_error
def test_ale12_cada_evaluacion_exige_el_tipo_de_dispositivo_correcto(
    app, parcela, crear_nodo, configurar
):
    """ALE-12 | Humedad solo para nodos de suelo y temperatura solo para estaciones.

    Entrada: evaluar humedad con una estación y temperatura ambiente con un nodo de suelo.
    Esperado: ValueError en ambos casos.
    """
    configurar(parcela)
    suelo = crear_nodo(parcela, "A1")
    estacion = crear_nodo(parcela, "estacion-A", tipo="estacion")

    with app.app_context():
        with pytest.raises(ValueError, match="no es un nodo de suelo"):
            evaluar_alerta_nodo(db.session.get(Nodo, estacion.id), 10.0)
        with pytest.raises(ValueError, match="no es una estación"):
            evaluar_alerta_estacion(db.session.get(Nodo, suelo.id), 2.0)
