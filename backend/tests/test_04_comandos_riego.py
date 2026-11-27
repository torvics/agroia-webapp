"""Módulo 4 · Comandos de riego.

Código probado: app/routes/comandos_routes.py (órdenes del usuario, consulta y
confirmación por la estación, expiración de comandos y bitácora).
Ejecutar solo este módulo:  python -m pytest tests/test_04_comandos_riego.py -v
"""

import datetime
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.extensions import db
from app.models import Bitacora, Comando
from app.routes import comandos_routes
from app.routes.comandos_routes import (
    EXPIRACION_COMANDO_MINUTOS,
    RETENCION_COMANDOS_EJECUTADOS_DIAS,
    limpiar_comandos_viejos,
)

from datos import ADMIN, AGRICULTOR, OTRO_AGRICULTOR

AHORA = datetime.datetime(2026, 11, 16, 12, 0, 0)


class _RelojFijo(datetime.datetime):
    """Sustituye a datetime.datetime para congelar el reloj en AHORA."""

    @classmethod
    def utcnow(cls):
        return AHORA


RELOJ_SIMULADO = SimpleNamespace(datetime=_RelojFijo, timedelta=datetime.timedelta)


@pytest.fixture
def campo(crear_parcela, crear_nodo):
    """Parcela de Ana con una estación y un nodo de suelo, más una parcela ajena."""
    parcela = crear_parcela(AGRICULTOR, "Parcela de Ana")
    ajena = crear_parcela(OTRO_AGRICULTOR, "Parcela de Beto")
    return SimpleNamespace(
        parcela=parcela,
        estacion=crear_nodo(parcela, "estacion-A", tipo="estacion"),
        nodo=crear_nodo(parcela, "A1"),
        estacion_ajena=crear_nodo(ajena, "estacion-B", tipo="estacion"),
        nodo_ajeno=crear_nodo(ajena, "B1"),
    )


def _clave(nodo):
    return {"X-API-KEY": nodo.api_key}


def _guardar_comando(app, nodo_id, **campos):
    with app.app_context():
        comando = Comando(
            nodo_id=nodo_id, usuario_id=AGRICULTOR,
            tipo_comando="riego", valor="1", **campos,
        )
        db.session.add(comando)
        db.session.commit()
        return comando.id


@pytest.mark.caso_normal
def test_cmd01_agricultor_ordena_riego_en_su_nodo(app, client, auth, campo):
    """CMD-01 | Orden de riego sobre un nodo propio.

    Entrada: POST /api/nodos/<id>/comando con tipo_comando=riego y valor=1.
    Esperado: 201, comando pendiente (ejecutado=false) y una entrada en la bitácora con la acción.
    """
    respuesta = client.post(
        f"/api/nodos/{campo.nodo.id}/comando", headers=auth(AGRICULTOR),
        json={"tipo_comando": "riego", "valor": 1},
    )

    assert respuesta.status_code == 201
    cuerpo = respuesta.get_json()
    assert cuerpo["tipo_comando"] == "riego"
    assert cuerpo["valor"] == "1"
    assert cuerpo["ejecutado"] is False
    with app.app_context():
        registro = Bitacora.query.one()
        assert registro.usuario_id == AGRICULTOR
        assert registro.nodo_id == campo.nodo.id
        assert registro.accion == "Ordenó riego = 1 en Nodo A1"


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "cuerpo",
    [
        {},
        {"tipo_comando": "riego"},
        {"valor": 1},
        {"tipo_comando": "fertilizar", "valor": 1},
    ],
    ids=["cuerpo_vacio", "sin_valor", "sin_tipo", "tipo_inexistente"],
)
def test_cmd02_comando_incompleto_o_desconocido_se_rechaza(app, client, auth, campo, cuerpo):
    """CMD-02 | Orden con datos faltantes o tipo de comando desconocido.

    Entrada: cuerpo vacío, sin valor, sin tipo y tipo «fertilizar».
    Esperado: 400 y no se guarda ningún comando ni registro de bitácora.
    """
    respuesta = client.post(
        f"/api/nodos/{campo.nodo.id}/comando", headers=auth(AGRICULTOR), json=cuerpo
    )

    assert respuesta.status_code == 400
    with app.app_context():
        assert Comando.query.count() == 0
        assert Bitacora.query.count() == 0


@pytest.mark.caso_limite
@pytest.mark.parametrize("valor", [0, "0", False], ids=["cero", "cero_texto", "falso"])
def test_cmd03_el_valor_cero_es_una_orden_valida(client, auth, campo, valor):
    """CMD-03 | Frontera: el valor 0 (apagar) no se confunde con «sin valor».

    Entrada: tipo_comando=rele con valor 0, "0" y false.
    Esperado: 201; el comando de apagado se acepta aunque el valor sea «falso» en Python.
    """
    respuesta = client.post(
        f"/api/nodos/{campo.nodo.id}/comando", headers=auth(AGRICULTOR),
        json={"tipo_comando": "rele", "valor": valor},
    )

    assert respuesta.status_code == 201
    assert respuesta.get_json()["valor"] == str(valor)


@pytest.mark.regla_negocio
@pytest.mark.parametrize(
    "caso, estado_esperado",
    [
        ("nodo_inactivo", 409),
        ("nodo_en_mantenimiento", 409),
        ("nodo_de_otro_agricultor", 403),
        ("destino_es_una_estacion", 404),
        ("nodo_inexistente", 404),
        ("admin_controla_cualquier_nodo", 201),
    ],
)
def test_cmd04_quien_puede_ordenar_y_sobre_que_nodos(
    app, client, auth, campo, crear_nodo, caso, estado_esperado
):
    """CMD-04 | Reglas para aceptar una orden de riego.

    Entrada: nodo inactivo, en mantenimiento, de otro agricultor, una estación, un id inexistente y un administrador sobre un nodo ajeno.
    Esperado: 409, 409, 403, 404, 404 y 201 respectivamente.
    """
    inactivo = crear_nodo(campo.parcela, "A2", estado="inactivo")
    mantenimiento = crear_nodo(campo.parcela, "A3", estado="mantenimiento")
    destinos = {
        "nodo_inactivo": (AGRICULTOR, inactivo.id),
        "nodo_en_mantenimiento": (AGRICULTOR, mantenimiento.id),
        "nodo_de_otro_agricultor": (AGRICULTOR, campo.nodo_ajeno.id),
        "destino_es_una_estacion": (AGRICULTOR, campo.estacion.id),
        "nodo_inexistente": (AGRICULTOR, 9999),
        "admin_controla_cualquier_nodo": (ADMIN, campo.nodo_ajeno.id),
    }
    usuario_id, nodo_id = destinos[caso]

    respuesta = client.post(
        f"/api/nodos/{nodo_id}/comando", headers=auth(usuario_id),
        json={"tipo_comando": "riego", "valor": 1},
    )

    assert respuesta.status_code == estado_esperado
    with app.app_context():
        assert Comando.query.count() == (1 if estado_esperado == 201 else 0)


@pytest.mark.caso_normal
def test_cmd05_la_estacion_recibe_y_confirma_el_comando(app, client, auth, campo):
    """CMD-05 | Ciclo completo: ordenar, consultar, confirmar y volver a confirmar.

    Entrada: orden del agricultor; la estación consulta el pendiente y lo confirma dos veces.
    Esperado: pendiente=true con la orden; «confirmado» y luego «ya confirmado» (idempotente); bitácora con 2 entradas y sin pendientes.
    """
    ruta = f"/api/nodos/{campo.nodo.id}/comando"
    estacion = _clave(campo.estacion)
    orden = client.post(
        ruta, headers=auth(AGRICULTOR), json={"tipo_comando": "riego", "valor": 1}
    ).get_json()

    pendiente = client.get(ruta, headers=estacion).get_json()
    primera = client.post(f"{ruta}/confirmar", headers=estacion, json={"comando_id": orden["id"]})
    segunda = client.post(f"{ruta}/confirmar", headers=estacion, json={"comando_id": orden["id"]})

    assert pendiente["pendiente"] is True
    assert pendiente["comando"]["id"] == orden["id"]
    assert primera.get_json()["status"] == "confirmado"
    assert segunda.status_code == 200
    assert segunda.get_json()["status"] == "ya confirmado"
    assert client.get(ruta, headers=estacion).get_json() == {"pendiente": False}
    with app.app_context():
        comando = db.session.get(Comando, orden["id"])
        assert comando.ejecutado is True
        assert comando.fecha_ejecucion is not None
        acciones = [b.accion for b in Bitacora.query.order_by(Bitacora.id)]
    assert acciones == [
        "Ordenó riego = 1 en Nodo A1",
        f"Estación estacion-A confirmó comando {orden['id']}: riego = 1 en Nodo A1",
    ]


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "antiguedad, se_conserva",
    [
        (datetime.timedelta(minutes=9, seconds=59), True),
        (datetime.timedelta(minutes=10), True),
        (datetime.timedelta(minutes=10, seconds=1), False),
    ],
    ids=["9_min_59_s", "10_min_exactos", "10_min_y_1_s"],
)
def test_cmd06_un_comando_pendiente_expira_a_los_10_minutos(app, campo, antiguedad, se_conserva):
    """CMD-06 | Frontera de expiración de comandos pendientes (10 minutos).

    Entrada: comando pendiente creado hace 9 min 59 s, 10 min exactos y 10 min 1 s (reloj simulado).
    Esperado: se conserva hasta los 10 minutos inclusive; se elimina al superarlos.
    """
    assert EXPIRACION_COMANDO_MINUTOS == 10
    comando_id = _guardar_comando(
        app, campo.nodo.id, ejecutado=False, fecha_creacion=AHORA - antiguedad
    )

    with app.app_context():
        with patch.object(comandos_routes, "datetime", RELOJ_SIMULADO):
            limpiar_comandos_viejos()
        existe = db.session.get(Comando, comando_id) is not None

    assert existe is se_conserva


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "antiguedad, se_conserva",
    [
        (datetime.timedelta(days=7), True),
        (datetime.timedelta(days=7, seconds=1), False),
    ],
    ids=["7_dias_exactos", "7_dias_y_1_s"],
)
def test_cmd07_un_comando_ejecutado_se_conserva_7_dias(app, campo, antiguedad, se_conserva):
    """CMD-07 | Frontera de retención de comandos ejecutados (7 días).

    Entrada: comando ejecutado hace 7 días exactos y hace 7 días y 1 s (reloj simulado).
    Esperado: se conserva a los 7 días exactos; se elimina al superarlos.
    """
    assert RETENCION_COMANDOS_EJECUTADOS_DIAS == 7
    comando_id = _guardar_comando(
        app, campo.nodo.id, ejecutado=True,
        fecha_creacion=AHORA - antiguedad, fecha_ejecucion=AHORA - antiguedad,
    )

    with app.app_context():
        with patch.object(comandos_routes, "datetime", RELOJ_SIMULADO):
            limpiar_comandos_viejos()
        existe = db.session.get(Comando, comando_id) is not None

    assert existe is se_conserva


@pytest.mark.regla_negocio
def test_cmd08_una_estacion_no_opera_nodos_de_otra_parcela(app, client, auth, campo):
    """CMD-08 | Aislamiento entre estaciones de parcelas distintas.

    Entrada: la estación de otra parcela consulta y confirma un comando del nodo de Ana; también se intenta sin API key y con un JWT de usuario.
    Esperado: 403 para la estación ajena, 401 sin API key o con JWT; el comando sigue pendiente.
    """
    ruta = f"/api/nodos/{campo.nodo.id}/comando"
    comando_id = _guardar_comando(app, campo.nodo.id)
    ajena = _clave(campo.estacion_ajena)

    assert client.get(ruta, headers=ajena).status_code == 403
    assert client.post(
        f"{ruta}/confirmar", headers=ajena, json={"comando_id": comando_id}
    ).status_code == 403
    assert client.get(ruta).status_code == 401
    assert client.get(ruta, headers=auth(AGRICULTOR)).status_code == 401
    with app.app_context():
        assert db.session.get(Comando, comando_id).ejecutado is False


@pytest.mark.regla_negocio
def test_cmd09_confirmacion_por_lote_ignora_comandos_ajenos(app, client, campo):
    """CMD-09 | Confirmación por lote desde la estación.

    Entrada: lista con dos comandos propios, uno de otra parcela y un id inexistente.
    Esperado: 200; solo se confirman los dos propios y el comando ajeno sigue pendiente.
    """
    propio_1 = _guardar_comando(app, campo.nodo.id)
    propio_2 = _guardar_comando(app, campo.nodo.id)
    ajeno = _guardar_comando(app, campo.nodo_ajeno.id)
    estacion = _clave(campo.estacion)

    pendientes = client.get("/api/estacion/comandos-pendientes", headers=estacion).get_json()
    respuesta = client.post(
        "/api/estacion/comandos/confirmar", headers=estacion,
        json={"comando_ids": [propio_1, ajeno, propio_2, 9999]},
    )

    assert sorted(c["comando_id"] for c in pendientes["comandos"]) == [propio_1, propio_2]
    assert respuesta.status_code == 200
    assert respuesta.get_json() == {"status": "confirmado", "comando_ids": [propio_1, propio_2]}
    with app.app_context():
        assert db.session.get(Comando, ajeno).ejecutado is False


@pytest.mark.caso_error
def test_cmd10_confirmaciones_mal_formadas_se_rechazan(app, client, campo):
    """CMD-10 | Confirmaciones sin identificador, inexistentes o con formato incorrecto.

    Entrada: confirmar sin comando_id, con un comando inexistente, y lote con comando_ids que no es una lista.
    Esperado: 400, 404 y 400 respectivamente.
    """
    ruta = f"/api/nodos/{campo.nodo.id}/comando/confirmar"
    estacion = _clave(campo.estacion)

    assert client.post(ruta, headers=estacion, json={}).status_code == 400
    assert client.post(ruta, headers=estacion, json={"comando_id": 9999}).status_code == 404
    assert client.post(
        "/api/estacion/comandos/confirmar", headers=estacion, json={"comando_ids": "1,2"}
    ).status_code == 400


@pytest.mark.caso_error
@pytest.mark.defecto_conocido
@pytest.mark.xfail(
    strict=True,
    reason="DEF-03: la confirmación por lote responde 500 si comando_ids contiene "
           "un elemento que no es un número entero",
)
def test_cmd11_lote_con_ids_no_numericos_no_debe_fallar_con_500(app, client, campo):
    """CMD-11 | Lote con identificadores no numéricos (defecto detectado DEF-03).

    Entrada: comando_ids=[{"comando": 1}] (un objeto en lugar de un número) enviado por la estación.
    Esperado: 400 (o ignorar el elemento con 200); actualmente el servidor responde 500.
    """
    app.config["PROPAGATE_EXCEPTIONS"] = False

    respuesta = client.post(
        "/api/estacion/comandos/confirmar", headers=_clave(campo.estacion),
        json={"comando_ids": [{"comando": 1}]},
    )

    assert respuesta.status_code in (200, 400)
