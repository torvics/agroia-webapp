"""Comprueba que las pruebas detectan errores (prueba de mutación manual).

Introduce un defecto temporal en cada módulo del backend, ejecuta el archivo de
pruebas correspondiente y restaura el código original (siempre, en un finally).
Si las pruebas son eficaces, cada defecto debe producir al menos un FAILED.

Uso (desde la raíz del repositorio, con el árbol de trabajo guardado en git):
    backend\venv\Scripts\python.exe docs\entregable\verificar_mutaciones.py

El resultado se guarda en docs/entregable/evidencias/mutaciones.json y lo usa
generar_entregable.py para la sección 5.4 del PDF.
"""
import io
import json
import os
import re
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(os.path.dirname(os.path.dirname(AQUI)), "backend")
SALIDA = os.path.join(AQUI, "evidencias", "mutaciones.json")
PY = sys.executable

MUTACIONES = [
    ("M1", "Autenticación", "app/routes/auth_routes.py",
     "    if not 12 <= len(password_nueva) <= 128:\n        return jsonify({\n            \"error\": \"La nueva contraseña debe tener entre 12 y 128 caracteres\"",
     "    if not 11 <= len(password_nueva) <= 128:\n        return jsonify({\n            \"error\": \"La nueva contraseña debe tener entre 12 y 128 caracteres\"",
     "Aceptar contraseñas de 11 caracteres (mínimo 12 → 11)",
     "tests/test_01_autenticacion.py"),
    ("M2", "Usuarios", "app/routes/usuarios_routes.py",
     "if str(identidad_gestion()) == str(usuario_id) and (rol != \"admin\" or activo is False):",
     "if False and str(identidad_gestion()) == str(usuario_id) and (rol != \"admin\" or activo is False):",
     "Permitir que un administrador se desactive a sí mismo",
     "tests/test_02_usuarios.py"),
    ("M3", "Parcelas y nodos", "app/routes/parcelas_routes.py",
     "        parcelas = Parcela.query.filter_by(\n            usuario_id=usuario_id\n        ).all()",
     "        parcelas = Parcela.query.all()",
     "Mostrar a cada agricultor las parcelas de todos",
     "tests/test_03_parcelas_nodos.py"),
    ("M4", "Comandos de riego", "app/routes/comandos_routes.py",
     "            Comando.fecha_creacion < limite_pendientes",
     "            Comando.fecha_creacion <= limite_pendientes",
     "Expirar el comando justo a los 10 minutos (< → <=)",
     "tests/test_04_comandos_riego.py"),
    ("M5", "Alertas", "app/services/alertas_service.py",
     "    if valor >= umbral:\n        return None",
     "    if valor > umbral:\n        return None",
     "Tratar como crítica una lectura igual al umbral (>= → >)",
     "tests/test_05_alertas.py"),
    ("M6", "Reportes", "app/routes/reportes_routes.py",
     "    if fin - inicio > timedelta(days=366):",
     "    if fin - inicio >= timedelta(days=366):",
     "Rechazar un rango de exactamente 366 días (> → >=)",
     "tests/test_06_reportes.py"),
]

resultados = []
for clave, modulo, archivo, original, mutado, descripcion, pruebas in MUTACIONES:
    ruta = os.path.join(BACKEND, archivo)
    contenido = io.open(ruta, encoding="utf-8", newline="").read()
    fin_linea = "\r\n" if "\r\n" in contenido else "\n"
    buscado = original.replace("\n", fin_linea)
    reemplazo = mutado.replace("\n", fin_linea)
    if contenido.count(buscado) != 1:
        resultados.append({"clave": clave, "error": f"patrón encontrado {contenido.count(buscado)} veces"})
        continue
    try:
        io.open(ruta, "w", encoding="utf-8", newline="").write(contenido.replace(buscado, reemplazo))
        entorno = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1", PYTHONDONTWRITEBYTECODE="1", COLUMNS="122")
        proceso = subprocess.run(
            [PY, "-m", "pytest", pruebas, "-q", "--tb=short", "-rf", "--color=yes"],
            cwd=BACKEND, capture_output=True, text=True, encoding="utf-8", env=entorno,
        )
    finally:
        io.open(ruta, "w", encoding="utf-8", newline="").write(contenido)
    limpio = re.sub(r"\[[0-9;]*m", "", proceso.stdout)
    lineas = limpio.strip().splitlines()
    fallidas = [l.split(" - ")[0] for l in lineas if l.startswith("FAILED ")]
    resultados.append({
        "clave": clave, "modulo": modulo, "archivo": archivo,
        "descripcion": descripcion, "pruebas": pruebas,
        "detectada": proceso.returncode != 0 and bool(fallidas),
        "fallidas": fallidas, "resumen": lineas[-1].strip("= ") if lineas else "",
        "comando": "python -m pytest " + pruebas + " -q --tb=short -rf",
        "salida": proceso.stdout,
    })
    print(clave, "DETECTADA" if resultados[-1]["detectada"] else "NO DETECTADA", "|", resultados[-1]["resumen"])
    for f in fallidas:
        print("   ", f[:150])

json.dump(resultados, io.open(SALIDA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
