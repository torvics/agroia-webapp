"""Módulo 1 · Autenticación.

Código probado: app/routes/auth_routes.py y app/utils/password_reset.py
Ejecutar solo este módulo:  python -m pytest tests/test_01_autenticacion.py -v
"""

from unittest.mock import patch
from urllib.parse import unquote

import pytest

from app.extensions import db
from app.models import TokenRevocado, Usuario
from app.utils.password_reset import (
    PLAZO_RECUPERACION_SEGUNDOS,
    crear_token_recuperacion,
    obtener_id_token,
    validar_token_recuperacion,
)

from datos import ADMIN, AGRICULTOR, PASSWORD, alterar_firma, correo_de

MENSAJE_GENERICO = (
    "Si existe una cuenta activa con ese correo, recibirás un enlace "
    "para restablecer tu contraseña."
)


def _token_del_enlace(correos):
    """Extrae el token del enlace que se habría enviado por correo."""
    _, enlace = correos.recuperacion.call_args.args
    return unquote(enlace.split("token=", 1)[1])


@pytest.mark.caso_normal
def test_aut01_login_con_credenciales_validas_devuelve_token(client, login):
    """AUT-01 | Login con credenciales válidas.

    Entrada: correo y contraseña correctos de un agricultor activo.
    Esperado: 200, token JWT de tres segmentos, rol y nombre; el token da acceso al perfil.
    """
    respuesta = login(correo_de(AGRICULTOR))

    assert respuesta.status_code == 200
    cuerpo = respuesta.get_json()
    assert cuerpo["rol"] == "agricultor"
    assert cuerpo["nombre"] == "Ana Agricultora"
    assert cuerpo["access_token"].count(".") == 2

    perfil = client.get(
        "/api/auth/perfil",
        headers={"Authorization": f"Bearer {cuerpo['access_token']}"},
    )
    assert perfil.status_code == 200
    assert perfil.get_json()["correo"] == correo_de(AGRICULTOR)


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "correo, password",
    [
        (correo_de(AGRICULTOR), "contraseña-equivocada"),
        ("nadie@example.test", PASSWORD),
        ("", PASSWORD),
    ],
    ids=["password_incorrecta", "correo_inexistente", "correo_vacio"],
)
def test_aut02_login_con_credenciales_invalidas_se_rechaza(login, correo, password):
    """AUT-02 | Login con credenciales inválidas.

    Entrada: contraseña incorrecta, correo inexistente o correo vacío.
    Esperado: 401 con el mismo mensaje genérico y sin token (no revela qué dato falló).
    """
    respuesta = login(correo, password)

    assert respuesta.status_code == 401
    assert respuesta.get_json() == {"error": "credenciales inválidas"}


@pytest.mark.regla_negocio
@pytest.mark.parametrize(
    "activo, correo_confirmado, estado_esperado",
    [(False, True, 401), (True, False, 403)],
    ids=["cuenta_desactivada", "correo_sin_confirmar"],
)
def test_aut03_cuenta_inactiva_o_sin_confirmar_no_inicia_sesion(
    login, crear_usuario, activo, correo_confirmado, estado_esperado
):
    """AUT-03 | Solo cuentas activas y con correo confirmado inician sesión.

    Entrada: contraseña correcta de una cuenta desactivada o sin confirmar.
    Esperado: 401 si está desactivada; 403 si el correo no se ha confirmado.
    """
    crear_usuario(
        "restringido@example.test",
        activo=activo,
        correo_confirmado=correo_confirmado,
    )

    respuesta = login("restringido@example.test")

    assert respuesta.status_code == estado_esperado
    assert "access_token" not in respuesta.get_json()


@pytest.mark.regla_negocio
def test_aut04_logout_revoca_el_token(app, client, login):
    """AUT-04 | Cerrar sesión invalida el token en el servidor.

    Entrada: token válido usado antes y después de POST /api/auth/logout.
    Esperado: 200 antes del logout, 401 después, y el jti queda en tokens_revocados.
    """
    token = login(correo_de(ADMIN)).get_json()["access_token"]
    cabecera = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/auth/perfil", headers=cabecera).status_code == 200
    assert client.post("/api/auth/logout", headers=cabecera).status_code == 200

    assert client.get("/api/auth/perfil", headers=cabecera).status_code == 401
    assert client.post("/api/auth/logout", headers=cabecera).status_code == 401
    with app.app_context():
        assert TokenRevocado.query.count() == 1


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "longitud, estado_esperado",
    [(11, 400), (12, 200), (128, 200), (129, 400)],
    ids=["11_rechazada", "12_minimo", "128_maximo", "129_rechazada"],
)
def test_aut05_longitud_de_la_nueva_password(client, auth, longitud, estado_esperado):
    """AUT-05 | Frontera de longitud al cambiar la contraseña (12 a 128).

    Entrada: contraseña nueva de 11, 12, 128 y 129 caracteres.
    Esperado: 400 para 11 y 129; 200 para 12 y 128.
    """
    respuesta = client.patch(
        "/api/auth/password",
        headers=auth(AGRICULTOR),
        json={"password_actual": PASSWORD, "password_nueva": "N" * longitud},
    )

    assert respuesta.status_code == estado_esperado


@pytest.mark.regla_negocio
def test_aut06_cambiar_password_exige_la_actual_y_cierra_la_sesion(client, auth, login):
    """AUT-06 | Reglas del cambio de contraseña.

    Entrada: contraseña actual incorrecta, nueva igual a la actual y un cambio válido.
    Esperado: 403, 400 y 200; después el token anterior y la contraseña anterior dejan de servir.
    """
    cabecera = auth(AGRICULTOR)
    nueva = "Otra-clave-segura-2027"

    incorrecta = client.patch(
        "/api/auth/password", headers=cabecera,
        json={"password_actual": "no-es-la-actual", "password_nueva": nueva},
    )
    repetida = client.patch(
        "/api/auth/password", headers=cabecera,
        json={"password_actual": PASSWORD, "password_nueva": PASSWORD},
    )
    valida = client.patch(
        "/api/auth/password", headers=cabecera,
        json={"password_actual": PASSWORD, "password_nueva": nueva},
    )

    assert incorrecta.status_code == 403
    assert repetida.status_code == 400
    assert valida.status_code == 200
    assert client.get("/api/auth/perfil", headers=cabecera).status_code == 401
    assert login(correo_de(AGRICULTOR), PASSWORD).status_code == 401
    assert login(correo_de(AGRICULTOR), nueva).status_code == 200


@pytest.mark.caso_normal
def test_aut07_recuperacion_de_password_de_un_solo_uso(client, login, correos):
    """AUT-07 | Recuperar la contraseña con el enlace enviado por correo.

    Entrada: solicitud de recuperación y uso del token del enlace dos veces.
    Esperado: se envía un correo; el primer uso responde 200 y el segundo 400 (un solo uso).
    """
    solicitud = client.post(
        "/api/auth/recuperar-password", json={"correo": correo_de(AGRICULTOR)}
    )
    assert solicitud.status_code == 200
    correos.recuperacion.assert_called_once()
    destinatario, enlace = correos.recuperacion.call_args.args
    assert destinatario == correo_de(AGRICULTOR)
    assert enlace.startswith("http://localhost:5173/restablecer-password?token=")

    datos = {"token": _token_del_enlace(correos), "password_nueva": "Clave-restablecida-1"}
    primer_uso = client.post("/api/auth/restablecer-password", json=datos)
    segundo_uso = client.post(
        "/api/auth/restablecer-password",
        json={**datos, "password_nueva": "Clave-restablecida-2"},
    )

    assert primer_uso.status_code == 200
    assert segundo_uso.status_code == 400
    assert login(correo_de(AGRICULTOR), "Clave-restablecida-1").status_code == 200
    assert login(correo_de(AGRICULTOR), PASSWORD).status_code == 401


@pytest.mark.caso_error
@pytest.mark.parametrize(
    "alterar",
    [
        alterar_firma,
        lambda token: "abc",
        lambda token: None,
        lambda token: token + "x" * 5000,
    ],
    ids=["firma_alterada", "token_demasiado_corto", "sin_token", "token_demasiado_largo"],
)
def test_aut08_token_de_recuperacion_invalido_se_rechaza(client, login, correos, alterar):
    """AUT-08 | Token de recuperación manipulado o mal formado.

    Entrada: token con la firma alterada, de 3 caracteres, ausente o de más de 4096 caracteres.
    Esperado: 400 «Enlace inválido, utilizado o caducado» y la contraseña no cambia.
    """
    client.post("/api/auth/recuperar-password", json={"correo": correo_de(AGRICULTOR)})
    token = alterar(_token_del_enlace(correos))

    respuesta = client.post(
        "/api/auth/restablecer-password",
        json={"token": token, "password_nueva": "Clave-restablecida-1"},
    )

    assert respuesta.status_code == 400
    assert respuesta.get_json() == {"error": "Enlace inválido, utilizado o caducado"}
    assert login(correo_de(AGRICULTOR), PASSWORD).status_code == 200


@pytest.mark.caso_limite
@pytest.mark.parametrize(
    "segundos_transcurridos, sigue_vigente",
    [(0, True), (1200, True), (1201, False)],
    ids=["recien_creado", "20_min_exactos", "20_min_y_1_s"],
)
def test_aut09_token_de_recuperacion_caduca_a_los_20_minutos(
    app, segundos_transcurridos, sigue_vigente
):
    """AUT-09 | Frontera de caducidad del token de recuperación (20 minutos).

    Entrada: token validado 0 s, 1200 s y 1201 s después de crearse (reloj simulado).
    Esperado: vigente hasta 1200 s inclusive; caducado a partir de 1201 s.
    """
    assert PLAZO_RECUPERACION_SEGUNDOS == 20 * 60
    instante_creacion = 1_800_000_000

    with app.app_context():
        usuario = db.session.get(Usuario, AGRICULTOR)
        with patch("itsdangerous.timed.time.time", return_value=instante_creacion):
            token = crear_token_recuperacion(usuario)
        with patch(
            "itsdangerous.timed.time.time",
            return_value=instante_creacion + segundos_transcurridos,
        ):
            identificador = obtener_id_token(token)
            vigente = validar_token_recuperacion(token, usuario)

    assert vigente is sigue_vigente
    assert identificador == (AGRICULTOR if sigue_vigente else None)


@pytest.mark.regla_negocio
def test_aut10_recuperacion_no_revela_cuentas_y_limita_solicitudes(client, correos):
    """AUT-10 | La recuperación no enumera usuarios y limita a 3 correos por hora.

    Entrada: 1 solicitud con un correo inexistente y 4 solicitudes con uno existente.
    Esperado: todas responden 200 con el mismo mensaje; solo se envían 3 correos.
    """
    inexistente = client.post(
        "/api/auth/recuperar-password", json={"correo": "nadie@example.test"}
    )
    assert inexistente.status_code == 200
    assert inexistente.get_json() == {"mensaje": MENSAJE_GENERICO}
    correos.recuperacion.assert_not_called()

    respuestas = [
        client.post("/api/auth/recuperar-password", json={"correo": correo_de(ADMIN)})
        for _ in range(4)
    ]

    assert [r.status_code for r in respuestas] == [200, 200, 200, 200]
    assert all(r.get_json() == {"mensaje": MENSAJE_GENERICO} for r in respuestas)
    assert correos.recuperacion.call_count == 3


@pytest.mark.caso_error
@pytest.mark.defecto_conocido
@pytest.mark.xfail(
    strict=True,
    reason="DEF-01: login sin contraseña provoca un error 500 (auth_routes.login "
           "pasa None a check_password)",
)
def test_aut11_login_sin_password_no_debe_fallar_con_500(app, client):
    """AUT-11 | Login sin el campo password (defecto detectado DEF-01).

    Entrada: cuerpo JSON con un correo existente y sin contraseña.
    Esperado: 401 «credenciales inválidas»; actualmente el servidor responde 500.
    """
    app.config["PROPAGATE_EXCEPTIONS"] = False

    respuesta = client.post("/api/auth/login", json={"correo": correo_de(ADMIN)})

    assert respuesta.status_code == 401
