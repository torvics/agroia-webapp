# Guion para la presentación (5 a 10 minutos)

Abre una terminal en `backend/` con el entorno activado antes de empezar:

```powershell
cd backend
venv\Scripts\activate
```

## 1. El sistema y los módulos (1 min)

- AgroIA: plataforma web de riego inteligente (Flask + React; estación y nodos de suelo).
- Se probó el backend con PyTest: 6 módulos, 70 pruebas, 191 casos.
- Cada prueba está clasificada: caso normal, de error, límite o regla de negocio.

## 2. Cómo están hechas las pruebas (1 a 2 min)

Muestra `tests/conftest.py` y una prueba corta, por ejemplo `test_ale07` en
`tests/test_05_alertas.py`:

- Cada prueba crea su propia aplicación con SQLite en memoria (no usa MySQL).
- El correo e InfluxDB se sustituyen por dobles de prueba.
- `parametrize` ejecuta la misma prueba con 29.9, 30.0 y 30.1 % de humedad.

## 3. Ejecución en vivo (3 a 4 min)

```powershell
python -m pytest -v                             # todo: 202 passed, 3 xfailed
python -m pytest tests/test_05_alertas.py -v    # un módulo
python -m pytest -m caso_limite -v              # solo los casos límite
```

Explica un caso de cada tipo mientras corre:

| Tipo | Prueba | Qué decir |
|---|---|---|
| Normal | AUT-01 | Login correcto devuelve un token que da acceso al perfil. |
| Error | USU-06 | Correo sin @, rol inexistente o duplicado: 400 / 409. |
| Límite | CMD-06 | El comando se conserva a los 10 min exactos y expira a los 10 min 1 s. |
| Regla de negocio | ALE-08 | El cooldown evita repetir la alerta durante 60 minutos. |

## 4. Mostrar un FAILED (1 a 2 min)

Los tres defectos reales que encontraron las pruebas:

```powershell
python -m pytest -m defecto_conocido --runxfail -v --tb=short --show-capture=no
```

Opcional, para demostrar que las pruebas detectan errores: en
`app/services/alertas_service.py` cambia `if valor >= umbral:` por
`if valor > umbral:`, ejecuta `python -m pytest tests/test_05_alertas.py -q`
(falla ALE-07 con 30.0) y deshaz el cambio con `git checkout app/services/alertas_service.py`.

## 5. Cierre (1 min)

- 202 de 205 casos en PASSED, 0 en FAILED; 3 defectos documentados.
- Cobertura de 85 a 97 % en las rutas de los módulos probados; 61 % global.
- Pendiente: corregir los 3 defectos y cubrir sensores, bitácora y correo.
