"""Regresiones de integración. Ejecutar desde backend: python -m unittest discover -s tests -v.

Cada prueba usa SQLite en memoria y el cliente Flask. No necesita MySQL,
InfluxDB, correo, dispositivos ni credenciales reales.
"""

import json
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import AlertaEnviada, Nodo, Parcela, Usuario
from app.utils.password_reset import version_credencial


class IntegracionTest(unittest.TestCase):
    PASSWORD = "Clave-solo-para-pruebas-2026"

    @classmethod
    def setUpClass(cls):
        cls.password_hash = generate_password_hash(cls.PASSWORD)

    def setUp(self):
        with patch.multiple(
            Config,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SECRET_KEY="clave-aislada-de-pruebas-sin-uso-real",
            JWT_SECRET_KEY="jwt-aislado-de-pruebas-sin-uso-real",
            INFLUXDB_URL="http://127.0.0.1:9",
            INFLUXDB_TOKEN="",
        ):
            self.app = create_app()
        self.app.config.update(TESTING=True)
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()
            for usuario_id, rol in ((1, "admin"), (2, "admin"),
                                    (3, "agricultor"), (4, "agricultor")):
                db.session.add(Usuario(
                    id=usuario_id,
                    nombre=f"Usuario de prueba {usuario_id}",
                    correo=f"usuario{usuario_id}@example.test",
                    password_hash=self.password_hash,
                    rol=rol,
                    activo=True,
                ))
            db.session.commit()
            self.tokens = {
                usuario_id: create_access_token(
                    identity=str(usuario_id),
                    additional_claims={
                        "rol": rol,
                        "credencial_ver": version_credencial(
                            db.session.get(Usuario, usuario_id)),
                    },
                )
                for usuario_id, rol in ((1, "admin"), (2, "admin"),
                                        (3, "agricultor"), (4, "agricultor"))
            }

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()

    def headers(self, usuario_id=1, token=None):
        return {"Authorization": f"Bearer {token or self.tokens[usuario_id]}"}

    def login(self, usuario_id):
        return self.client.post("/api/auth/login", json={
            "correo": f"usuario{usuario_id}@example.test",
            "password": self.PASSWORD,
        })

    def crear_parcela(self, usuario_id=3):
        respuesta = self.client.post(
            "/api/parcelas", headers=self.headers(usuario_id),
            json={"nombre": "Parcela de prueba", "ubicacion": "29.086200, -110.951200"},
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.get_json())
        return respuesta.get_json()["id"]

    def crear_nodo(self, parcela_id, usuario_id=3):
        respuesta = self.client.post(
            "/api/nodos", headers=self.headers(usuario_id),
            json={"parcela_id": parcela_id, "identificador": f"sensor-{parcela_id}",
                  "tipo": "sensor_suelo"},
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.get_json())
        return respuesta.get_json()["id"]

    def test_salud_login_y_logout(self):
        self.assertEqual(self.client.get("/api/health").get_json(), {"status": "ok"})
        login = self.login(1)
        self.assertEqual(login.status_code, 200)
        headers = self.headers(token=login.get_json()["access_token"])
        self.assertEqual(self.client.get("/api/usuarios", headers=headers).status_code, 200)
        self.assertEqual(self.client.post("/api/auth/logout", headers=headers).status_code, 200)
        self.assertEqual(self.client.get("/api/usuarios", headers=headers).status_code, 401)

    def test_agricultor_no_administra_usuarios(self):
        self.assertEqual(self.client.get("/api/usuarios", headers=self.headers(3)).status_code, 403)
        self.assertEqual(self.client.post("/api/usuarios", headers=self.headers(3), json={}).status_code, 403)
        self.assertEqual(self.client.put("/api/usuarios/2", headers=self.headers(3), json={"activo": False}).status_code, 403)

    def test_desactivar_cuenta_invalida_sesion_abierta(self):
        respuesta = self.client.put("/api/usuarios/2", headers=self.headers(), json={"activo": False})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(self.client.get("/api/usuarios", headers=self.headers(2)).status_code, 401)
        self.assertEqual(self.client.get("/api/parcelas", headers=self.headers(2)).status_code, 401)
        self.assertEqual(self.login(2).status_code, 401)

    def test_quitar_rol_admin_invalida_token_anterior(self):
        respuesta = self.client.put("/api/usuarios/2", headers=self.headers(), json={"rol": "agricultor"})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(self.client.get("/api/usuarios", headers=self.headers(2)).status_code, 401)
        login = self.login(2)
        self.assertEqual(login.status_code, 200)
        headers = self.headers(token=login.get_json()["access_token"])
        self.assertEqual(self.client.get("/api/usuarios", headers=headers).status_code, 403)
        self.assertEqual(self.client.get("/api/parcelas", headers=headers).status_code, 200)

    def test_promocion_exige_nuevo_token(self):
        respuesta = self.client.put("/api/usuarios/3", headers=self.headers(), json={"rol": "admin"})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(self.client.get("/api/usuarios", headers=self.headers(3)).status_code, 401)
        login = self.login(3)
        self.assertEqual(login.status_code, 200)
        headers = self.headers(token=login.get_json()["access_token"])
        self.assertEqual(self.client.get("/api/usuarios", headers=headers).status_code, 200)

    def test_identidad_invalida_o_usuario_inexistente_no_produce_500(self):
        for identidad in ("sin-id", "0", "-1", "99999", str(10**100)):
            with self.subTest(identidad=identidad):
                with self.app.app_context():
                    token = create_access_token(identity=identidad, additional_claims={"rol": "admin"})
                self.assertEqual(self.client.get("/api/usuarios", headers=self.headers(token=token)).status_code, 401)

    def test_admin_no_puede_desactivarse_ni_quitarse_su_rol(self):
        for datos in ({"activo": False}, {"rol": "agricultor"}):
            with self.subTest(datos=datos):
                self.assertEqual(self.client.put("/api/usuarios/1", headers=self.headers(), json=datos).status_code, 400)
        self.assertEqual(self.client.get("/api/usuarios", headers=self.headers()).status_code, 200)

    def test_altas_y_edicion_rechazan_json_que_no_es_objeto(self):
        for metodo, ruta in (("POST", "/api/usuarios"), ("PUT", "/api/usuarios/2")):
            for cuerpo in (None, [], ["nombre"], [{"nombre": "Texto"}], True, 42, "texto"):
                with self.subTest(metodo=metodo, cuerpo=cuerpo):
                    respuesta = self.client.open(
                        ruta, method=metodo, headers=self.headers(),
                        data=json.dumps(cuerpo), content_type="application/json",
                    )
                    self.assertEqual(respuesta.status_code, 400)
            respuesta = self.client.open(
                ruta, method=metodo, headers=self.headers(),
                data="{", content_type="application/json",
            )
            self.assertEqual(respuesta.status_code, 400)
        with self.app.app_context():
            self.assertEqual(Usuario.query.count(), 4)
            self.assertEqual(db.session.get(Usuario, 2).nombre, "Usuario de prueba 2")

    def test_limite_correo_150_en_altas_y_edicion(self):
        dominio = "b" * 40 + "." + "c" * 43 + ".test"
        correo_150 = "a" * 60 + "@" + dominio
        correo_151 = "a" * 61 + "@" + dominio
        datos = {"nombre": "Nuevo usuario", "correo": correo_151,
                 "password": self.PASSWORD, "rol": "agricultor"}
        self.assertEqual(self.client.post("/api/usuarios", headers=self.headers(), json=datos).status_code, 400)
        self.assertEqual(self.client.put("/api/usuarios/2", headers=self.headers(), json={"correo": correo_151}).status_code, 400)
        datos["correo"] = correo_150
        respuesta = self.client.post("/api/usuarios", headers=self.headers(), json=datos)
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.get_json()["correo"], correo_150)
        otro_correo_150 = "d" * 60 + "@" + dominio
        respuesta = self.client.put("/api/usuarios/2", headers=self.headers(), json={"correo": otro_correo_150})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.get_json()["correo"], otro_correo_150)

    def test_alta_edicion_y_duplicados_no_exponen_contrasena(self):
        datos = {"nombre": "Nuevo usuario", "correo": "nuevo@example.test",
                 "password": self.PASSWORD, "rol": "agricultor"}
        respuesta = self.client.post("/api/usuarios", headers=self.headers(), json=datos)
        self.assertEqual(respuesta.status_code, 201)
        creado = respuesta.get_json()
        self.assertNotIn("password", creado)
        self.assertNotIn("password_hash", creado)
        self.assertEqual(self.client.post("/api/usuarios", headers=self.headers(), json=datos).status_code, 409)
        respuesta = self.client.put(f"/api/usuarios/{creado['id']}", headers=self.headers(), json={"nombre": "Nombre actualizado"})
        self.assertEqual(respuesta.status_code, 200)
        with self.app.app_context():
            usuario = db.session.get(Usuario, creado["id"])
            self.assertEqual(usuario.nombre, "Nombre actualizado")
            self.assertNotEqual(usuario.password_hash, self.PASSWORD)
            self.assertTrue(usuario.check_password(self.PASSWORD))

    def test_crud_parcela_y_nodos_preserva_dependencias(self):
        parcela_id = self.crear_parcela()
        nodo_id = self.crear_nodo(parcela_id)
        respuesta = self.client.put(f"/api/parcelas/{parcela_id}", headers=self.headers(), json={"nombre": "Editada por admin"})
        self.assertEqual(respuesta.status_code, 200)
        respuesta = self.client.put(f"/api/nodos/{nodo_id}", headers=self.headers(3), json={"estado": "mantenimiento"})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(self.client.delete(f"/api/parcelas/{parcela_id}", headers=self.headers(3)).status_code, 409)
        self.assertEqual(self.client.delete(f"/api/nodos/{nodo_id}", headers=self.headers(3)).status_code, 200)
        with self.app.app_context():
            self.assertEqual(db.session.get(Nodo, nodo_id).estado, "inactivo")
            self.assertIsNotNone(db.session.get(Parcela, parcela_id))
        vacia = self.crear_parcela()
        self.assertEqual(self.client.delete(f"/api/parcelas/{vacia}", headers=self.headers()).status_code, 200)

    def test_aislamiento_de_parcelas_y_nodos(self):
        propia = self.crear_parcela(3)
        ajena = self.crear_parcela(4)
        nodo_id = self.crear_nodo(propia)
        parcelas = self.client.get("/api/parcelas", headers=self.headers(3)).get_json()
        self.assertEqual([p["id"] for p in parcelas], [propia])
        self.assertEqual(self.client.get("/api/nodos", headers=self.headers(4)).get_json(), [])
        self.assertEqual(self.client.put(f"/api/parcelas/{propia}", headers=self.headers(4), json={"nombre": "Ajena"}).status_code, 404)
        self.assertEqual(self.client.delete(f"/api/parcelas/{propia}", headers=self.headers(4)).status_code, 404)
        self.assertEqual(self.client.post("/api/nodos", headers=self.headers(4), json={"parcela_id": propia, "identificador": "otro"}).status_code, 403)
        self.assertEqual(self.client.put(f"/api/nodos/{nodo_id}", headers=self.headers(4), json={"estado": "inactivo"}).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/nodos/{nodo_id}", headers=self.headers(4)).status_code, 403)
        self.assertEqual(self.client.put(f"/api/nodos/{nodo_id}", headers=self.headers(3), json={"parcela_id": ajena}).status_code, 403)
        with self.app.app_context():
            nodo = db.session.get(Nodo, nodo_id)
            self.assertEqual((nodo.parcela_id, nodo.estado), (propia, "activo"))

    def test_historial_alertas_limita_y_respeta_propiedad(self):
        parcela_id = self.crear_parcela()
        inicio = datetime(2026, 1, 1)
        with self.app.app_context():
            for indice in range(31):
                db.session.add(AlertaEnviada(
                    parcela_id=parcela_id, tipo_alerta="suelo_seco",
                    valor_detectado=20.0, umbral=30.0, mensaje="Prueba local",
                    fecha_deteccion=inicio + timedelta(minutes=indice),
                ))
            db.session.commit()
        ruta = f"/api/alertas/historial?parcela_id={parcela_id}"
        self.assertEqual(self.client.get(ruta, headers=self.headers(4)).status_code, 403)
        respuesta = self.client.get(ruta, headers=self.headers(3))
        self.assertEqual(respuesta.status_code, 200)
        alertas = respuesta.get_json()["alertas"]
        self.assertEqual(len(alertas), 30)
        self.assertEqual([a["id"] for a in alertas], list(range(31, 1, -1)))
        self.assertTrue(alertas[0]["fecha_deteccion"].endswith("Z"))

    def test_reportes_rechazan_acceso_ajeno_y_fechas_invalidas(self):
        parcela_id = self.crear_parcela()
        ruta = f"/api/reportes/{parcela_id}"
        with patch("app.routes.reportes_routes.generar_reporte_parcela") as generar:
            self.assertEqual(self.client.get(ruta, headers=self.headers(4)).status_code, 403)
            self.assertEqual(self.client.get(ruta, headers=self.headers(3)).status_code, 400)
            self.assertEqual(self.client.get(ruta + "?inicio=2026-01-01&fin=2026-01-02", headers=self.headers(3)).status_code, 400)
            generar.assert_not_called()


    # ---- Validadores compartidos (PRUEBAS.md, Parte C) ----
    def test_validadores_unitarios_parte_c(self):
        from app.utils import validaciones as v
        for malo in ("...", "..", "  ", "a", "123", "Juan  Pérez", " -Ana"):
            self.assertIsNotNone(v.validar_nombre_persona(malo)[1], malo)
        for bueno in ("Juan Pérez", "María José", "O'Neil", "  Ñoño Muñoz  "):
            self.assertIsNone(v.validar_nombre_persona(bueno)[1], bueno)
        for malo in (" clave1234567", "clave1234567 ", "corta1", "solamenteletras", "123456789012"):
            self.assertIsNotNone(v.validar_password(malo)[1], repr(malo))
        self.assertIsNone(v.validar_password("Clave segura 2026")[1])
        for malo in (".#", "315656320...", "", "   "):
            self.assertIsNotNone(v.validar_nombre_parcela(malo)[1], malo)
        for bueno in ("Parcela Norte", "Lote 3 Sur", "Parcela 3 Norte"):
            self.assertIsNone(v.validar_nombre_parcela(bueno)[1], bueno)
        for malo in ("fhvgggggggvhvgh", "guvjhbnmgh bjkb", "95, 20", "29.08", "abc, -110", "10, 200"):
            self.assertIsNotNone(v.validar_coordenadas(malo)[1], malo)
        self.assertEqual(v.validar_coordenadas("29.0862,-110.9512"), ("29.086200, -110.951200", None))
        self.assertEqual(v.validar_coordenadas(""), (None, None))
        for malo in ("sdfewfew", "a@", "@dominio.com", "a@b"):
            self.assertIsNotNone(v.validar_correo(malo, opcional=True)[1], malo)
        self.assertEqual(v.validar_correo("", opcional=True), (None, None))
        self.assertEqual(v.validar_correo("Usuario@Dominio.com"), ("usuario@dominio.com", None))

    def test_api_rechaza_nombres_y_contrasenas_invalidos(self):
        for nombre in ("...", "..", "123"):
            r = self.client.patch("/api/auth/perfil", headers=self.headers(3), json={"nombre": nombre})
            self.assertEqual(r.status_code, 400, nombre)
        r = self.client.patch("/api/auth/perfil", headers=self.headers(3), json={"nombre": "María José"})
        self.assertEqual(r.status_code, 200, r.get_json())
        base = {"correo": "nuevo2@example.test", "rol": "admin", "password": "Clave segura 2026"}
        self.assertEqual(self.client.post("/api/usuarios", headers=self.headers(), json={**base, "nombre": "..."}).status_code, 400)
        for clave in (" Clave segura 2026", "Clave segura 2026 ", "corta1"):
            r = self.client.post("/api/usuarios", headers=self.headers(), json={**base, "nombre": "Juan Pérez", "password": clave})
            self.assertEqual(r.status_code, 400, repr(clave))
        r = self.client.post("/api/usuarios", headers=self.headers(), json={**base, "nombre": "O'Neil"})
        self.assertEqual(r.status_code, 201, r.get_json())
        r = self.client.put(f"/api/usuarios/{r.get_json()['id']}", headers=self.headers(), json={"nombre": ".."})
        self.assertEqual(r.status_code, 400)
        r = self.client.patch("/api/auth/password", headers=self.headers(3),
                              json={"password_actual": self.PASSWORD, "password_nueva": " Clave segura 2026"})
        self.assertEqual(r.status_code, 400)

    def test_api_rechaza_parcelas_y_coordenadas_invalidas(self):
        for cuerpo in ({"nombre": ".#"}, {"nombre": "315656320..."}, {"nombre": ""},
                       {"nombre": "Lote 3 Sur", "ubicacion": "fhvgggggggvhvgh"},
                       {"nombre": "Lote 3 Sur", "ubicacion": "95, 20"},
                       {"nombre": "Lote 3 Sur", "ubicacion": "29.08"}):
            r = self.client.post("/api/parcelas", headers=self.headers(3), json=cuerpo)
            self.assertEqual(r.status_code, 400, cuerpo)
        r = self.client.post("/api/parcelas", headers=self.headers(3),
                             json={"nombre": "Lote 3 Sur", "ubicacion": "29.0862,-110.9512"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.get_json()["ubicacion"], "29.086200, -110.951200")
        parcela_id = r.get_json()["id"]
        r = self.client.put(f"/api/parcelas/{parcela_id}", headers=self.headers(3),
                            json={"nombre": "Parcela Norte", "ubicacion": "abc, -110"})
        self.assertEqual(r.status_code, 400)
        with self.app.app_context():
            self.assertEqual(db.session.get(Parcela, parcela_id).nombre, "Lote 3 Sur")

    def test_api_rechaza_correo_destino_invalido(self):
        parcela_id = self.crear_parcela()
        base = {"parcela_id": parcela_id, "humedad_suelo_min": 30, "temperatura_min": 5,
                "activa": True, "cooldown_minutos": 30}
        for correo in ("sdfewfew", "a@", "@dominio.com"):
            r = self.client.post("/api/alertas/config", headers=self.headers(3), json={**base, "correo_destino": correo})
            self.assertEqual(r.status_code, 400, correo)
        for correo in ("", None, "usuario@dominio.com"):
            r = self.client.post("/api/alertas/config", headers=self.headers(3), json={**base, "correo_destino": correo})
            self.assertIn(r.status_code, (200, 201), (correo, r.get_json()))


if __name__ == "__main__":
    unittest.main()
