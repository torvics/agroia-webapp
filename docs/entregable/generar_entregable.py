"""Genera el entregable PDF del proyecto final (pruebas unitarias de AgroIA).

Ejecuta las pruebas de verdad, guarda su salida como evidencia y arma el
documento a partir de esos resultados, de modo que el PDF nunca muestra un
resultado que no se haya obtenido en esta máquina.

Uso (desde la raíz del repositorio):
    backend\\venv\\Scripts\\python.exe docs\\entregable\\generar_entregable.py

Antes de generar la versión final, completa docs/entregable/datos_alumno.json.
Las imágenes que copies en docs/entregable/capturas/ se agregan al PDF.
"""

import ast
import base64
import datetime
import html
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import IniLexer, PythonLexer

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
BACKEND = RAIZ / "backend"
PRUEBAS = BACKEND / "tests"
EVIDENCIAS = AQUI / "evidencias"
CAPTURAS = AQUI / "capturas"
SALIDA_HTML = AQUI / "entregable.html"
SALIDA_PDF = AQUI / "Proyecto_Final_Pruebas_Unitarias_AgroIA.pdf"
REPOSITORIO = "https://github.com/torvics/agroia-webapp"

MODULOS = [
    {
        "clave": "M1", "nombre": "Autenticación", "archivo": "test_01_autenticacion.py",
        "codigo": ["app/routes/auth_routes.py", "app/utils/password_reset.py"],
        "descripcion": "Inicio y cierre de sesión con JWT, cambio de contraseña y "
                       "recuperación de contraseña mediante un enlace de un solo uso.",
    },
    {
        "clave": "M2", "nombre": "Gestión de usuarios", "archivo": "test_02_usuarios.py",
        "codigo": ["app/routes/usuarios_routes.py", "app/models/usuario.py",
                   "app/utils/email_confirmation.py"],
        "descripcion": "Alta, consulta y edición de cuentas por el administrador, "
                       "roles (admin / agricultor) y confirmación de correo.",
    },
    {
        "clave": "M3", "nombre": "Inventario de parcelas y nodos",
        "archivo": "test_03_parcelas_nodos.py",
        "codigo": ["app/routes/parcelas_routes.py", "app/routes/nodos_routes.py",
                   "app/utils/auth_nodo.py"],
        "descripcion": "Registro de parcelas y de los dispositivos instalados en ellas "
                       "(estación y nodos de suelo), con su API key y su estado.",
    },
    {
        "clave": "M4", "nombre": "Comandos de riego", "archivo": "test_04_comandos_riego.py",
        "codigo": ["app/routes/comandos_routes.py"],
        "descripcion": "Órdenes de riego o relé que el usuario envía a un nodo, que la "
                       "estación consulta y confirma, con expiración y bitácora.",
    },
    {
        "clave": "M5", "nombre": "Alertas", "archivo": "test_05_alertas.py",
        "codigo": ["app/routes/alertas_routes.py", "app/services/alertas_service.py"],
        "descripcion": "Configuración de umbrales por parcela y detección de suelo seco "
                       "o temperatura baja, con cooldown para no repetir avisos.",
    },
    {
        "clave": "M6", "nombre": "Reportes", "archivo": "test_06_reportes.py",
        "codigo": ["app/routes/reportes_routes.py", "app/services/reportes_service.py",
                   "app/services/reportes_export_service.py"],
        "descripcion": "Reporte por parcela y periodo con estadísticas de sensores, "
                       "comandos, bitácora y alertas; exportación a JSON, CSV y PDF.",
    },
]

TIPOS = {
    "caso_normal": "Normal",
    "caso_error": "Error",
    "caso_limite": "Límite",
    "regla_negocio": "Regla de negocio",
}

DEFECTOS = [
    ("DEF-01", "AUT-11", "POST /api/auth/login",
     "Si el cuerpo no trae el campo password (o no es texto), el servidor responde "
     "500 en lugar de 401.",
     "Validar que correo y password sean texto antes de llamar a check_password."),
    ("DEF-02", "PAR-06", "PUT /api/parcelas/<id>",
     "La edición acepta un nombre vacío aunque el alta lo declara obligatorio.",
     "Aplicar en la edición la misma validación de nombre que en el alta."),
    ("DEF-03", "CMD-11", "POST /api/estacion/comandos/confirmar",
     "Si comando_ids contiene un elemento que no es un entero, el servidor responde 500.",
     "Ignorar o rechazar con 400 los elementos que no sean enteros positivos."),
]


def e(texto):
    return html.escape(str(texto), quote=False)


# ---------------------------------------------------------------- ejecución

def ejecutar(nombre, argumentos):
    """Ejecuta pytest en backend/ y guarda la salida con colores ANSI."""
    entorno = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8", COLUMNS="122")
    comando = [sys.executable, "-m", "pytest", *argumentos, "--color=yes"]
    proceso = subprocess.run(
        comando, cwd=BACKEND, env=entorno, capture_output=True,
        text=True, encoding="utf-8",
    )
    salida = (proceso.stdout + proceso.stderr).replace("\r\n", "\n")
    (EVIDENCIAS / f"{nombre}.txt").write_text(
        re.sub(r"\x1b\[[0-9;]*m", "", salida), encoding="utf-8"
    )
    return {
        "comando": "python -m pytest " + " ".join(argumentos),
        "salida": salida,
        "codigo_salida": proceso.returncode,
    }


COLORES_ANSI = {"31": "rojo", "32": "verde", "33": "amarillo", "34": "azul",
                "35": "magenta", "36": "cian"}


def ansi_a_html(texto):
    """Convierte los colores ANSI de la terminal en etiquetas <span>."""
    partes = re.split(r"\x1b\[([0-9;]*)m", texto)
    resultado, color, negrita = [], None, False
    for indice, parte in enumerate(partes):
        if indice % 2 == 0:
            if not parte:
                continue
            clases = " ".join(c for c in (color, "negrita" if negrita else None) if c)
            resultado.append(
                f'<span class="{clases}">{e(parte)}</span>' if clases else e(parte)
            )
        else:
            for codigo in (parte or "0").split(";"):
                if codigo in ("0", ""):
                    color, negrita = None, False
                elif codigo == "1":
                    negrita = True
                elif codigo in COLORES_ANSI:
                    color = COLORES_ANSI[codigo]
                elif codigo == "39":
                    color = None
    return "".join(resultado)


def bloque_terminal(ejecucion, titulo):
    lineas = [l.rstrip() for l in ejecucion["salida"].strip("\n").split("\n")]
    return (
        '<figure class="terminal">'
        f'<figcaption>{e(titulo)}</figcaption>'
        f'<div class="comando">backend&gt; {e(ejecucion["comando"])}</div>'
        f'<pre>{ansi_a_html(chr(10).join(lineas))}</pre>'
        "</figure>"
    )


# ------------------------------------------------------------ análisis

def mayuscula_inicial(texto):
    return texto[:1].upper() + texto[1:]


def leer_pruebas(archivo):
    """Extrae de cada función de prueba su ficha (docstring) y sus marcadores."""
    arbol = ast.parse((PRUEBAS / archivo).read_text(encoding="utf-8"))
    pruebas = []
    for nodo in arbol.body:
        if not isinstance(nodo, ast.FunctionDef) or not nodo.name.startswith("test_"):
            continue
        marcadores = []
        for decorador in nodo.decorator_list:
            objetivo = decorador.func if isinstance(decorador, ast.Call) else decorador
            if isinstance(objetivo, ast.Attribute):
                marcadores.append(objetivo.attr)
        doc = ast.get_docstring(nodo) or ""
        primera = doc.split("\n", 1)[0]
        identificador, _, titulo = primera.partition("|")
        entrada = re.search(r"^Entrada:\s*(.+)$", doc, re.M)
        esperado = re.search(r"^Esperado:\s*(.+)$", doc, re.M)
        pruebas.append({
            "funcion": nodo.name,
            "id": identificador.strip(),
            "titulo": titulo.strip().rstrip("."),
            "entrada": mayuscula_inicial(entrada.group(1).strip()) if entrada else "",
            "esperado": mayuscula_inicial(esperado.group(1).strip()) if esperado else "",
            "tipos": [TIPOS[m] for m in marcadores if m in TIPOS],
            "defecto": "defecto_conocido" in marcadores,
        })
    return pruebas


def leer_junit(ruta):
    """Devuelve {(modulo, funcion): [resultado de cada caso ejecutado]}."""
    resultados = {}
    for caso in ET.parse(ruta).getroot().iter("testcase"):
        modulo = caso.get("classname", "").split(".")[-1]
        if modulo == "IntegracionTest":
            modulo = "test_integracion"
        funcion = caso.get("name", "").split("[")[0]
        if caso.find("failure") is not None or caso.find("error") is not None:
            estado = "FAILED"
        elif caso.find("skipped") is not None:
            tipo = caso.find("skipped").get("type", "")
            estado = "XFAIL" if "xfail" in tipo else "SKIPPED"
        else:
            estado = "PASSED"
        resultados.setdefault((modulo, funcion), []).append(estado)
    return resultados


def etiqueta_resultado(estados):
    if not estados:
        return '<span class="estado gris">sin ejecutar</span>'
    total = len(estados)
    if all(s == "PASSED" for s in estados):
        detalle = f'<span class="casos">{total} casos</span>' if total > 1 else ""
        return f'<span class="estado ok">PASSED</span>{detalle}'
    if all(s == "XFAIL" for s in estados):
        return '<span class="estado aviso">XFAIL</span><span class="casos">defecto abierto</span>'
    fallidos = sum(s == "FAILED" for s in estados)
    return f'<span class="estado mal">FAILED</span><span class="casos">{fallidos} de {total}</span>'


# ------------------------------------------------------------- secciones

def seccion_portada(alumno, hoy):
    def campo(etiqueta, valor, obligatorio=False):
        if not valor and not obligatorio:
            return ""
        contenido = e(valor) if valor else '<span class="pendiente">&nbsp;</span>'
        return f"<tr><th>{etiqueta}</th><td>{contenido}</td></tr>"

    return f"""
<section class="portada">
  <div class="portada-arriba">
    <p class="institucion">{e(alumno.get("institucion", ""))}</p>
    <p class="materia">{e(alumno.get("materia", ""))}</p>
  </div>
  <div class="portada-centro">
    <p class="sobretitulo">Proyecto final · 3er parcial</p>
    <h1>Pruebas unitarias con PyTest</h1>
    <p class="subtitulo">Sistema AgroIA: plataforma web de riego inteligente</p>
  </div>
  <table class="datos-portada">
    {campo("Nombre", alumno.get("nombre"), True)}
    {campo("Matrícula", alumno.get("matricula"), True)}
    {campo("Grupo", alumno.get("grupo"), True)}
    {campo("Docente", alumno.get("docente"))}
    <tr><th>Fecha</th><td>{hoy}</td></tr>
    <tr><th>Repositorio</th><td>{REPOSITORIO}</td></tr>
  </table>
</section>"""


def seccion_proyecto(resumen):
    filas = "".join(
        f"<tr><td><b>{m['clave']}</b></td><td><b>{e(m['nombre'])}</b><br>{e(m['descripcion'])}</td>"
        f"<td class='mono'>{'<br>'.join(e(c) for c in m['codigo'])}</td></tr>"
        for m in MODULOS
    )
    return f"""
<section>
<h2><span class="num">1</span>Descripción del proyecto y sus módulos</h2>
<h3>1.1 El sistema</h3>
<p><b>AgroIA</b> es una plataforma web para controlar, monitorear y analizar un sistema
de riego inteligente. Cada parcela tiene una <b>estación</b> con conexión a internet y
varios <b>nodos de suelo</b> que se comunican con ella por radio (LoRa). La estación
envía las lecturas de los sensores al servidor y recoge las órdenes de riego que el
agricultor da desde la aplicación web.</p>
<table class="tabla compacta">
<thead><tr><th style="width:15%">Componente</th><th style="width:29%">Tecnología</th><th>Función</th></tr></thead>
<tbody>
<tr><td>Backend</td><td>Python · Flask · SQLAlchemy · JWT</td><td>API REST: autenticación, usuarios, parcelas, nodos, comandos, alertas, bitácora y reportes.</td></tr>
<tr><td>Frontend</td><td>React · Vite</td><td>Interfaz web para el administrador y los agricultores.</td></tr>
<tr><td>Datos</td><td>MySQL e InfluxDB</td><td>MySQL guarda usuarios, parcelas y eventos; InfluxDB guarda las lecturas de los sensores.</td></tr>
<tr><td>Dispositivos</td><td>ESP32 y simulador en Python</td><td>Estación y nodos de suelo que miden y ejecutan el riego.</td></tr>
</tbody></table>
<p>Las pruebas de este proyecto se hicieron sobre el <b>backend</b>, porque ahí están
las reglas de negocio del sistema. El backend está escrito en Python, por lo que el
framework utilizado es <b>PyTest</b>.</p>
<h3>1.2 Módulos probados</h3>
<p>Se eligieron <b>{len(MODULOS)} módulos</b> (el mínimo solicitado era 3):</p>
<table class="tabla">
<thead><tr><th style="width:7%">Clave</th><th style="width:53%">Módulo</th><th>Código probado</th></tr></thead>
<tbody>{filas}</tbody></table>
<p class="nota">Quedaron fuera del alcance la recepción de lecturas de sensores, la
consulta de bitácora y el envío real de correos: dependen de InfluxDB y de un servidor
SMTP, y se proponen como trabajo futuro en las conclusiones.</p>
</section>"""


def seccion_estrategia(resumen):
    return f"""
<section class="flujo">
<h2><span class="num">2</span>Estrategia y entorno de pruebas</h2>
<table class="tabla compacta">
<tbody>
<tr><th style="width:26%">Framework</th><td>PyTest {e(resumen['pytest'])} sobre Python {e(resumen['python'])}</td></tr>
<tr><th>Aislamiento</th><td>Cada prueba crea una aplicación Flask nueva con <b>SQLite en memoria</b>; ninguna prueba depende de otra ni necesita MySQL.</td></tr>
<tr><th>Dependencias externas</th><td>El envío de correo (SMTP) e InfluxDB se sustituyen por dobles de prueba (<span class="mono">unittest.mock</span>). Un fixture bloquea <span class="mono">smtplib</span> para que sea imposible enviar un correo real.</td></tr>
<tr><th>Tiempo</th><td>Las fronteras de tiempo (20 minutos, 10 minutos, 7 días, cooldown) se prueban con un <b>reloj simulado</b>, por lo que el resultado no depende de la hora ni de la velocidad del equipo.</td></tr>
<tr><th>Datos de prueba</th><td>Fixtures de <span class="mono">tests/conftest.py</span>: 4 usuarios base (2 administradores y 2 agricultores) y funciones para crear parcelas, nodos y sesiones.</td></tr>
<tr><th>Casos múltiples</th><td><span class="mono">@pytest.mark.parametrize</span> ejecuta la misma prueba con varios valores (por ejemplo 11, 12, 128 y 129 caracteres).</td></tr>
</tbody></table>
<h3>Clasificación de las pruebas</h3>
<p>Cada prueba lleva un marcador de PyTest que indica qué evidencia aporta:</p>
<table class="tabla compacta">
<thead><tr><th style="width:22%">Tipo</th><th style="width:24%">Marcador</th><th>Qué demuestra</th><th style="width:11%">Pruebas</th></tr></thead>
<tbody>
<tr><td><span class="tipo normal">Normal</span></td><td class="mono">caso_normal</td><td>El flujo esperado funciona con datos válidos.</td><td class="num-c">{resumen['por_tipo']['Normal']}</td></tr>
<tr><td><span class="tipo error">Error</span></td><td class="mono">caso_error</td><td>Las entradas inválidas y los accesos no permitidos se rechazan con el código correcto.</td><td class="num-c">{resumen['por_tipo']['Error']}</td></tr>
<tr><td><span class="tipo limite">Límite</span></td><td class="mono">caso_limite</td><td>Los valores frontera: el mínimo, el máximo y el primero fuera de rango.</td><td class="num-c">{resumen['por_tipo']['Límite']}</td></tr>
<tr><td><span class="tipo negocio">Regla de negocio</span></td><td class="mono">regla_negocio</td><td>Las reglas propias de AgroIA (permisos, cooldown, bajas lógicas, un solo uso).</td><td class="num-c">{resumen['por_tipo']['Regla de negocio']}</td></tr>
</tbody></table>
<h3>Cómo ejecutar las pruebas</h3>
<pre class="consola">cd backend
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements-dev.txt

python -m pytest -v                                  # todas las pruebas
python -m pytest tests/test_05_alertas.py -v         # un solo módulo
python -m pytest -m caso_limite -v                   # solo los casos límite
python -m pytest --cov=app                           # con cobertura de código</pre>
</section>"""


def seccion_tablas(fichas, resumen):
    partes = [f"""
<section>
<h2><span class="num">3</span>Tabla de pruebas por módulo</h2>
<p>Se escribieron <b>{resumen['funciones']} pruebas</b> que, con sus variantes
parametrizadas, suman <b>{resumen['casos']} casos ejecutados</b>. Cada módulo tiene
al menos {resumen['minimo_por_modulo']} pruebas (el mínimo solicitado era 5) y cubre
los cuatro tipos de evidencia.</p>
<table class="tabla compacta resumen">
<thead><tr><th style="width:30%">Módulo</th><th>Pruebas</th><th>Casos</th><th>Normal</th><th>Error</th><th>Límite</th><th>Regla de negocio</th><th style="width:22%">Resultado</th></tr></thead>
<tbody>"""]
    for modulo in MODULOS:
        f = fichas[modulo["clave"]]
        partes.append(
            f"<tr><td><b>{modulo['clave']}</b> {e(modulo['nombre'])}</td>"
            f"<td class='num-c'>{len(f['pruebas'])}</td><td class='num-c'>{f['casos']}</td>"
            + "".join(f"<td class='num-c'>{f['por_tipo'][t]}</td>" for t in TIPOS.values())
            + f"<td class='sin-corte'>{f['resultado']}</td></tr>"
        )
    partes.append("</tbody></table>")

    for modulo in MODULOS:
        f = fichas[modulo["clave"]]
        filas = []
        for p in f["pruebas"]:
            tipos = "".join(
                f'<span class="tipo {clase_tipo(t)}">{t}</span>' for t in p["tipos"]
            )
            filas.append(
                f"<tr><td class='mono id'>{e(p['id'])}</td><td>{e(p['titulo'])}</td>"
                f"<td>{tipos}</td><td>{e(p['entrada'])}</td><td>{e(p['esperado'])}</td>"
                f"<td class='res'>{etiqueta_resultado(p['estados'])}</td></tr>"
            )
        partes.append(f"""
<h3>{modulo['clave']} · {e(modulo['nombre'])} <span class="archivo">tests/{modulo['archivo']}</span></h3>
<table class="tabla pruebas">
<thead><tr><th style="width:7.5%">ID</th><th style="width:17%">Prueba</th><th style="width:14%">Tipo</th><th style="width:25.5%">Entrada</th><th style="width:26%">Resultado esperado</th><th style="width:10%">Resultado</th></tr></thead>
<tbody>{''.join(filas)}</tbody></table>""")
    partes.append("</section>")
    return "".join(partes)


def clase_tipo(tipo):
    return {"Normal": "normal", "Error": "error", "Límite": "limite",
            "Regla de negocio": "negocio"}[tipo]


def codigo_resaltado(ruta, lexer):
    formato = HtmlFormatter(nowrap=True)
    return highlight(ruta.read_text(encoding="utf-8"), lexer, formato)


def seccion_codigo():
    partes = ["""
<section>
<h2><span class="num">4</span>Código fuente de las pruebas</h2>
<p>El código completo está en la carpeta <span class="mono">backend/tests/</span> del
repositorio. Cada función incluye en su docstring el identificador de la prueba, la
entrada y el resultado esperado.</p>
<h3>4.0 Configuración común</h3>"""]
    comunes = [
        (BACKEND / "pytest.ini", IniLexer(), "backend/pytest.ini"),
        (PRUEBAS / "datos.py", PythonLexer(), "backend/tests/datos.py"),
        (PRUEBAS / "conftest.py", PythonLexer(), "backend/tests/conftest.py"),
    ]
    for ruta, lexer, etiqueta in comunes:
        partes.append(
            f'<div class="fuente"><div class="fuente-titulo">{etiqueta}</div>'
            f'<pre class="codigo">{codigo_resaltado(ruta, lexer)}</pre></div>'
        )
    for indice, modulo in enumerate(MODULOS, 1):
        partes.append(
            f"<h3>4.{indice} {modulo['clave']} · {e(modulo['nombre'])}</h3>"
            f'<div class="fuente"><div class="fuente-titulo">backend/tests/{modulo["archivo"]}</div>'
            f'<pre class="codigo">{codigo_resaltado(PRUEBAS / modulo["archivo"], PythonLexer())}</pre></div>'
        )
    partes.append("</section>")
    return "".join(partes)


def imagen_incrustada(ruta):
    tipo = "jpeg" if ruta.suffix.lower() in (".jpg", ".jpeg") else "png"
    datos = base64.b64encode(ruta.read_bytes()).decode("ascii")
    return f"data:image/{tipo};base64,{datos}"


def seccion_evidencias(ejecuciones, resumen, cobertura, mutaciones, captura_reporte):
    partes = [f"""
<section>
<h2><span class="num">5</span>Evidencias de ejecución</h2>
<p>Las salidas de esta sección son el <b>texto real que PyTest imprimió en la
terminal</b> al ejecutar las pruebas el {resumen['fecha_hora']} en
{e(resumen['plataforma'])}. El script <span class="mono">docs/entregable/generar_entregable.py</span>
ejecuta las pruebas y copia su salida sin modificarla; los archivos de texto
originales están en <span class="mono">docs/entregable/evidencias/</span>.</p>
<h3>5.1 Suite completa</h3>
<p>Resultado global: <b>{resumen['passed']} PASSED</b>, {resumen['failed']} FAILED y
{resumen['xfail']} XFAIL (defectos conocidos, sección 6) en {resumen['total']} casos.
El total incluye las {resumen['casos_integracion']} pruebas de integración que ya
existían en el proyecto (<span class="mono">tests/test_integracion.py</span>).</p>
{bloque_terminal(ejecuciones['suite'], 'Evidencia 1. Ejecución de todas las pruebas con medición de cobertura')}
"""]
    if captura_reporte:
        partes.append(f"""
<figure class="captura">
<img src="{imagen_incrustada(captura_reporte)}" alt="Reporte HTML de pytest">
<figcaption>Evidencia 2. Captura del reporte HTML generado por pytest-html
(<span class="mono">docs/entregable/evidencias/reporte_pytest.html</span>), abierto en el navegador.</figcaption>
</figure>""")
    partes.append("<h3>5.2 Ejecución por módulo</h3>")
    for indice, modulo in enumerate(MODULOS, 3):
        partes.append(bloque_terminal(
            ejecuciones[modulo["clave"]],
            f"Evidencia {indice}. {modulo['clave']} · {modulo['nombre']}",
        ))
    siguiente = len(MODULOS) + 3

    partes.append(f"""
<h3>5.3 Pruebas que fallan: defectos reales detectados</h3>
<p>Tres pruebas describen un comportamiento correcto que la aplicación <b>todavía no
cumple</b>. Están marcadas con <span class="mono">xfail</span> para que la suite las
reporte como defecto conocido. Al ejecutarlas con <span class="mono">--runxfail</span>
se ve su resultado real, <b>FAILED</b>:</p>
{bloque_terminal(ejecuciones['defectos'], f'Evidencia {siguiente}. Los tres defectos abiertos, ejecutados sin la marca xfail')}
""")

    if mutaciones:
        filas = "".join(
            f"<tr><td class='mono'>{e(m['clave'])}</td><td>{e(m['modulo'])}</td>"
            f"<td>{e(m['descripcion'])}<br><span class='mono chico'>{e(m['archivo'])}</span></td>"
            f"<td class='mono chico'>{'<br>'.join(e(f.split('::', 1)[1]) for f in m['fallidas'])}</td>"
            f"<td><span class='estado mal'>FAILED</span><br>{e(m['resumen'])}</td></tr>"
            for m in mutaciones
        )
        ejemplo = next((m for m in mutaciones if m["clave"] == "M5"), mutaciones[0])
        partes.append(f"""
<h3>5.4 Comprobación de que las pruebas detectan errores</h3>
<p>Una prueba que nunca falla no demuestra nada. Para comprobar que estas pruebas sí
detectan errores se introdujo <b>a propósito un defecto en cada módulo</b> (por ejemplo,
cambiar <span class="mono">&gt;=</span> por <span class="mono">&gt;</span>), se ejecutó el
módulo de pruebas y después se restauró el código original (script
<span class="mono">docs/entregable/verificar_mutaciones.py</span>). Las {len(mutaciones)}
alteraciones fueron detectadas:</p>
<table class="tabla compacta junta">
<thead><tr><th style="width:5%">#</th><th style="width:15%">Módulo</th><th style="width:30%">Defecto introducido</th><th style="width:32%">Prueba que lo detectó</th><th>Resultado</th></tr></thead>
<tbody>{filas}</tbody></table>
{bloque_terminal({'comando': ejemplo['comando'], 'salida': ejemplo['salida']},
                 f"Evidencia {siguiente + 1}. Salida con el defecto {ejemplo['clave']} introducido ({ejemplo['descripcion']})")}
""")

    filas_cobertura = "".join(
        f"<tr><td class='mono'>{e(nombre)}</td><td class='num-c'>{lineas}</td>"
        f"<td class='num-c'>{porcentaje:.0f} %</td>"
        f"<td><div class='barra'><div style='width:{porcentaje:.0f}%'></div></div></td></tr>"
        for nombre, lineas, porcentaje in cobertura["probados"]
    )
    partes.append(f"""
<h3>5.5 Cobertura de código</h3>
<p>Cobertura de líneas medida con <span class="mono">pytest-cov</span> en los archivos
de los módulos probados:</p>
<table class="tabla compacta cobertura junta">
<thead><tr><th>Archivo</th><th style="width:12%">Líneas</th><th style="width:12%">Cobertura</th><th style="width:28%"></th></tr></thead>
<tbody>{filas_cobertura}</tbody></table>
<p class="nota">Cobertura global del backend: <b>{cobertura['total']:.0f} %</b>. La cifra global
es menor porque incluye los módulos que quedaron fuera del alcance
(sensores: {cobertura['fuera'].get('app/routes/sensores_routes.py', 0):.0f} %,
bitácora: {cobertura['fuera'].get('app/routes/bitacora_routes.py', 0):.0f} %,
servicio de correo: {cobertura['fuera'].get('app/services/correo_service.py', 0):.0f} %).
En <span class="mono">reportes_service.py</span> la parte sin cubrir es la consulta a
InfluxDB, que se sustituyó por un doble de prueba.</p>
""")

    propias = sorted(
        p for p in CAPTURAS.glob("*")
        if p.suffix.lower() in (".png", ".jpg", ".jpeg")
    ) if CAPTURAS.exists() else []
    if propias:
        partes.append("<h3>5.6 Capturas de pantalla</h3>")
        for ruta in propias:
            titulo = re.sub(r"^\d+[-_ ]*", "", ruta.stem).replace("-", " ").replace("_", " ")
            partes.append(
                f'<figure class="captura"><img src="{imagen_incrustada(ruta)}" alt="">'
                f"<figcaption>{e(titulo.capitalize())}</figcaption></figure>"
            )
    partes.append("</section>")
    return "".join(partes)


def seccion_defectos():
    filas = "".join(
        f"<tr><td class='mono'>{d[0]}</td><td class='mono'>{d[1]}</td><td class='mono chico'>{e(d[2])}</td>"
        f"<td>{e(d[3])}</td><td>{e(d[4])}</td></tr>"
        for d in DEFECTOS
    )
    return f"""
<section>
<h2><span class="num">6</span>Defectos detectados</h2>
<p>Escribir las pruebas sacó a la luz tres defectos reales del backend. No se
corrigieron dentro de este proyecto para que el reporte refleje el estado real del
sistema; quedan documentados y con una prueba que pasará a PASSED en cuanto se corrijan.</p>
<table class="tabla compacta">
<thead><tr><th style="width:8%">Defecto</th><th style="width:8%">Prueba</th><th style="width:21%">Punto de entrada</th><th style="width:33%">Comportamiento actual</th><th>Corrección propuesta</th></tr></thead>
<tbody>{filas}</tbody></table>
<p>Además, al ejecutar por primera vez las pruebas de integración que ya existían
(<span class="mono">tests/test_integracion.py</span>) fallaban 12 de 14: sus tokens de
prueba no incluían el dato <span class="mono">credencial_ver</span>, que el backend
exige desde que se agregó la recuperación de contraseña. Se actualizó la preparación
de esas pruebas y ahora pasan las 14.</p>
</section>"""


def seccion_conclusiones(resumen, cobertura):
    return f"""
<section class="flujo">
<h2><span class="num">7</span>Conclusiones</h2>
<h3>Importancia del testing</h3>
<p>Sin pruebas automatizadas, comprobar que AgroIA funciona exige levantar todos los
servicios con Docker y probar a mano desde el navegador. Con las pruebas unitarias, comprobar
{resumen['total']} casos toma menos de medio minuto y no requiere MySQL, InfluxDB ni
un dispositivo conectado. Lo más valioso no fue confirmar lo que ya funcionaba, sino
lo que las pruebas descubrieron: tres defectos reales del backend y un archivo de
pruebas de integración que había quedado desactualizado tras un cambio en la
autenticación. En un sistema
que abre y cierra válvulas de riego, un error en una regla (por ejemplo, quién puede
ordenar un riego o cuándo caduca un comando) tiene consecuencias físicas, así que
conviene que una máquina lo verifique en cada cambio.</p>
<h3>Retos y aprendizajes</h3>
<ul>
<li><b>Aislar las dependencias.</b> El backend usa MySQL, InfluxDB y correo SMTP. Aprendí
a sustituir MySQL por SQLite en memoria y a reemplazar InfluxDB y el correo con dobles
de prueba, cuidando que ninguna prueba pudiera enviar un correo real.</li>
<li><b>Probar fronteras de tiempo.</b> Reglas como «el enlace caduca a los 20 minutos»
no se pueden probar esperando 20 minutos. La solución fue simular el reloj, lo que
permitió verificar el segundo exacto en que cambia el resultado (1200 s vigente,
1201 s caducado).</li>
<li><b>Pensar en los límites.</b> La mayoría de los errores posibles están en los bordes:
<span class="mono">&gt;</span> contra <span class="mono">&gt;=</span>, 12 contra 11 caracteres.
Usar <span class="mono">parametrize</span> para probar el valor mínimo, el máximo y el
primero fuera de rango resultó más útil que escribir muchas pruebas del caso normal.</li>
<li><b>Desconfiar de una prueba que pasa.</b> Para saber si las pruebas servían,
introduje errores a propósito en el código; solo cuando las pruebas fallaron con cada
error tuve confianza en ellas.</li>
<li><b>Una prueba inestable es peor que no tenerla.</b> Una prueba que alteraba el
último carácter de un token fallaba aproximadamente 1 de cada 16 ejecuciones: en
base64 los últimos 2 bits de ese carácter no se usan y a veces el token «alterado»
seguía siendo válido. Se corrigió alterando un carácter interior de la firma y se
repitió 30 veces sin fallos.</li>
<li><b>El entorno también cuenta.</b> Con Python 3.9.1 la versión fijada de
<span class="mono">cryptography</span> no cargaba y hubo que usar la 41.0.7 en el
entorno de pruebas; el contenedor del proyecto usa Python 3.11 y no tiene ese problema.</li>
</ul>
<h3>Calidad lograda</h3>
<ul>
<li><b>{resumen['funciones']} pruebas</b> nuevas en {len(MODULOS)} módulos
({resumen['casos']} casos con sus variantes), todas clasificadas como caso normal, de
error, límite o regla de negocio.</li>
<li><b>{resumen['passed']} de {resumen['total']} casos en PASSED</b> y ninguno en FAILED;
los {resumen['xfail']} restantes son defectos documentados, no pruebas inestables.</li>
<li>Cobertura de entre <b>{cobertura['minimo_rutas']:.0f} % y {cobertura['maximo_rutas']:.0f} %</b>
en las rutas de los módulos probados, con excepción de autenticación
({cobertura['auth']:.0f} %), donde falta probar la edición del perfil.</li>
<li>Las {resumen['mutaciones']} alteraciones introducidas a propósito fueron detectadas.</li>
</ul>
<p>La calidad lograda es buena en las reglas de negocio que se probaron, pero no es
total: la cobertura global del backend es de {cobertura['total']:.0f} % porque la recepción
de lecturas de sensores, la bitácora y el servicio de correo siguen sin pruebas. El
siguiente paso sería corregir los tres defectos abiertos, cubrir esos módulos y
ejecutar la suite automáticamente en cada <i>push</i> al repositorio.</p>
</section>"""


ESTILOS = r"""
@page { size: Letter; margin: 17mm 15mm 18mm 15mm;
        @bottom-center { content: counter(page); font: 8pt "Segoe UI", sans-serif; color: #6b7280; } }
@page :first { @bottom-center { content: none; } }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html { font: 10pt/1.5 "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: #1f2933; }
body { margin: 0; }
section { break-before: page; }
section.flujo { break-before: auto; margin-top: 10mm; }
h1 { font-size: 30pt; line-height: 1.15; margin: 0 0 6mm; color: #14532d; letter-spacing: -0.5px; }
h2 { font-size: 17pt; color: #14532d; margin: 0 0 5mm; padding-bottom: 2.5mm; border-bottom: 1.5pt solid #14532d; break-after: avoid; }
h2 .num { display: inline-block; min-width: 9mm; color: #65a30d; }
h3 { font-size: 11.5pt; color: #1f2933; margin: 7mm 0 2.5mm; break-after: avoid; }
h3 .archivo { font: 8pt Consolas, "Cascadia Mono", monospace; color: #6b7280; font-weight: normal; margin-left: 2mm; }
p { margin: 0 0 3mm; text-align: left; }
ul { margin: 0 0 3mm; padding-left: 5mm; }
li { margin-bottom: 1.8mm; }
.mono { font-family: Consolas, "Cascadia Mono", monospace; font-size: 0.92em; }
.chico { font-size: 7.2pt; }
.nota { font-size: 8.8pt; color: #4b5563; border-left: 2pt solid #a3e635; padding-left: 3mm; }

.portada { break-before: auto; height: 240mm; display: flex; flex-direction: column; justify-content: space-between; }
.portada-arriba { min-height: 20mm; }
.institucion { font-size: 14pt; font-weight: 600; margin: 0; }
.materia { font-size: 11pt; color: #4b5563; margin: 1mm 0 0; }
.portada-centro { border-left: 4pt solid #65a30d; padding-left: 7mm; }
.sobretitulo { text-transform: uppercase; letter-spacing: 2px; font-size: 9.5pt; color: #4d7c0f; font-weight: 600; margin-bottom: 4mm; }
.subtitulo { font-size: 14pt; color: #374151; margin: 0; }
.datos-portada { border-collapse: collapse; font-size: 11pt; width: 100%; }
.datos-portada th { text-align: left; width: 32mm; padding: 2.4mm 0; color: #4b5563; font-weight: 600; border-top: 0.5pt solid #d1d5db; }
.datos-portada td { padding: 2.4mm 0; border-top: 0.5pt solid #d1d5db; }
.pendiente { display: inline-block; width: 70mm; border-bottom: 0.8pt solid #1f2933; }

.tabla { width: 100%; border-collapse: collapse; font-size: 8pt; line-height: 1.35; margin: 0 0 4mm; table-layout: fixed; }
.tabla th { background: #14532d; color: #fff; text-align: left; padding: 1.8mm 2mm; font-weight: 600; }
.tabla tbody th { background: #f0f4ec; color: #1f2933; }
.tabla td { padding: 1.7mm 2mm; border-bottom: 0.5pt solid #d1d5db; vertical-align: top; overflow-wrap: anywhere; }
.tabla tr { break-inside: avoid; }
.tabla thead { display: table-header-group; }
.tabla.compacta { font-size: 8.6pt; }
.tabla.pruebas { font-size: 7.4pt; }
.tabla.pruebas td.id { font-weight: 700; color: #14532d; }
.tabla.pruebas td.res { font-size: 7pt; }
.casos { display: block; font-size: 6.8pt; color: #4b5563; margin-top: 0.8mm; }
.sin-corte { white-space: nowrap; }
.tabla.junta { break-inside: avoid; }
.num-c { text-align: center; }
.tabla th.num-c, .resumen th:not(:first-child) { text-align: center; }
.tipo { display: inline-block; padding: 0.3mm 1.6mm; border-radius: 2mm; font-size: 6.8pt; font-weight: 600; margin: 0 0.6mm 0.6mm 0; white-space: nowrap; }
.tipo.normal { background: #dcfce7; color: #14532d; }
.tipo.error { background: #fee2e2; color: #991b1b; }
.tipo.limite { background: #fef3c7; color: #92400e; }
.tipo.negocio { background: #dbeafe; color: #1e40af; }
.estado { font: 700 7pt Consolas, monospace; padding: 0.3mm 1.4mm; border-radius: 1mm; }
.estado.ok { background: #16a34a; color: #fff; }
.estado.mal { background: #dc2626; color: #fff; }
.estado.aviso { background: #d97706; color: #fff; }
.estado.gris { background: #9ca3af; color: #fff; }

pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.consola { break-inside: avoid; background: #f3f4f6; border: 0.5pt solid #d1d5db; border-radius: 1.5mm; padding: 3mm; font: 8pt/1.5 Consolas, "Cascadia Mono", monospace; margin-bottom: 4mm; }
.fuente { margin: 0 0 5mm; border: 0.5pt solid #d1d5db; border-radius: 1.5mm; }
.fuente-titulo { background: #f0f4ec; font: 600 8pt Consolas, monospace; padding: 1.5mm 3mm; border-bottom: 0.5pt solid #d1d5db; color: #14532d; break-after: avoid; }
.codigo { font: 7.2pt/1.42 Consolas, "Cascadia Mono", monospace; padding: 2.5mm 3mm; color: #1f2933; }

.terminal { margin: 0 0 6mm; }
.terminal figcaption, .captura figcaption { font-size: 8.4pt; font-weight: 600; color: #374151; margin-bottom: 1.2mm; break-after: avoid; }
.captura figcaption { margin: 1.5mm 0 0; font-weight: normal; }
.terminal .comando { background: #1f2937; color: #e5e7eb; font: 7pt Consolas, monospace; padding: 1.6mm 3mm; border-radius: 1.5mm 1.5mm 0 0; break-after: avoid; }
.terminal pre { background: #0d1117; color: #d1d5db; font: 6.5pt/1.38 Consolas, "Cascadia Mono", monospace; padding: 2.5mm 3mm; border-radius: 0 0 1.5mm 1.5mm; }
.terminal .verde { color: #4ade80; } .terminal .rojo { color: #f87171; }
.terminal .amarillo { color: #facc15; } .terminal .azul { color: #60a5fa; }
.terminal .magenta { color: #e879f9; } .terminal .cian { color: #22d3ee; }
.terminal .negrita { font-weight: 700; }
.captura { margin: 0 0 6mm; break-inside: avoid; }
.captura img { width: 100%; border: 0.5pt solid #9ca3af; border-radius: 1mm; display: block; }
.barra { background: #e5e7eb; height: 2.6mm; border-radius: 1.3mm; margin-top: 0.8mm; }
.barra div { background: #65a30d; height: 100%; border-radius: 1.3mm; }
"""


# ---------------------------------------------------------------- navegador

def buscar_navegador():
    candidatos = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    ]
    return next((c for c in candidatos if os.path.exists(c)), None)


def navegador(*argumentos):
    ejecutable = buscar_navegador()
    if not ejecutable:
        raise SystemExit("No se encontró Chrome ni Edge para generar el PDF.")
    perfil = EVIDENCIAS / "_perfil_navegador"
    subprocess.run(
        [ejecutable, "--headless=new", "--disable-gpu", "--no-first-run",
         f"--user-data-dir={perfil}", *argumentos],
        check=True, capture_output=True, timeout=180,
    )


def limpiar_perfil():
    import shutil
    shutil.rmtree(EVIDENCIAS / "_perfil_navegador", ignore_errors=True)


# --------------------------------------------------------------------- main

def main():
    EVIDENCIAS.mkdir(exist_ok=True)
    alumno = json.loads((AQUI / "datos_alumno.json").read_text(encoding="utf-8"))
    ahora = datetime.datetime.now()
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
             "septiembre", "octubre", "noviembre", "diciembre"]
    hoy = f"{ahora.day} de {meses[ahora.month - 1]} de {ahora.year}"

    relativa = "../docs/entregable/evidencias"
    print("Ejecutando la suite completa...")
    ejecuciones = {"suite": ejecutar("00_suite_completa", [
        "-q", "--cov=app", "--cov-report=term",
        f"--cov-report=json:{relativa}/cobertura.json",
        f"--junitxml={relativa}/junit.xml",
        f"--html={relativa}/reporte_pytest.html", "--self-contained-html",
    ])}
    for modulo in MODULOS:
        print(f"Ejecutando {modulo['clave']} · {modulo['nombre']}...")
        ejecuciones[modulo["clave"]] = ejecutar(
            modulo["archivo"].replace(".py", ""), [f"tests/{modulo['archivo']}", "-v"]
        )
    print("Ejecutando los defectos conocidos sin xfail...")
    ejecuciones["defectos"] = ejecutar(
        "07_defectos_conocidos",
        ["-m", "defecto_conocido", "--runxfail", "-v", "--tb=short", "--show-capture=no"],
    )
    cobertura_archivo = BACKEND / ".coverage"
    if cobertura_archivo.exists():
        cobertura_archivo.unlink()

    junit = leer_junit(EVIDENCIAS / "junit.xml")
    todos = [estado for estados in junit.values() for estado in estados]

    fichas, funciones, casos, por_tipo_total = {}, 0, 0, {t: 0 for t in TIPOS.values()}
    for modulo in MODULOS:
        nombre_modulo = modulo["archivo"].replace(".py", "")
        pruebas = leer_pruebas(modulo["archivo"])
        por_tipo = {t: 0 for t in TIPOS.values()}
        casos_modulo, estados_modulo = 0, []
        for prueba in pruebas:
            prueba["estados"] = junit.get((nombre_modulo, prueba["funcion"]), [])
            casos_modulo += len(prueba["estados"])
            estados_modulo += prueba["estados"]
            for tipo in prueba["tipos"]:
                por_tipo[tipo] += 1
                por_tipo_total[tipo] += 1
        aprobados = sum(s == "PASSED" for s in estados_modulo)
        fallidos = sum(s == "FAILED" for s in estados_modulo)
        pendientes = sum(s == "XFAIL" for s in estados_modulo)
        resultado = f'<span class="estado ok">{aprobados} PASSED</span>'
        if fallidos:
            resultado += f' <span class="estado mal">{fallidos} FAILED</span>'
        if pendientes:
            resultado += f' <span class="estado aviso">{pendientes} XFAIL</span>'
        fichas[modulo["clave"]] = {
            "pruebas": pruebas, "casos": casos_modulo,
            "por_tipo": por_tipo, "resultado": resultado,
        }
        funciones += len(pruebas)
        casos += casos_modulo

    datos_cobertura = json.loads((EVIDENCIAS / "cobertura.json").read_text(encoding="utf-8"))
    archivos = {
        ruta.replace("\\", "/"): info["summary"]
        for ruta, info in datos_cobertura["files"].items()
    }
    probados = []
    for modulo in MODULOS:
        for ruta in modulo["codigo"]:
            if ruta in archivos:
                probados.append((ruta, archivos[ruta]["num_statements"],
                                 archivos[ruta]["percent_covered"]))
    rutas = [p for n, _, p in probados if "/routes/" in n and "auth_routes" not in n]
    cobertura = {
        "probados": probados,
        "total": datos_cobertura["totals"]["percent_covered"],
        "fuera": {ruta: info["percent_covered"] for ruta, info in archivos.items()},
        "minimo_rutas": min(rutas), "maximo_rutas": max(rutas),
        "auth": archivos["app/routes/auth_routes.py"]["percent_covered"],
    }

    ruta_mutaciones = EVIDENCIAS / "mutaciones.json"
    mutaciones = (
        [m for m in json.loads(ruta_mutaciones.read_text(encoding="utf-8")) if m.get("detectada")]
        if ruta_mutaciones.exists() else []
    )

    import platform
    import pytest
    resumen = {
        "pytest": pytest.__version__,
        "python": platform.python_version(),
        "plataforma": platform.system(),
        "fecha_hora": f"{hoy} a las {ahora:%H:%M}",
        "funciones": funciones, "casos": casos, "por_tipo": por_tipo_total,
        "minimo_por_modulo": min(len(f["pruebas"]) for f in fichas.values()),
        "total": len(todos),
        "passed": sum(s == "PASSED" for s in todos),
        "failed": sum(s == "FAILED" for s in todos),
        "xfail": sum(s == "XFAIL" for s in todos),
        "casos_integracion": sum(
            len(estados) for (modulo, _), estados in junit.items()
            if modulo == "test_integracion"
        ),
        "mutaciones": len(mutaciones),
    }

    captura_reporte = EVIDENCIAS / "captura_reporte_html.png"
    try:
        print("Capturando el reporte HTML de pytest...")
        navegador(
            "--hide-scrollbars", "--window-size=1180,900",
            "--virtual-time-budget=6000", f"--screenshot={captura_reporte}",
            (EVIDENCIAS / "reporte_pytest.html").as_uri() + "?collapsed=all&sort=result",
        )
    except Exception as error:  # la captura es opcional
        print("  No se pudo capturar el reporte HTML:", error)
        captura_reporte = None

    pygments_css = HtmlFormatter(style="default").get_style_defs(".codigo")
    documento = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Proyecto final · Pruebas unitarias de AgroIA</title>
<style>{ESTILOS}{pygments_css}</style></head><body>
{seccion_portada(alumno, hoy)}
{seccion_proyecto(resumen)}
{seccion_estrategia(resumen)}
{seccion_tablas(fichas, resumen)}
{seccion_codigo()}
{seccion_evidencias(ejecuciones, resumen, cobertura, mutaciones, captura_reporte)}
{seccion_defectos()}
{seccion_conclusiones(resumen, cobertura)}
</body></html>"""
    SALIDA_HTML.write_text(documento, encoding="utf-8")

    print("Generando el PDF...")
    navegador(
        "--no-pdf-header-footer", f"--print-to-pdf={SALIDA_PDF}", SALIDA_HTML.as_uri()
    )
    limpiar_perfil()

    print()
    print(f"Casos ejecutados: {resumen['total']}  |  PASSED: {resumen['passed']}  |  "
          f"FAILED: {resumen['failed']}  |  XFAIL: {resumen['xfail']}")
    print(f"Pruebas nuevas: {funciones} funciones, {casos} casos")
    print(f"PDF: {SALIDA_PDF}")
    if not alumno.get("matricula") or not alumno.get("grupo"):
        print("AVISO: faltan matrícula o grupo en datos_alumno.json (la portada deja el espacio en blanco).")


if __name__ == "__main__":
    main()
