# Integración de la última revisión

Esta revisión incorpora la gestión de usuarios, parcelas y nodos; los avisos;
mapas de parcelas; selección del tipo de riego; temperatura por ubicación; y
el filtrado del histórico y las tarjetas por nodos de suelo activos.

## Configuración de entornos

El valor predeterminado del frontend es `http://localhost:5000/api`, coherente
con `frontend/.env.example` y `docker-compose.yml`.

Para el entorno separado de `docker-compose.pruebas.yml`, configura:

- `frontend/.env`: `VITE_API_URL=http://localhost:5001/api`.
- `backend/.env`: `FRONTEND_ORIGIN=http://localhost:5174`.
- Las conexiones internas a MySQL e InfluxDB siguen utilizando los nombres
  de servicio y sus puertos internos, como en el entorno ordinario.

El proyecto de Compose debe llamarse `agroia-pruebas` para mantener separados
los recursos del entorno ordinario. Sus puertos publicados son 5174, 5001,
3307 y 8087. Revisa la configuración antes de arrancar servicios; los archivos
`.env` son locales y no se incluyen en Git.

## Validación

Desde `frontend`, con las dependencias del archivo de bloqueo instaladas:

```text
npm ci
npm run build
```

Desde `backend`, con `requirements.txt` instalado:

```text
python -m unittest discover -s tests -v
```

Las pruebas del backend utilizan SQLite en memoria y el cliente Flask. No
conectan bases de datos reales ni envían correo. Cubren autenticación, cierre
de sesión, cambios de permisos, validaciones de usuarios, gestión de parcelas
y nodos, separación entre propietarios, alertas y validación de reportes.

La validación de esta integración también incluyó cinco pruebas con React
para filtrado de nodos, errores y reintentos, configuración de API, espera
máxima de temperatura y cancelación de consultas antiguas. El entorno de
ejecución y los resultados se conservan con el informe de integración, fuera
de las dependencias de producción.

La cadena Alembic tiene una sola revisión final, `3c38d8f99157`, y se comprobó
la generación de SQL para MySQL sin ejecutarlo sobre una base existente.
Esto no sustituye una prueba de despliegue con MySQL, InfluxDB y dispositivos.

## Alcance del simulador

El simulador envía campos adicionales de clima virtual. El firmware
`NodeFather.ino` incluido todavía no utiliza todos esos campos. La recepción
de clima virtual completo requiere revisar por separado el firmware cargado
en el dispositivo; esta integración no modifica ni actualiza dispositivos.
