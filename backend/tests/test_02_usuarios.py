"""Módulo 2 · Gestión de usuarios.

Código probado: app/routes/usuarios_routes.py, app/models/usuario.py y la
confirmación de correo (app/utils/email_confirmation.py).
Ejecutar solo este módulo:  python -m pytest tests/test_02_usuarios.py -v
"""

from urllib.parse import urlsplit

import pytest

from app.extensions import db
from app.models import Usuario

from datos import ADMIN, ADMIN_2, AGRICULTOR, alterar_firma, correo_de


def _alta(**cambios):
    datos = {
        "nombre": "Carla Campos",
        "correo": "carla@example.test",
        "password": "Segura-123",
        "rol": "agricultor",
    }
    datos.update(cambios)
    return datos


def _total_usuarios(app):
    with app.app_context():
        return Usuario.query.count()


@pytest.mark.caso_normal
def test_usu01_admin_registra_un_agricultor(app, client, auth, correos):
    """USU-01 | Alta de un agricultor por un administrador.

    Entrada: nombre, correo con mayúsculas, contraseña de 10 caracteres y rol agricultor.
    Esperado: 201, correo normalizado a minúsculas, cuenta pendiente de confirmar, correo de confirmación enviado y contraseña guardada solo como hash.
    """
    respuesta = client.post(
        "/api/usuarios", headers=auth(ADMIN),
        json=_alta(correo="Carla@Example.TEST"),
    )

    assert respuesta.status_code == 201
    cuerpo = respuesta.get_json()
    assert cuerpo["correo"] == "carla@example.test"
    assert cuerpo["rol"] == "agricultor"
    assert cuerpo["activo"] is True
    assert cuerpo["correo_confirmado"] is False
    assert "password" not in cuerpo and "password_hash" not in cuerpo

    correos.confirmacion.assert_called_once()
    destinatario, enlace = correos.confirmacion.call_args.args
    assert destinatario == "carla@example.test"
    assert enlace.startswith("http://localhost:5000/api/auth/confirmar-correo?token=")

    with app.app_context():
        usuario = db.session.get(Usuario, cuerpo["id"])
        assert usuario.password_hash != "Segura-123"
        assert usuario.check_password("Segura-123")


@pytest.mark.caso_normal
def test_usu02_admin_lista_usuarios_sin_exponer_passwords(client, auth):
    """USU-02 | Listado de usuarios para el administrador.

    Entrada: GET /api/usuarios con token de administrador.
    Esperado: 200 con los 4 usuarios base ordenados por id y sin ningún campo de contraseña.
    """
    respuesta = client.get("/api/usuarios", headers=auth(ADMIN))

    assert respuesta.status_code == 200
    usuarios = respuesta.get_json()
    assert [u["id"] for u in usuarios] == [1, 2, 3, 4]
    assert all(
        set(u) == {"id", "nombre", "correo", "rol", "activo", "correo_confirmado"}
        for u in usuarios
    )


@pytest.mark.caso_error
def test_usu03_solo_un_admin_gestiona_usuarios(app, client, auth):
    """USU-03 | Control de acceso por rol en la gestión de usuarios.

    Entrada: listar, crear y editar usuarios sin token y con token de agricultor.
    Esperado: 401 sin token y 403 para el agricultor; no se crea ni modifica ninguna cuenta.
    """
    assert client.get("/api/usuarios").status_code == 401

    agricultor = auth(AGRICULTOR)
    assert client.get("/api/usuarios", headers=agricultor).status_code == 403
    assert client.post("/api/usuarios", headers=agricultor, json=_alta()).status_code == 403
    assert client.put(
        f"/api/usuarios/{ADMIN_2}", headers=agricultor, json={"activo": False}
    ).status_code == 403

    assert _total_usuarios(app) == 4
    with app.app_context():
        assert db.session.get(Usuario, ADMIN_2).activo is True


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "longitud, estado_esperado",
    [(1, 400), (2, 201), (100, 201), (101, 400)],
    ids=["1_rechazado", "2_minimo", "100_maximo", "101_rechazado"],
)
def test_usu04_longitud_del_nombre(client, auth, longitud, estado_esperado):
    """USU-04 | Frontera de longitud del nombre (2 a 100 caracteres).

    Entrada: nombres de 1, 2, 100 y 101 caracteres.
    Esperado: 400 para 1 y 101; 201 para 2 y 100.
    """
    respuesta = client.post(
        "/api/usuarios", headers=auth(ADMIN), json=_alta(nombre="N" * longitud)
    )

    assert respuesta.status_code == estado_esperado


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "longitud, estado_esperado",
    [(7, 400), (8, 201), (128, 201), (129, 400)],
    ids=["7_rechazada", "8_minimo", "128_maximo", "129_rechazada"],
)
def test_usu05_longitud_de_la_password_inicial(client, auth, longitud, estado_esperado):
    """USU-05 | Frontera de longitud de la contraseña inicial (8 a 128).

    Entrada: contraseñas de 7, 8, 128 y 129 caracteres.
    Esperado: 400 para 7 y 129; 201 para 8 y 128.
    """
    respuesta = client.post(
        "/api/usuarios", headers=auth(ADMIN), json=_alta(password="p" * longitud)
    )

    assert respuesta.status_code == estado_esperado


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "cambios, estado_esperado",
    [
        ({"correo": "sin-arroba.example.test"}, 400),
        ({"correo": "con espacio@example.test"}, 400),
        ({"correo": ""}, 400),
        ({"rol": "superusuario"}, 400),
        ({"password": 12345678}, 400),
        ({"correo": correo_de(AGRICULTOR).upper()}, 409),
    ],
    ids=["correo_sin_arroba", "correo_con_espacio", "correo_vacio",
         "rol_inexistente", "password_no_es_texto", "correo_duplicado"],
)
def test_usu06_alta_con_datos_invalidos_se_rechaza(app, client, auth, cambios, estado_esperado):
    """USU-06 | Alta con datos inválidos o correo duplicado.

    Entrada: correo sin @, con espacio o vacío; rol inexistente; contraseña numérica; correo ya registrado (en mayúsculas).
    Esperado: 400 para datos inválidos, 409 para el duplicado y ninguna cuenta nueva.
    """
    respuesta = client.post("/api/usuarios", headers=auth(ADMIN), json=_alta(**cambios))

    assert respuesta.status_code == estado_esperado
    assert "error" in respuesta.get_json()
    assert _total_usuarios(app) == 4


@pytest.mark.regla_negocio
@pytest.mark.parametrize(
    "cambio", [{"activo": False}, {"rol": "agricultor"}],
    ids=["desactivarse", "quitarse_el_rol"],
)
def test_usu07_admin_no_puede_bloquearse_a_si_mismo(app, client, auth, cambio):
    """USU-07 | Un administrador no puede desactivarse ni quitarse su rol.

    Entrada: PUT sobre su propia cuenta con activo=false o rol=agricultor.
    Esperado: 400 y la cuenta sigue activa y con rol admin.
    """
    respuesta = client.put(f"/api/usuarios/{ADMIN}", headers=auth(ADMIN), json=cambio)

    assert respuesta.status_code == 400
    with app.app_context():
        admin = db.session.get(Usuario, ADMIN)
        assert (admin.rol, admin.activo) == ("admin", True)


@pytest.mark.regla_negocio
def test_usu08_desactivar_cuenta_cierra_su_sesion_abierta(client, auth, login):
    """USU-08 | Desactivar una cuenta invalida de inmediato sus sesiones.

    Entrada: token vigente de un usuario al que otro administrador desactiva.
    Esperado: el token deja de servir (401) y ya no puede iniciar sesión (401).
    """
    sesion_abierta = auth(ADMIN_2)
    assert client.get("/api/usuarios", headers=sesion_abierta).status_code == 200

    desactivar = client.put(
        f"/api/usuarios/{ADMIN_2}", headers=auth(ADMIN), json={"activo": False}
    )

    assert desactivar.status_code == 200
    assert desactivar.get_json()["activo"] is False
    assert client.get("/api/usuarios", headers=sesion_abierta).status_code == 401
    assert login(correo_de(ADMIN_2)).status_code == 401


@pytest.mark.regla_negocio
def test_usu09_agricultor_debe_confirmar_su_correo(client, auth, login, correos):
    """USU-09 | Confirmación de correo de un agricultor nuevo.

    Entrada: alta de agricultor, intento de login, apertura del enlace de confirmación y nuevo login.
    Esperado: 403 antes de confirmar; el enlace redirige con estado=confirmado; después el login responde 200.
    """
    client.post("/api/usuarios", headers=auth(ADMIN), json=_alta())
    assert login("carla@example.test", "Segura-123").status_code == 403

    _, enlace = correos.confirmacion.call_args.args
    partes = urlsplit(enlace)
    confirmacion = client.get(f"{partes.path}?{partes.query}")

    assert confirmacion.status_code == 302
    assert confirmacion.headers["Location"] == (
        "http://localhost:5173/confirmar-correo?estado=confirmado"
    )
    assert login("carla@example.test", "Segura-123").status_code == 200


@pytest.mark.caso_error
def test_usu10_enlace_de_confirmacion_alterado_no_confirma(client, auth, login, correos):
    """USU-10 | Enlace de confirmación con el token alterado.

    Entrada: token de confirmación con un carácter de la firma cambiado.
    Esperado: redirección con estado=invalido y la cuenta sigue sin poder iniciar sesión (403).
    """
    client.post("/api/usuarios", headers=auth(ADMIN), json=_alta())
    _, enlace = correos.confirmacion.call_args.args
    partes = urlsplit(enlace)

    confirmacion = client.get(f"{partes.path}?{alterar_firma(partes.query)}")

    assert confirmacion.headers["Location"].endswith("estado=invalido")
    assert login("carla@example.test", "Segura-123").status_code == 403


@pytest.mark.regla_negocio
def test_usu11_si_falla_el_correo_no_se_crea_la_cuenta(app, client, auth, correos):
    """USU-11 | El alta es atómica: sin correo de confirmación no hay cuenta.

    Entrada: alta de agricultor cuando el servicio de correo lanza un error.
    Esperado: 503 y la cuenta no queda guardada (rollback).
    """
    correos.confirmacion.side_effect = RuntimeError("SMTP no disponible")

    respuesta = client.post("/api/usuarios", headers=auth(ADMIN), json=_alta())

    assert respuesta.status_code == 503
    assert _total_usuarios(app) == 4


@pytest.mark.regla_negocio
def test_usu12_un_admin_nuevo_no_requiere_confirmar_correo(client, auth, login, correos):
    """USU-12 | Solo los agricultores confirman su correo.

    Entrada: alta de un usuario con rol admin.
    Esperado: 201 con correo_confirmado=true, sin enviar correo, y puede iniciar sesión de inmediato.
    """
    respuesta = client.post("/api/usuarios", headers=auth(ADMIN), json=_alta(rol="admin"))

    assert respuesta.status_code == 201
    assert respuesta.get_json()["correo_confirmado"] is True
    correos.confirmacion.assert_not_called()
    assert login("carla@example.test", "Segura-123").status_code == 200


@pytest.mark.caso_normal
def test_usu13_modelo_usuario_guarda_la_password_como_hash():
    """USU-13 | Prueba unitaria del modelo Usuario (sin base de datos).

    Entrada: set_password("Secreta-2026") y verificación con la contraseña correcta y con una incorrecta.
    Esperado: el hash no contiene el texto plano; check_password devuelve True y False respectivamente.
    """
    usuario = Usuario(nombre="Prueba", correo="prueba@example.test", rol="agricultor")

    usuario.set_password("Secreta-2026")

    assert "Secreta-2026" not in usuario.password_hash
    assert usuario.check_password("Secreta-2026") is True
    assert usuario.check_password("secreta-2026") is False
