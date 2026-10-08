# AgroIA Webapp

Plataforma web de control, monitoreo y análisis del sistema de riego inteligente AgroIA (sustituye a Blynk).

## Estructura
- `backend/` — API REST en Flask (auth, sensores, comandos, bitácora)
- `frontend/` — Interfaz web en React
- `simulador/` — Simula nodos ESP32 (datos de sensores + ejecución de comandos)
- `docs/` — Diagramas y documentación del proyecto

## Cómo levantar todo con Docker (recomendado)

1. Copia los `.env.example` a `.env` en `backend/` y `frontend/`, y ajusta los valores si hace falta.
2. Desde la raíz del proyecto:
   ```bash
   docker-compose up --build
   ```
3. Accede a:
   - Frontend: http://localhost:5173
   - Backend (health check): http://localhost:5000/api/health
   - InfluxDB UI: http://localhost:8086

### Preparar la base de datos y cargar datos de prueba

Después de levantar los servicios, aplica las migraciones antes de usar la API o
cargar datos iniciales. Desde la raíz del proyecto:

```bash
docker compose exec backend flask db upgrade
docker compose exec backend python scripts/seed.py
```

El primer comando actualiza el esquema de MySQL según las migraciones del backend
(incluida la columna `nodos.tipo`); el segundo crea los usuarios y nodos de
prueba y se puede ejecutar más de una vez.

## Cómo correr cada parte manualmente (sin Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # y edita DATABASE_URL para apuntar a tu MySQL local
python run.py
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Simulador
```bash
cd simulador
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # pon aquí la api_key real de un nodo registrado
python generador_datos.py   # en otra terminal: python cliente_comandos.py
```

## Primer usuario de prueba

Como aún no hay pantalla de registro, crea el primer Admin manualmente desde una shell de Python dentro del contenedor/entorno del backend:

```python
from app import create_app
from app.extensions import db
from app.models import Usuario

app = create_app()
with app.app_context():
    u = Usuario(nombre="Admin", correo="admin@agroia.com", rol="admin")
    u.set_password("admin123")
    db.session.add(u)
    db.session.commit()
```

## Flujo de control de versiones

Ver `docs/` para el flujo de ramas (`main`/`develop`/`feature/*`), diagramas (casos de uso, clases, arquitectura, WBS) y la documentación completa del proyecto.
