// Plantilla de configuración privada de la Estación (ESP32).
//
// 1. Copia este archivo como "secrets.h" en esta misma carpeta.
// 2. Rellena tus valores. secrets.h está en .gitignore: NO se sube a GitHub.
//
// Nunca pongas contraseñas ni API keys reales en NodeFather.ino ni en este
// archivo de ejemplo.

#pragma once

// ── WiFi (red de 2.4 GHz; el ESP32 no usa 5 GHz) ───────────
#define WIFI_SSID "nombre-de-tu-red"
#define WIFI_PASS "contraseña-de-tu-red"

// ── Backend ────────────────────────────────────────────────
// Producción (Render), con HTTPS:
#define API_BASE_URL "https://agroia-webapp.onrender.com/api"
// Local (Docker en tu PC, misma red WiFi; nunca "localhost"):
// #define API_BASE_URL "http://192.168.1.17:5000/api"

// API key del nodo "Estación". En producción: se muestra UNA sola vez al
// registrar la Estación en «Gestión de parcelas y nodos». En local: la
// imprime scripts/seed.py.
#define API_KEY "pega-aqui-la-api-key-de-la-estacion"

// ── Identificadores de los nodos de suelo ─────────────────
// El firmware envía PREFIJO_NODO + número (1..4). Deben existir en la web
// como nodos de tipo "Sensor de suelo", activos y en la misma parcela que la
// Estación. Producción: créalos como nodo-1, nodo-2, nodo-3 y nodo-4.
// Local con scripts/seed.py (crea "1".."4"): usa un prefijo vacío "".
#define PREFIJO_NODO "nodo-"

// ── Opcional ───────────────────────────────────────────────
// Tiempo máximo de espera de cada petición. Render (plan gratuito) puede
// tardar ~50 s en despertar; con 20 s los primeros envíos pueden fallar y
// los siguientes funcionarán.
// #define HTTP_TIMEOUT_MS 20000
