"""Módulo 3 · Inventario de parcelas y nodos.

Código probado: app/routes/parcelas_routes.py, app/routes/nodos_routes.py y
app/utils/auth_nodo.py (autenticación de la estación por API key).
Ejecutar solo este módulo:  python -m pytest tests/test_03_parcelas_nodos.py -v
"""

import re

import pytest

from app.extensions import db
from app.models import Nodo, Parcela

from datos import ADMIN, AGRICULTOR, OTRO_AGRICULTOR


@pytest.mark.caso_normal
def test_par01_agricultor_crea_una_parcela_y_la_ve_en_su_listado(client, auth):
    """PAR-01 | Alta y consulta de una parcela.

    Entrada: POST /api/parcelas con nombre y ubicación, seguido de GET /api/parcelas.
    Esperado: 201 con la parcela asignada al usuario del token; el listado la incluye.
    """
    cabecera = auth(AGRICULTOR)

    alta = client.post(
        "/api/parcelas", headers=cabecera,
        json={"nombre": "Parcela Norte", "ubicacion": "El Marqués, Qro."},
    )

    assert alta.status_code == 201
    parcela = alta.get_json()
    assert parcela["nombre"] == "Parcela Norte"
    assert parcela["ubicacion"] == "El Marqués, Qro."
    assert str(parcela["usuario_id"]) == str(AGRICULTOR)
    listado = client.get("/api/parcelas", headers=cabecera).get_json()
    assert [p["id"] for p in listado] == [parcela["id"]]


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "cuerpo",
    [{}, {"nombre": ""}, {"nombre": None}, {"ubicacion": "Sin nombre"}],
    ids=["cuerpo_vacio", "nombre_vacio", "nombre_nulo", "solo_ubicacion"],
)
def test_par02_parcela_sin_nombre_se_rechaza(app, client, auth, cuerpo):
    """PAR-02 | El nombre de la parcela es obligatorio.

    Entrada: cuerpo vacío, nombre vacío, nombre nulo o solo la ubicación.
    Esperado: 400 «El nombre de la parcela es obligatorio» y no se guarda nada.
    """
    respuesta = client.post("/api/parcelas", headers=auth(AGRICULTOR), json=cuerpo)

    assert respuesta.status_code == 400
    assert respuesta.get_json() == {"error": "El nombre de la parcela es obligatorio"}
    with app.app_context():
        assert Parcela.query.count() == 0


@pytest.mark.regla_negocio
def test_par03_cada_agricultor_ve_solo_sus_parcelas(client, auth, crear_parcela):
    """PAR-03 | Aislamiento de parcelas por propietario.

    Entrada: una parcela de cada agricultor; cada uno y el administrador consultan el listado.
    Esperado: cada agricultor ve solo la suya; el administrador ve las dos.
    """
    de_ana = crear_parcela(AGRICULTOR, "Parcela de Ana")
    de_beto = crear_parcela(OTRO_AGRICULTOR, "Parcela de Beto")

    def ids_visibles(usuario_id):
        listado = client.get("/api/parcelas", headers=auth(usuario_id)).get_json()
        return sorted(p["id"] for p in listado)

    assert ids_visibles(AGRICULTOR) == [de_ana]
    assert ids_visibles(OTRO_AGRICULTOR) == [de_beto]
    assert ids_visibles(ADMIN) == sorted([de_ana, de_beto])


@pytest.mark.caso_error
def test_par04_no_se_puede_modificar_una_parcela_ajena(app, client, auth, crear_parcela):
    """PAR-04 | Editar o eliminar la parcela de otro agricultor.

    Entrada: PUT y DELETE de un agricultor sobre una parcela ajena y sobre una inexistente.
    Esperado: 404 en todos los casos (no revela que existe) y la parcela queda intacta.
    """
    de_ana = crear_parcela(AGRICULTOR, "Parcela de Ana")
    intruso = auth(OTRO_AGRICULTOR)

    assert client.put(
        f"/api/parcelas/{de_ana}", headers=intruso, json={"nombre": "Robada"}
    ).status_code == 404
    assert client.delete(f"/api/parcelas/{de_ana}", headers=intruso).status_code == 404
    assert client.delete("/api/parcelas/9999", headers=intruso).status_code == 404

    with app.app_context():
        assert db.session.get(Parcela, de_ana).nombre == "Parcela de Ana"


@pytest.mark.caso_limite
@pytest.mark.regla_negocio
@pytest.mark.parametrize(
    "nodos, estado_esperado",
    [(0, 200), (1, 409), (2, 409)],
    ids=["0_nodos_se_elimina", "1_nodo_se_conserva", "2_nodos_se_conserva"],
)
def test_par05_parcela_con_nodos_no_se_puede_eliminar(
    app, client, auth, crear_parcela, crear_nodo, nodos, estado_esperado
):
    """PAR-05 | Integridad: una parcela con nodos no se elimina.

    Entrada: DELETE sobre una parcela con 0, 1 y 2 nodos asociados.
    Esperado: 200 con 0 nodos (se elimina); 409 con 1 o más nodos (la parcela y sus nodos se conservan).
    """
    parcela = crear_parcela(AGRICULTOR)
    for numero in range(1, nodos + 1):
        crear_nodo(parcela, f"suelo-{numero}")

    respuesta = client.delete(f"/api/parcelas/{parcela}", headers=auth(AGRICULTOR))

    assert respuesta.status_code == estado_esperado
    with app.app_context():
        assert (db.session.get(Parcela, parcela) is None) is (nodos == 0)
        assert Nodo.query.count() == nodos


@pytest.mark.caso_limite
def test_par07_usuario_sin_registros_recibe_listas_vacias(client, auth):
    """PAR-07 | Frontera: agricultor que todavía no registra parcelas ni nodos.

    Entrada: GET /api/parcelas y GET /api/nodos sin ningún registro propio.
    Esperado: 200 con una lista vacía en ambos casos (no 404 ni error).
    """
    cabecera = auth(AGRICULTOR)

    parcelas = client.get("/api/parcelas", headers=cabecera)
    nodos = client.get("/api/nodos", headers=cabecera)

    assert (parcelas.status_code, parcelas.get_json()) == (200, [])
    assert (nodos.status_code, nodos.get_json()) == (200, [])


@pytest.mark.caso_normal
def test_nod01_registrar_nodo_genera_api_key_unica(client, auth, crear_parcela):
    """NOD-01 | Alta de nodos en una parcela propia.

    Entrada: dos nodos con identificador distinto; el primero sin indicar el tipo.
    Esperado: 201, tipo sensor_suelo por defecto, estado activo y una API key hexadecimal de 48 caracteres distinta para cada nodo.
    """
    parcela = crear_parcela(AGRICULTOR)
    cabecera = auth(AGRICULTOR)

    primero = client.post(
        "/api/nodos", headers=cabecera,
        json={"parcela_id": parcela, "identificador": "suelo-1"},
    )
    segundo = client.post(
        "/api/nodos", headers=cabecera,
        json={"parcela_id": parcela, "identificador": "estacion-1", "tipo": "estacion"},
    )

    assert primero.status_code == 201 and segundo.status_code == 201
    nodo = primero.get_json()
    assert (nodo["tipo"], nodo["estado"]) == ("sensor_suelo", "activo")
    assert re.fullmatch(r"[0-9a-f]{48}", nodo["api_key"])
    assert segundo.get_json()["tipo"] == "estacion"
    assert segundo.get_json()["api_key"] != nodo["api_key"]


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "usuario_id, cuerpo, estado_esperado",
    [
        (AGRICULTOR, {"parcela_id": 1}, 400),
        (AGRICULTOR, {"identificador": "suelo-9"}, 400),
        (AGRICULTOR, {"parcela_id": 1, "identificador": "suelo-9", "tipo": "dron"}, 400),
        (AGRICULTOR, {"parcela_id": 999, "identificador": "suelo-9"}, 404),
        (OTRO_AGRICULTOR, {"parcela_id": 1, "identificador": "suelo-9"}, 403),
        (AGRICULTOR, {"parcela_id": 1, "identificador": "suelo-1"}, 409),
    ],
    ids=["sin_identificador", "sin_parcela", "tipo_invalido",
         "parcela_inexistente", "parcela_ajena", "identificador_duplicado"],
)
def test_nod02_alta_de_nodo_invalida_se_rechaza(
    app, client, auth, crear_parcela, crear_nodo, usuario_id, cuerpo, estado_esperado
):
    """NOD-02 | Alta de nodo con datos inválidos.

    Entrada: sin identificador, sin parcela, tipo «dron», parcela inexistente, parcela ajena e identificador repetido.
    Esperado: 400, 400, 400, 404, 403 y 409 respectivamente; no se crea ningún nodo.
    """
    parcela = crear_parcela(AGRICULTOR)
    crear_nodo(parcela, "suelo-1")
    assert parcela == 1

    respuesta = client.post("/api/nodos", headers=auth(usuario_id), json=cuerpo)

    assert respuesta.status_code == estado_esperado
    with app.app_context():
        assert Nodo.query.count() == 1


@pytest.mark.regla_negocio
def test_nod03_dar_de_baja_un_nodo_es_una_baja_logica(app, client, auth, crear_parcela, crear_nodo):
    """NOD-03 | La baja de un nodo conserva su historial.

    Entrada: DELETE /api/nodos/<id> sobre un nodo activo.
    Esperado: 200 con estado «inactivo»; el registro sigue existiendo y aparece en el listado.
    """
    parcela = crear_parcela(AGRICULTOR)
    nodo = crear_nodo(parcela, "suelo-1")
    cabecera = auth(AGRICULTOR)

    baja = client.delete(f"/api/nodos/{nodo.id}", headers=cabecera)

    assert baja.status_code == 200
    assert baja.get_json()["estado"] == "inactivo"
    with app.app_context():
        assert db.session.get(Nodo, nodo.id).estado == "inactivo"
    listado = client.get("/api/nodos", headers=cabecera).get_json()
    assert [(n["id"], n["estado"]) for n in listado] == [(nodo.id, "inactivo")]


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "estado, estado_http",
    [("mantenimiento", 200), ("inactivo", 200), ("averiado", 400), ("", 400)],
    ids=["mantenimiento_valido", "inactivo_valido", "averiado_invalido", "vacio_invalido"],
)
def test_nod04_solo_se_aceptan_estados_del_catalogo(
    app, client, auth, crear_parcela, crear_nodo, estado, estado_http
):
    """NOD-04 | Catálogo de estados de un nodo (activo, inactivo, mantenimiento).

    Entrada: PUT con estado «mantenimiento», «inactivo», «averiado» y cadena vacía.
    Esperado: 200 para los estados del catálogo; 400 «Estado inválido» para el resto, sin cambiar el nodo.
    """
    nodo = crear_nodo(crear_parcela(AGRICULTOR), "suelo-1")

    respuesta = client.put(
        f"/api/nodos/{nodo.id}", headers=auth(AGRICULTOR), json={"estado": estado}
    )

    assert respuesta.status_code == estado_http
    with app.app_context():
        guardado = db.session.get(Nodo, nodo.id).estado
    assert guardado == (estado if estado_http == 200 else "activo")


@pytest.mark.regla_negocio
@pytest.mark.parametrize(
    "caso, estado_esperado",
    [
        ("sin_cabecera", 401),
        ("clave_inexistente", 401),
        ("clave_de_nodo_de_suelo", 401),
        ("estacion_en_mantenimiento", 401),
        ("estacion_activa", 200),
    ],
)
def test_nod05_solo_una_estacion_activa_se_autentica_con_api_key(
    client, crear_parcela, crear_nodo, caso, estado_esperado
):
    """NOD-05 | Autenticación de dispositivos con la cabecera X-API-KEY.

    Entrada: sin cabecera, clave inexistente, clave de un nodo de suelo, clave de una estación en mantenimiento y clave de una estación activa.
    Esperado: 401 en los cuatro primeros casos; 200 con valida=true solo para la estación activa.
    """
    parcela = crear_parcela(AGRICULTOR)
    suelo = crear_nodo(parcela, "suelo-1")
    estacion = crear_nodo(parcela, "estacion-1", tipo="estacion")
    en_mantenimiento = crear_nodo(
        parcela, "estacion-2", tipo="estacion", estado="mantenimiento"
    )
    cabeceras = {
        "sin_cabecera": {},
        "clave_inexistente": {"X-API-KEY": "0" * 48},
        "clave_de_nodo_de_suelo": {"X-API-KEY": suelo.api_key},
        "estacion_en_mantenimiento": {"X-API-KEY": en_mantenimiento.api_key},
        "estacion_activa": {"X-API-KEY": estacion.api_key},
    }

    respuesta = client.get("/api/nodos/validar-api-key", headers=cabeceras[caso])

    assert respuesta.status_code == estado_esperado
    if estado_esperado == 200:
        cuerpo = respuesta.get_json()
        assert cuerpo["valida"] is True
        assert cuerpo["identificador"] == "estacion-1"
        assert cuerpo["parcela_id"] == parcela


@pytest.mark.regla_negocio
@pytest.mark.defecto_conocido
@pytest.mark.xfail(
    strict=True,
    reason="DEF-02: PUT /api/parcelas/<id> acepta un nombre vacío aunque el alta "
           "lo declara obligatorio",
)
def test_par06_editar_parcela_no_debe_permitir_nombre_vacio(client, auth, crear_parcela):
    """PAR-06 | Editar una parcela dejando el nombre vacío (defecto detectado DEF-02).

    Entrada: PUT /api/parcelas/<id> con nombre="".
    Esperado: 400 como en el alta; actualmente responde 200 y guarda el nombre vacío.
    """
    parcela = crear_parcela(AGRICULTOR)

    respuesta = client.put(
        f"/api/parcelas/{parcela}", headers=auth(AGRICULTOR), json={"nombre": ""}
    )

    assert respuesta.status_code == 400
