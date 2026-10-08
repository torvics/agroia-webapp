//#include "secrets.h"

#include <WiFi.h>
#include <SPI.h>
#include <LoRa.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <math.h>
#include "modelo_riego.h"

#define LED_BUILTIN 2

char ssid[] = "iPhone d torvi";
char pass[] = "mevaleverga";

// ── Backend web (Flask) ──────────────────────────────────
// IP de la PC donde corre Docker, en la MISMA red WiFi que el ESP32.
// OJO: no uses localhost, desde el ESP32 "localhost" es el propio ESP32.
#define API_BASE_URL  "http://172.27.96.1:5000/api"
// api_key del nodo "estacion" (la imprime scripts/seed.py).
// Si prefieres, muévela a secrets.h para no subirla a git.
#define API_KEY       "b9f1845bc52dc08dd0a1ffc31e4ea5534720a70955fce7fe"
#define INTERVALO_POLL_COMANDOS_MS 5000UL   // cada cuánto pregunta por comandos

#define LORA_SS   5
#define LORA_RST  14
#define LORA_DIO0 4

#define NUM_NODOS 4

#define PIN_RELAY_NODO1 12
#define PIN_RELAY_NODO2 13
#define PIN_RELAY_NODO3 26
#define PIN_RELAY_NODO4 27
const int RELAY_PINS[4] = { PIN_RELAY_NODO1, PIN_RELAY_NODO2,
                             PIN_RELAY_NODO3, PIN_RELAY_NODO4 };

#define PIN_DHT          21
#define PIN_BAT_ESTACION 35

#define DDS_OFFSET_INICIAL  0
#define TEMPORADA           "2025-2026"
#define CAUDAL_LPM          12.0

// ── TinyML ───────────────────────────────────────────────
#define CICLO_ACTUAL        0         // 0=invierno 1=primavera
#define MES_SIEMBRA         10        // octubre=10, febrero=2
#define LAT_CAMPO           27.48f
#define CAUDAL_SISTEMA_LPH  6000.0f   // ← actualizar con specs reales
#define EFICIENCIA_GOTEO    0.92f
#define AREA_HA             1.0f
#define CC                  80.0f
#define PMP                 28.0f
#define INTERVALO_INFERENCIA 120000UL  

/*
const float FEATURE_MIN[20] = {
  0.0000f,  0.0000f,   0.0000f,   0.3500f,  11.0000f,
 -0.4300f,  5.0400f,   8.8500f,   0.0000f,   2.4100f,
  2.9298f,  1.3893f,   4.5981f,   0.0000f,   0.0000f,
 30.3165f, 51.4018f,  51.4018f, -32.9580f,   0.0000f
};

const float FEATURE_MAX[20] = {
  1.0000f, 168.0000f,   5.0000f,   1.1400f,  45.3100f,
 30.0200f,  36.4900f,  92.4100f,  84.5900f,  32.2500f,
 22.3092f,  25.4325f, 140.6470f,  87.8100f,  88.0800f,
 80.0000f,  80.0000f,  80.0000f,  38.4218f,  21.0000f
};
*/

const float RADIACION_MENSUAL[13] = {
  0.0f,   // índice 0 no se usa
  14.8f,  // enero
  18.0f,  // febrero
  22.9f,  // marzo
  26.6f,  // abril
  28.5f,  // mayo
  27.8f,  // junio
  20.8f,  // julio
  20.8f,  // agosto
  20.8f,  // septiembre
  18.6f,  // octubre
  15.8f,  // noviembre
  13.6f   // diciembre
};

#define ALERTA_NODO_TIMEOUT_MS   120000UL
#define ALERTA_BATERIA_PCT       25
#define ALERTA_RELE_MAX_MS       60000UL
#define ALERTA_INFLUX_TIMEOUT_MS 120000UL

#include <Preferences.h>
Preferences prefs;

unsigned long tiempo_arranque_ms = 0;

struct Etapa {
  const char* nombre;
  int   dds_ini;
  int   dds_fin;
  float umbral_riego;
  float kc;
};

const Etapa ETAPAS[] = {
  {"Germinacion",    0,   12,  65.0, 0.35},
  {"Amacollamiento", 12,  40,  58.0, 0.55},
  {"Encañado",       40,  75,  62.0, 0.85},
  {"Espigado",       75,  100, 63.0, 1.05},
  {"Grano_lechoso",  100, 125, 52.0, 1.14},
  {"Maduracion",     125, 140, 35.0, 1.07},
};
const int NUM_ETAPAS = 6;

typedef struct {
  int           nodo_id;
  char          hectarea[20];
  float         temp_suelo;
  float         humedad_suelo;
  int           bateria_pct;
  float         lluvia_mm;       // ← nuevo — debe coincidir con nodo hijo
  unsigned long timestamp;
} struct_message;

struct DatosEstacion {
  float temp_ambiente    = 0.0;
  float humedad_ambiente = 0.0;
  float lluvia_mm        = 2.0;
  float lluvia_acum_mm   = 0.0;
  int   bateria_pct      = 100;
  float temp_max_24h     = 25.0;
  float temp_min_24h     = 10.0;
};
DatosEstacion estacion;

struct ResultadoValidacion {
  bool   valido;
  String motivo;
};

struct {
  struct_message datos[5];
  bool           datos_nuevos[5]        = { false };
  unsigned long  timestamp_ultima_rx[5] = { 0 };
} buffer_rx;

struct {
  float temp_suelo_promedio    = 0.0;
  float humedad_suelo_promedio = 0.0;
  int   nodos_activos          = 0;
} estado_campo;

#define COLA_MAX_POR_NODO 20
#define COLA_TOTAL (COLA_MAX_POR_NODO * NUM_NODOS)

struct RegistroCola {
  struct_message msg;
  bool           es_estacion;
  DatosEstacion  estacion_data;
  unsigned long  timestamp_guardado;
};

RegistroCola cola_offline[COLA_TOTAL];
int  cola_cabeza = 0;
int  cola_cola   = 0;
int  cola_count  = 0;
bool wifi_previo = true;

unsigned long msg_count         = 0;
unsigned long ultimo_update     = 0;
unsigned long ultimo_inferencia = 0;

int modo_riego = 0;  // 0=Inteligente, 1=Automatico, 2=Manual

volatile bool relay_estado[4] = { false, false, false, false };
volatile bool relay_cambio[4] = { false, false, false, false };
volatile bool led_estado      = false;
volatile bool led_cambio      = false;

unsigned long relay_tiempo_inicio[4]    = { 0 };
float         relay_hum_inicio[4]       = { 0.0 };
float         relay_tiempo_calculado[4] = { 0.0 };

unsigned long ultimo_influx_ok        = 0;
bool alerta_influx_enviada            = false;
bool alerta_bateria_enviada[4]        = { false, false, false, false };
bool alerta_nodo_enviada[4]           = { false, false, false, false };
bool alerta_rele_enviada[4]           = { false, false, false, false };
bool alerta_humedad_enviada[4]        = { false, false, false, false };

WebServer server(80);

// ── Helpers DDS / Etapa ──────────────────────────────────
int get_dds() {
  int dds_base = prefs.getInt("dds_base", DDS_OFFSET_INICIAL);
  int dias     = (int)((millis() - tiempo_arranque_ms) / 86400000UL);
  return dds_base + dias;
}

const char* get_etapa(int dds) {
  for (int i = 0; i < NUM_ETAPAS; i++)
    if (dds >= ETAPAS[i].dds_ini && dds < ETAPAS[i].dds_fin)
      return ETAPAS[i].nombre;
  return ETAPAS[NUM_ETAPAS - 1].nombre;
}

int get_etapa_num(int dds) {
  for (int i = 0; i < NUM_ETAPAS; i++)
    if (dds >= ETAPAS[i].dds_ini && dds < ETAPAS[i].dds_fin)
      return i;
  return NUM_ETAPAS - 1;
}

float get_kc(int dds) {
  for (int i = 0; i < NUM_ETAPAS; i++)
    if (dds >= ETAPAS[i].dds_ini && dds < ETAPAS[i].dds_fin)
      return ETAPAS[i].kc;
  return ETAPAS[NUM_ETAPAS - 1].kc;
}

int get_mes_actual() {
  int mes = MES_SIEMBRA + (get_dds() / 30);
  while (mes > 12) mes -= 12;
  return mes;
}

// ── ETo Hargreaves ───────────────────────────────────────
float calcular_ra(float lat_rad, int doy) {
  float dr    = 1.0f + 0.033f * cosf(2.0f * PI * doy / 365.0f);
  float delta = 0.409f * sinf(2.0f * PI * doy / 365.0f - 1.39f);
  float ws    = acosf(-tanf(lat_rad) * tanf(delta));
  return (24.0f * 60.0f / PI) * 0.0820f * dr * (
    ws * sinf(lat_rad) * sinf(delta) +
    cosf(lat_rad) * cosf(delta) * sinf(ws)
  );
}

float calcular_eto() {
  int dds   = get_dds();
  int doy   = (CICLO_ACTUAL == 0) ? (288 + dds) % 365 : (32 + dds) % 365;
  float lat = radians(LAT_CAMPO);
  float ra  = calcular_ra(lat, doy);
  float diff = max(0.0f, estacion.temp_max_24h - estacion.temp_min_24h);
  float tmed = (estacion.temp_max_24h + estacion.temp_min_24h) / 2.0f;
  return max(0.0f, 0.0023f * (tmed + 17.8f) * sqrtf(diff) * ra);
}

// ── Balance FAO-56 por nodo ──────────────────────────────
float calcular_agua_suelo_nodo(int idx) {
  String key  = "agua_n" + String(idx) + "_d0";
  float ayer  = prefs.getFloat(key.c_str(), CC);
  float llef  = min(estacion.lluvia_mm, 20.0f);
  float etc   = calcular_eto() * get_kc(get_dds());
  return constrain(ayer + llef - etc, PMP, CC);
}

// ── TinyML: features ─────────────────────────────────────
void calcular_features(int idx, float* f) {
  int   dds  = get_dds();
  float eto  = calcular_eto();
  float kc   = get_kc(dds);
  float agua = calcular_agua_suelo_nodo(idx);
  String pn  = "n" + String(idx);

  float eto_7d = 0, ll_72h = 0, ll_7d = 0;
  for (int d = 0; d <= 6; d++) {
    eto_7d += prefs.getFloat(("eto_d"    + String(d)).c_str(), 0.0f);
    float l = prefs.getFloat(("lluvia_d" + String(d)).c_str(), 0.0f);
    ll_7d  += l;
    if (d <= 2) ll_72h += l;
  }

  float a0 = prefs.getFloat(("agua_" + pn + "_d0").c_str(), CC);
  float a1 = prefs.getFloat(("agua_" + pn + "_d1").c_str(), CC);
  float a2 = prefs.getFloat(("agua_" + pn + "_d2").c_str(), CC);
  int   dr = prefs.getInt  (("dias_r_" + pn).c_str(), 0);

  f[0]  = (float)CICLO_ACTUAL;
  f[1]  = (float)dds;
  f[2]  = (float)get_etapa_num(dds);
  f[3]  = kc;
  f[4]  = estacion.temp_max_24h;
  f[5]  = estacion.temp_min_24h;
  f[6]  = estacion.temp_ambiente;
  f[7]  = estacion.humedad_ambiente;
  f[8]  = estacion.lluvia_mm;
  f[9]  = RADIACION_MENSUAL[get_mes_actual()];
  f[10] = eto;
  f[11] = eto * kc;
  f[12] = eto_7d;
  f[13] = ll_72h;
  f[14] = ll_7d;
  f[15] = agua;
  f[16] = a0;
  f[17] = a1;
  f[18] = agua - a2;
  f[19] = (float)dr;
}

/*
// Reemplaza la función normalizar_features con esta versión
void normalizar_features(float* f, int16_t* f_int) {
  for (int i = 0; i < 20; i++) {
    float rango = FEATURE_MAX[i] - FEATURE_MIN[i];
    float norm  = (rango > 0) ? (f[i] - FEATURE_MIN[i]) / rango : 0.0f;
    norm        = constrain(norm, 0.0f, 1.0f);
    f_int[i]    = (int16_t)(norm * 32767);
  }
}
*/

// ── TinyML: tiempo de riego ──────────────────────────────
float calcular_tiempo_riego_min(float hum) {
  float vol = ((CC - hum) / 100.0f) * 600.0f * 0.18f * AREA_HA * 10000.0f;
  return max(1.0f, vol / ((CAUDAL_SISTEMA_LPH * EFICIENCIA_GOTEO) / 60.0f));
}

// ── TinyML: historial diario ─────────────────────────────
void actualizar_historial_diario() {
  float eto_hoy = calcular_eto();

  for (int d = 6; d > 0; d--) {
    prefs.putFloat(("eto_d"    + String(d)).c_str(),
                   prefs.getFloat(("eto_d"    + String(d-1)).c_str(), 0.0f));
    prefs.putFloat(("lluvia_d" + String(d)).c_str(),
                   prefs.getFloat(("lluvia_d" + String(d-1)).c_str(), 0.0f));
  }
  prefs.putFloat("eto_d0",    eto_hoy);
  prefs.putFloat("lluvia_d0", estacion.lluvia_mm);

  for (int i = 0; i < NUM_NODOS; i++) {
    String pn  = "n" + String(i);
    float agua = calcular_agua_suelo_nodo(i);
    prefs.putFloat(("agua_" + pn + "_d2").c_str(),
                   prefs.getFloat(("agua_" + pn + "_d1").c_str(), CC));
    prefs.putFloat(("agua_" + pn + "_d1").c_str(),
                   prefs.getFloat(("agua_" + pn + "_d0").c_str(), CC));
    prefs.putFloat(("agua_" + pn + "_d0").c_str(), agua);
    prefs.putInt(("dias_r_" + pn).c_str(),
                 prefs.getInt(("dias_r_" + pn).c_str(), 0) + 1);
  }

  estacion.temp_max_24h = estacion.temp_ambiente;
  estacion.temp_min_24h = estacion.temp_ambiente;

  Serial.printf("[HISTORIAL] ETo:%.2fmm | Lluvia:%.1fmm\n",
                eto_hoy, estacion.lluvia_mm);
}

void guardar_decision_tinyml(int idx, int decision, float agua_suelo, float eto) {
  String json = "{";
  json += "\"identificador\":\"" + String(idx + 1) + "\"";
  json += ",\"decision\":"       + String(decision);
  json += ",\"agua_suelo\":"     + String(agua_suelo, 2);
  json += ",\"eto\":"            + String(eto, 2);
  json += ",\"dds\":"            + String(get_dds());
  json += "}";
  api_post("/sensores/decisiones-riego", json);
}

void ejecutar_modo_automatico() {
  int dds = get_dds();
  Serial.printf("\n[AUTO] DDS:%d | %s\n", dds, get_etapa(dds));

  for (int i = 0; i < NUM_NODOS; i++) {
    if (buffer_rx.timestamp_ultima_rx[i] == 0) continue;

    float hum     = buffer_rx.datos[i].humedad_suelo;
    float umbral  = 0;
    for (int e = 0; e < NUM_ETAPAS; e++) {
      if (dds >= ETAPAS[e].dds_ini && dds < ETAPAS[e].dds_fin) {
        umbral = ETAPAS[e].umbral_riego;
        break;
      }
    }

    Serial.printf("  Nodo %d (%s): Hum=%.1f%% Umbral=%.1f%%\n",
                  i + 1, buffer_rx.datos[i].hectarea, hum, umbral);

    if (hum < umbral && !relay_estado[i]) {
      float tiempo = calcular_tiempo_riego_min(hum);
      relay_estado[i]           = true;
      relay_cambio[i]           = true;
      relay_tiempo_calculado[i] = tiempo;
      enviar_alerta("alerta_riego",
        "Riego AUTO Nodo " + String(i + 1) +
        " (" + String(buffer_rx.datos[i].hectarea) + ") — " +
        String(tiempo, 0) + " min");
      Serial.printf("  [AUTO] Riego Nodo %d — %.0f min\n", i + 1, tiempo);
    }
  }
}
void debug_features(int idx, float* f) {
  Serial.printf("\n  [FEATURES Nodo %d]\n", idx + 1);
  Serial.printf("  F0  ciclo_num:       %.2f\n", f[0]);
  Serial.printf("  F1  dds:             %.2f\n", f[1]);
  Serial.printf("  F2  etapa_num:       %.2f\n", f[2]);
  Serial.printf("  F3  kc:              %.2f\n", f[3]);
  Serial.printf("  F4  t2m_max:         %.2f\n", f[4]);
  Serial.printf("  F5  t2m_min:         %.2f\n", f[5]);
  Serial.printf("  F6  t2m:             %.2f\n", f[6]);
  Serial.printf("  F7  rh2m:            %.2f\n", f[7]);
  Serial.printf("  F8  lluvia_mm:       %.2f\n", f[8]);
  Serial.printf("  F9  radiacion:       %.2f\n", f[9]);
  Serial.printf("  F10 eto:             %.2f\n", f[10]);
  Serial.printf("  F11 etc:             %.2f\n", f[11]);
  Serial.printf("  F12 eto_acum_7d:     %.2f\n", f[12]);
  Serial.printf("  F13 lluvia_acum_72h: %.2f\n", f[13]);
  Serial.printf("  F14 lluvia_acum_7d:  %.2f\n", f[14]);
  Serial.printf("  F15 agua_suelo:      %.2f\n", f[15]);
  Serial.printf("  F16 agua_suelo_ayer: %.2f\n", f[16]);
  Serial.printf("  F17 agua_suelo_h2:   %.2f\n", f[17]);
  Serial.printf("  F18 tendencia_3d:    %.2f\n", f[18]);
  Serial.printf("  F19 dias_riego:      %.2f\n", f[19]);
}

// ── TinyML: inferencia diaria ────────────────────────────
void ejecutar_inferencia_diaria() {
  Serial.printf("\n[TINYML] DDS:%d | %s\n", get_dds(), get_etapa(get_dds()));

  for (int i = 0; i < NUM_NODOS; i++) {
    if (buffer_rx.timestamp_ultima_rx[i] == 0) {
      Serial.printf("  Nodo %d: sin datos\n", i + 1);
      continue;
    }

    /*
    float   features[20];
    int16_t features_int[20];
    calcular_features(i, features);
    normalizar_features(features, features_int);
    debug_features(i, features);  // ← agregar aquí

    int decision = modelo_riego_predict(features_int, 20);
    */
    
    float features[20];
    calcular_features(i, features);
    debug_features(i, features);

    int decision = modelo_riego_predict(features, 20);  

    float agua_suelo = calcular_agua_suelo_nodo(i);
    float eto        = calcular_eto();    

    const char* etiq = decision == 0 ? "Sin riego" :
                       decision == 1 ? "Regar pronto" : "Regar hoy";
    
    Serial.printf("  Nodo %d (%s): %s\n",
                  i + 1, buffer_rx.datos[i].hectarea, etiq);

    // ← Publicar la decisión al backend (web)
    guardar_decision_tinyml(i, decision, agua_suelo, eto);

    if (decision == 2) {
      float tiempo = calcular_tiempo_riego_min(buffer_rx.datos[i].humedad_suelo);
      relay_estado[i]           = true;
      relay_cambio[i]           = true;
      relay_tiempo_calculado[i] = tiempo;
      enviar_alerta("alerta_humedad",
        "✅ RIEGO INICIADO Nodo " + String(i + 1) +
        " (" + String(buffer_rx.datos[i].hectarea) + ") — " +
        String(tiempo, 0) + " min automaticos");

    } else if (decision == 1) {
      enviar_alerta("alerta_humedad",
        "⚠️ REGAR PRONTO Nodo " + String(i + 1) +
        " (" + String(buffer_rx.datos[i].hectarea) + ") en 1-2 dias");
    }
  }

  actualizar_historial_diario();
}

// ── Parseo JSON ──────────────────────────────────────────
float extraer_float(String json, String clave) {
  String b1 = "\"" + clave + "\": ";
  String b2 = "\"" + clave + "\":";
  int idx = json.indexOf(b1);
  if (idx >= 0) return json.substring(idx + b1.length()).toFloat();
  idx = json.indexOf(b2);
  if (idx >= 0) return json.substring(idx + b2.length()).toFloat();
  return 0.0;
}

int extraer_int(String json, String clave) {
  String b1 = "\"" + clave + "\": ";
  String b2 = "\"" + clave + "\":";
  int idx = json.indexOf(b1);
  if (idx >= 0) return json.substring(idx + b1.length()).toInt();
  idx = json.indexOf(b2);
  if (idx >= 0) return json.substring(idx + b2.length()).toInt();
  return 0;
}

String extraer_string(String json, String clave) {
  String b1 = "\"" + clave + "\": \"";
  String b2 = "\"" + clave + "\":\"";
  int idx = json.indexOf(b1);
  int off = b1.length();
  if (idx < 0) { idx = json.indexOf(b2); off = b2.length(); }
  if (idx < 0) return "N/A";
  int start = idx + off;
  return json.substring(start, json.indexOf("\"", start));
}

void leer_estacion() {
  estacion.temp_ambiente    = 18.0;   // ← REEMPLAZAR con DHT22
  estacion.humedad_ambiente = 65.0;   // ← REEMPLAZAR con DHT22
  estacion.bateria_pct      = 100;    // ← REEMPLAZAR

   // Simular variación día/noche hasta tener DHT22
  estacion.temp_max_24h = 26.0;
  estacion.temp_min_24h = 8.0;

  // lluvia_mm viene del Nodo 1 via LoRa en procesar_mensaje()
  // NO acumular aquí — ya se acumula cuando llega el paquete del Nodo 1

  // Actualizar max/min 24h para ETo
  if (estacion.temp_ambiente > estacion.temp_max_24h)
    estacion.temp_max_24h = estacion.temp_ambiente;
  if (estacion.temp_ambiente < estacion.temp_min_24h)
    estacion.temp_min_24h = estacion.temp_ambiente;

  ResultadoValidacion rv = validar_estacion(estacion);
  if (!rv.valido) {
    Serial.printf("[ESTACION FALLO] %s\n", rv.motivo.c_str());
    return;
  }
  // lluvia_acum_mm se guarda en procesar_mensaje() cuando llega Nodo 1
}

// ── Backend web (API Flask) ──────────────────────────────
// La Estación le habla SOLO al backend (con su api_key) y es el backend
// quien escribe en InfluxDB. Ya no hay token de InfluxDB en el firmware.
bool api_post(const String &ruta, String &json) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(String(API_BASE_URL) + ruta);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-KEY", API_KEY);
  http.setTimeout(3000);

  int  code = http.POST(json);
  bool ok   = (code == 200 || code == 201);
  http.end();

  if (ok) { ultimo_influx_ok = millis(); alerta_influx_enviada = false; }
  Serial.printf("  API %s: %s\n", ruta.c_str(), ok ? "OK" : ("ERR " + String(code)).c_str());
  return ok;
}

bool api_get(const String &ruta, String &respuesta) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(String(API_BASE_URL) + ruta);
  http.addHeader("X-API-KEY", API_KEY);
  http.setTimeout(3000);

  int  code = http.GET();
  bool ok   = (code == 200);
  if (ok) respuesta = http.getString();
  http.end();

  if (ok) { ultimo_influx_ok = millis(); alerta_influx_enviada = false; }
  return ok;
}

// Un nodo de suelo (llega por LoRa/HTTP del simulador) -> /sensores/datos
bool guardar_sensores_suelo(struct_message &msg) {
  String json = "{\"nodos\":[{";
  json += "\"identificador\":\"" + String(msg.nodo_id) + "\"";
  json += ",\"temp_suelo\":"     + String(msg.temp_suelo, 2);
  json += ",\"humedad_suelo\":"  + String(msg.humedad_suelo, 2);
  json += ",\"bateria_pct\":"    + String(msg.bateria_pct);
  json += "}]}";
  return api_post("/sensores/datos", json);
}

// Datos ambientales de la propia Estación -> /sensores/datos
bool guardar_sensores_estacion() {
  String json = "{\"estacion\":{";
  json += "\"temp_ambiente\":"     + String(estacion.temp_ambiente, 2);
  json += ",\"humedad_ambiente\":" + String(estacion.humedad_ambiente, 2);
  json += ",\"lluvia_mm\":"        + String(estacion.lluvia_mm, 2);
  json += ",\"lluvia_acum_mm\":"   + String(estacion.lluvia_acum_mm, 2);
  json += ",\"bateria_pct\":"      + String(estacion.bateria_pct);
  json += ",\"dds\":"              + String(get_dds());
  json += ",\"modo_riego\":"       + String(modo_riego);
  json += "}}";
  return api_post("/sensores/datos", json);
}

void guardar_evento_riego(int idx, bool encendido,
                          float hum_fin = 0.0, float dur_min = 0.0) {
  String json = "{";
  json += "\"identificador\":\"" + String(idx + 1) + "\"";
  json += ",\"estado\":"               + String(encendido ? 1 : 0);
  json += ",\"duracion_min\":"         + String(dur_min, 2);
  json += ",\"litros\":"               + String(dur_min * CAUDAL_LPM, 2);
  json += ",\"humedad_suelo_inicio\":" + String(relay_hum_inicio[idx], 2);
  json += ",\"humedad_suelo_fin\":"    + String(hum_fin, 2);
  json += ",\"dds\":"                  + String(get_dds());
  json += "}";
  api_post("/sensores/eventos-riego", json);

  // Resetear días desde riego cuando se activa
  if (encendido) {
    String pn = "n" + String(idx);
    prefs.putInt(("dias_r_" + pn).c_str(), 0);
  }
}

// ── Validación ───────────────────────────────────────────
ResultadoValidacion validar_mensaje(struct_message &msg) {
  if (msg.humedad_suelo < 0 || msg.humedad_suelo > 100)
    return { false, "humedad_suelo fuera de rango: " + String(msg.humedad_suelo) };
  if (msg.temp_suelo < -5 || msg.temp_suelo > 50)
    return { false, "temp_suelo fuera de rango: " + String(msg.temp_suelo) };
  if (msg.bateria_pct < 0 || msg.bateria_pct > 100)
    return { false, "bateria_pct fuera de rango: " + String(msg.bateria_pct) };
  if (msg.nodo_id < 1 || msg.nodo_id > NUM_NODOS)
    return { false, "nodo_id invalido: " + String(msg.nodo_id) };
  if (strlen(msg.hectarea) == 0)
    return { false, "hectarea vacia" };
  return { true, "" };
}

ResultadoValidacion validar_estacion(DatosEstacion &est) {
  if (est.temp_ambiente < -5 || est.temp_ambiente > 50)
    return { false, "temp_ambiente fuera de rango: " + String(est.temp_ambiente) };
  if (est.humedad_ambiente < 10 || est.humedad_ambiente > 99)
    return { false, "humedad_ambiente fuera de rango: " + String(est.humedad_ambiente) };
  if (est.lluvia_mm < 0 || est.lluvia_mm > 100)
    return { false, "lluvia_mm fuera de rango: " + String(est.lluvia_mm) };
  if (est.bateria_pct < 0 || est.bateria_pct > 100)
    return { false, "bateria_pct fuera de rango: " + String(est.bateria_pct) };
  return { true, "" };
}

// ── Cola offline ─────────────────────────────────────────
void encolar_mensaje(struct_message &msg) {
  if (cola_count >= COLA_TOTAL) {
    cola_cabeza = (cola_cabeza + 1) % COLA_TOTAL;
    cola_count--;
    Serial.println("[COLA] Llena — descartando registro mas antiguo");
  }
  cola_offline[cola_cola].msg              = msg;
  cola_offline[cola_cola].es_estacion      = false;
  cola_offline[cola_cola].timestamp_guardado = millis();
  cola_cola = (cola_cola + 1) % COLA_TOTAL;
  cola_count++;
  Serial.printf("[COLA] Nodo %d — %d/%d\n", msg.nodo_id, cola_count, COLA_TOTAL);
}

void encolar_estacion(DatosEstacion &est) {
  if (cola_count >= COLA_TOTAL) {
    cola_cabeza = (cola_cabeza + 1) % COLA_TOTAL;
    cola_count--;
  }
  cola_offline[cola_cola].estacion_data    = est;
  cola_offline[cola_cola].es_estacion      = true;
  cola_offline[cola_cola].timestamp_guardado = millis();
  cola_cola = (cola_cola + 1) % COLA_TOTAL;
  cola_count++;
  Serial.printf("[COLA] Estacion — %d/%d\n", cola_count, COLA_TOTAL);
}

void vaciar_cola() {
  if (cola_count == 0) return;
  Serial.printf("[COLA] Reenviando %d registros...\n", cola_count);
  int enviados = 0;
  while (cola_count > 0) {
    RegistroCola &r = cola_offline[cola_cabeza];
    bool ok = r.es_estacion ? guardar_sensores_estacion()
                            : guardar_sensores_suelo(r.msg);
    if (!ok) { Serial.println("[COLA] Backend no responde, abortando"); break; }
    cola_cabeza = (cola_cabeza + 1) % COLA_TOTAL;
    cola_count--;
    enviados++;
    delay(100);
  }
  if (enviados > 0)
    Serial.printf("[COLA] %d registros reenviados OK\n", enviados);
}

// ── Alertas ──────────────────────────────────────────────
// Las alertas por correo/WhatsApp (RF9) las genera el backend de la web a
// partir de los datos que recibe. Aquí solo se deja constancia en Serial.
void enviar_alerta(String evento, String mensaje) {
  Serial.printf("[ALERTA:%s] %s\n", evento.c_str(), mensaje.c_str());
}

void verificar_alertas() {
  int dds = get_dds();

  for (int i = 0; i < NUM_NODOS; i++) {
    if (buffer_rx.timestamp_ultima_rx[i] == 0) continue;

    // ── Nodo caído ─────────────────────────────────────────
    bool caido = (millis() - buffer_rx.timestamp_ultima_rx[i]) > ALERTA_NODO_TIMEOUT_MS;
    if (caido && !alerta_nodo_enviada[i]) {
      enviar_alerta("alerta_nodo",
        "Nodo " + String(i+1) + " (" + String(buffer_rx.datos[i].hectarea) +
        ") sin transmitir hace 2 horas");
      alerta_nodo_enviada[i] = true;
    }
    if (!caido) alerta_nodo_enviada[i] = false;

    // ── Batería baja ────────────────────────────────────────
    bool bat_baja = buffer_rx.datos[i].bateria_pct <= ALERTA_BATERIA_PCT;
    if (bat_baja && !alerta_bateria_enviada[i]) {
      enviar_alerta("alerta_bateria",
        "🔋 Bateria baja Nodo " + String(i+1) +
        " (" + String(buffer_rx.datos[i].hectarea) + "): " +
        String(buffer_rx.datos[i].bateria_pct) + "%");
      alerta_bateria_enviada[i] = true;
    }
    if (!bat_baja) alerta_bateria_enviada[i] = false;

    // ── Humedad bajo umbral — solo en Modo Manual ───────────
    float umbral = 0;
    for (int e = 0; e < NUM_ETAPAS; e++)
      if (dds >= ETAPAS[e].dds_ini && dds < ETAPAS[e].dds_fin)
        { umbral = ETAPAS[e].umbral_riego; break; }

    bool hum_baja = (umbral > 0 && buffer_rx.datos[i].humedad_suelo < umbral);

    if (modo_riego == 2) {
      // Manual — farmer tiene que intervenir manualmente
      if (hum_baja && !alerta_humedad_enviada[i]) {
        enviar_alerta("alerta_humedad",
          "⚠️ Humedad baja Nodo " + String(i+1) +
          " (" + String(buffer_rx.datos[i].hectarea) + "): " +
          String(buffer_rx.datos[i].humedad_suelo, 1) +
          "% < " + String(umbral, 1) +
          "% — activa riego desde la web");
        alerta_humedad_enviada[i] = true;
      }
    } else {
      // Inteligente o Automático — el sistema actúa solo
      alerta_humedad_enviada[i] = false;
    }

    if (!hum_baja) alerta_humedad_enviada[i] = false;
  }

  // ── Relé encendido demasiado tiempo ────────────────────────
  for (int i = 0; i < 4; i++) {
    if (!relay_estado[i]) { alerta_rele_enviada[i] = false; continue; }
    bool overtime = (millis() - relay_tiempo_inicio[i]) > ALERTA_RELE_MAX_MS;
    if (overtime && !alerta_rele_enviada[i]) {
      enviar_alerta("alerta_rele",
        "⏱️ Rele " + String(i+1) +
        " lleva demasiado tiempo encendido — verificar sistema");
      alerta_rele_enviada[i] = true;
    }
  }

  // ── InfluxDB sin conexión ──────────────────────────────────
  bool influx_timeout = (ultimo_influx_ok > 0 &&
                         millis() - ultimo_influx_ok > ALERTA_INFLUX_TIMEOUT_MS);
  if (influx_timeout && !alerta_influx_enviada) {
    enviar_alerta("alerta_influx",
      "📡 Backend web sin conexion — datos en cola: " + String(cola_count));
    alerta_influx_enviada = true;
  }
  if (!influx_timeout) alerta_influx_enviada = false;
}

// ── Procesar mensaje ─────────────────────────────────────
void procesar_mensaje(struct_message &mensaje) {
  ResultadoValidacion rv = validar_mensaje(mensaje);
  if (!rv.valido) {
    Serial.printf("[VALIDACION FALLO] Nodo %d — %s\n",
                  mensaje.nodo_id, rv.motivo.c_str());
    return;
  }
  // Si es Nodo 1 — recibir lluvia del pluviómetro
  if (mensaje.nodo_id == 1) {
    estacion.lluvia_mm       = mensaje.lluvia_mm;
    estacion.lluvia_acum_mm += mensaje.lluvia_mm;
    prefs.putFloat("lluvia_acum", estacion.lluvia_acum_mm);
    Serial.printf("  Lluvia Nodo 1: %.2f mm | Acum: %.1f mm\n",
                  mensaje.lluvia_mm, estacion.lluvia_acum_mm);
  }

  msg_count++;
  int idx = mensaje.nodo_id - 1;
  if (idx >= 0 && idx < NUM_NODOS) {
    memcpy(&buffer_rx.datos[idx], &mensaje, sizeof(mensaje));
    buffer_rx.datos_nuevos[idx]        = true;
    buffer_rx.timestamp_ultima_rx[idx] = millis();
  }

  Serial.printf("\n[RX #%lu] Nodo %d (%s) | DDS:%d | %s\n",
                msg_count, mensaje.nodo_id, mensaje.hectarea,
                get_dds(), get_etapa(get_dds()));
  Serial.printf("  Suelo: %.1fC | Hum: %.1f%% | Bat: %d%%\n",
                mensaje.temp_suelo, mensaje.humedad_suelo, mensaje.bateria_pct);

  if (WiFi.status() != WL_CONNECTED) encolar_mensaje(mensaje);
  else guardar_sensores_suelo(mensaje);
}

// ── Comandos desde la web ────────────────────────────────
// Reemplaza a los BLYNK_WRITE: cada pocos segundos la Estación le pregunta
// al backend si hay comandos pendientes para sus 4 nodos, los aplica y
// los confirma todos en una sola llamada.
//   tipo "rele"  -> valor "1"/"0": enciende/apaga el relé del nodo
//   tipo "riego" -> valor "inteligente"/"automatico"/"manual": modo global
void aplicar_comando(const String &tipo, const String &ident, const String &valor) {
  if (tipo == "rele") {
    int idx = ident.toInt() - 1;
    if (idx < 0 || idx >= NUM_NODOS) return;
    bool v = (valor == "1" || valor == "true");
    relay_estado[idx]           = v;
    relay_cambio[idx]           = true;
    relay_tiempo_calculado[idx] = 0;
    led_estado = v;
    led_cambio = true;
    Serial.printf("[WEB] Rele %d -> %s\n", idx + 1, v ? "ON" : "OFF");

  } else if (tipo == "riego") {
    if      (valor == "inteligente" || valor == "0") modo_riego = 0;
    else if (valor == "automatico"  || valor == "1") modo_riego = 1;
    else if (valor == "manual"      || valor == "2") modo_riego = 2;
    else return;
    const char* modos[] = {"Inteligente", "Automatico", "Manual"};
    Serial.printf("[WEB] Modo de riego -> %s\n", modos[modo_riego]);
  }
}

void consultar_comandos() {
  String resp;
  if (!api_get("/estacion/comandos-pendientes", resp)) return;

  String ids = "";
  int i = resp.indexOf('[');
  while (i >= 0 && (i = resp.indexOf('{', i)) >= 0) {
    int f = resp.indexOf('}', i);
    if (f < 0) break;
    String obj = resp.substring(i, f + 1);
    i = f + 1;

    int comando_id = extraer_int(obj, "comando_id");
    if (comando_id <= 0) continue;

    aplicar_comando(extraer_string(obj, "tipo_comando"),
                    extraer_string(obj, "identificador_nodo"),
                    extraer_string(obj, "valor"));

    if (ids.length() > 0) ids += ",";
    ids += String(comando_id);
  }

  if (ids.length() > 0) {
    String json = "{\"comando_ids\":[" + ids + "]}";
    api_post("/estacion/comandos/confirmar", json);
  }
}

// ── HTTP Handlers ─────────────────────────────────────────
void handleDatos() {
  if (!server.hasArg("plain")) { server.send(400, "text/plain", "Sin cuerpo"); return; }
  String body = server.arg("plain");

  struct_message mensaje;
  memset(&mensaje, 0, sizeof(mensaje));   // evita basura en lluvia_mm
  mensaje.nodo_id       = extraer_int(body,   "nodo_id");
  mensaje.temp_suelo    = extraer_float(body, "temp_suelo");
  mensaje.humedad_suelo = extraer_float(body, "humedad_suelo");
  mensaje.bateria_pct   = extraer_int(body,   "bateria_pct");
  mensaje.lluvia_mm     = extraer_float(body, "lluvia_mm");  // solo lo manda el Nodo 1
  mensaje.timestamp     = millis();

  String ha = extraer_string(body, "hectarea");
  ha.toCharArray(mensaje.hectarea, 20);

  if (mensaje.nodo_id < 1 || mensaje.nodo_id > NUM_NODOS) {
    server.send(400, "text/plain", "nodo_id invalido");
    return;
  }
  procesar_mensaje(mensaje);
  server.send(200, "text/plain", "OK");
}

void handleStatus() {
  int dds = get_dds();
  String json = "{";
  json += "\"dds\":"          + String(dds) + ",";
  json += "\"etapa\":\""      + String(get_etapa(dds)) + "\",";
  json += "\"nodos_activos\":" + String(estado_campo.nodos_activos) + ",";
  json += "\"temp_suelo\":"    + String(estado_campo.temp_suelo_promedio, 1) + ",";
  json += "\"hum_suelo\":"     + String(estado_campo.humedad_suelo_promedio, 1) + ",";
  json += "\"temp_ambiente\":" + String(estacion.temp_ambiente, 1) + ",";
  json += "\"hum_ambiente\":"  + String(estacion.humedad_ambiente, 1) + ",";
  json += "\"lluvia_mm\":"     + String(estacion.lluvia_mm, 1) + ",";
  json += "\"lluvia_acum\":"   + String(estacion.lluvia_acum_mm, 1) + ",";
  json += "\"cola\":"          + String(cola_count) + ",";
  json += "\"reles\":[";
  for (int i = 0; i < 4; i++) {
    json += String(relay_estado[i] ? 1 : 0);
    if (i < 3) json += ",";
  }
  json += "]}";
  server.send(200, "application/json", json);
}

// ── Estado del campo ─────────────────────────────────────
void actualizar_estado_campo() {
  float hs = 0, ts = 0;
  int   activos = 0;
  for (int i = 0; i < NUM_NODOS; i++) {
    if (millis() - buffer_rx.timestamp_ultima_rx[i] < 300000UL) {
      hs += buffer_rx.datos[i].humedad_suelo;
      ts += buffer_rx.datos[i].temp_suelo;
      activos++;
    }
  }
  if (activos > 0) {
    estado_campo.humedad_suelo_promedio = hs / activos;
    estado_campo.temp_suelo_promedio    = ts / activos;
    estado_campo.nodos_activos          = activos;
  }
}

// ── Setup ────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.setTxBufferSize(1024);
  delay(1000);

  tiempo_arranque_ms = millis();
  ultimo_inferencia  = millis();

  prefs.begin("riego", false);
  estacion.lluvia_acum_mm = prefs.getFloat("lluvia_acum", 0.0);
  estacion.temp_max_24h   = prefs.getFloat("t_max_24h",  25.0);
  estacion.temp_min_24h   = prefs.getFloat("t_min_24h",  10.0);

  if (!prefs.isKey("dds_base"))
    prefs.putInt("dds_base", DDS_OFFSET_INICIAL);

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  for (int i = 0; i < 4; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], LOW);
  }
 /*
  SPI.begin(18, 19, 23, LORA_SS);
  pinMode(LORA_RST, OUTPUT);
  digitalWrite(LORA_RST, LOW);  delay(10);
  digitalWrite(LORA_RST, HIGH); delay(10);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("ERROR: LoRa no inicio");
    while (1);
  }
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.enableCrc();
   */

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, pass);
  Serial.printf("aqui conectandome a wifi");

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500); Serial.print("."); intentos++;
  }
  Serial.printf("\nWiFi: %s\n", WiFi.status() == WL_CONNECTED ?
                WiFi.localIP().toString().c_str() : "FALLO");

  server.on("/datos",       HTTP_POST, handleDatos);
  server.on("/status",      HTTP_GET,  handleStatus);
  server.on("/reset_lluvia",HTTP_GET,  []() {
    estacion.lluvia_acum_mm = 0.0;
    prefs.putFloat("lluvia_acum", 0.0);
    server.send(200, "text/plain", "Lluvia reseteada a 0");
    Serial.println("[RESET] Lluvia acumulada reseteada");
  });
  server.on("/reset_dds", HTTP_GET, []() {
  prefs.putInt("dds_base", 0);
  tiempo_arranque_ms = millis();
  server.send(200, "text/plain", "DDS reseteado a 0 — nueva temporada");
  Serial.println("[RESET] DDS reseteado — nueva temporada");
});
server.on("/reset_historial", HTTP_GET, []() {
  for (int i = 0; i < 4; i++) {
    String pn = "n" + String(i);
    prefs.putInt(("dias_r_" + pn).c_str(), 0);
    prefs.putFloat(("agua_" + pn + "_d0").c_str(), 75.0);
    prefs.putFloat(("agua_" + pn + "_d1").c_str(), 73.0);
    prefs.putFloat(("agua_" + pn + "_d2").c_str(), 71.0);
  }
  for (int d = 0; d <= 6; d++) {
    prefs.putFloat(("eto_d"    + String(d)).c_str(), 6.5);
    prefs.putFloat(("lluvia_d" + String(d)).c_str(), 0.0);
  }
  server.send(200, "text/plain", "Historial reseteado con valores realistas");
  Serial.println("[RESET] Historial reseteado");
});
  server.begin();

  Serial.printf("Backend: %s\n", API_BASE_URL);

  Serial.println("Sistema listo — TinyML activo\n");
}

// ── Loop ─────────────────────────────────────────────────
void loop() {
  server.handleClient();

  bool wifi_ahora = (WiFi.status() == WL_CONNECTED);

  static unsigned long ultimo_reconnect = 0;
  if (!wifi_ahora && millis() - ultimo_reconnect > 5000UL) {
    ultimo_reconnect = millis();
    WiFi.reconnect();
    Serial.println("[WiFi] Intentando reconectar...");
  }

  if (wifi_ahora && !wifi_previo) {
    Serial.println("[WiFi] Conexion restaurada — vaciando cola");
    delay(500);
    vaciar_cola();
  }
  wifi_previo = wifi_ahora;

  // ── Comandos desde la web (reemplaza a los BLYNK_WRITE) ──
  static unsigned long ultimo_poll = 0;
  if (wifi_ahora && millis() - ultimo_poll >= INTERVALO_POLL_COMANDOS_MS) {
    ultimo_poll = millis();
    consultar_comandos();
  }


/*
  // ── LoRa RX ──────────────────────────────────────────
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    struct_message mensaje;
    int len = 0;
    while (LoRa.available()) {
      ((uint8_t*)&mensaje)[len++] = LoRa.read();
      if (len >= sizeof(mensaje)) break;
    }
    if (len != sizeof(struct_message))
      Serial.printf("Paquete corrupto (%d bytes)\n", len);
    else if (mensaje.nodo_id < 1 || mensaje.nodo_id > NUM_NODOS)
      Serial.printf("Nodo invalido: %d\n", mensaje.nodo_id);
    else {
      Serial.printf("[LoRa] RSSI: %d dBm\n", LoRa.packetRssi());
      procesar_mensaje(mensaje);
    }
  }
   */

  // ── Relés manuales (web) + timer automático TinyML ──
  for (int i = 0; i < 4; i++) {
    // Timer auto-apagado TinyML
    if (relay_estado[i] && relay_tiempo_calculado[i] > 0) {
      float elapsed = (millis() - relay_tiempo_inicio[i]) / 60000.0f;
      if (elapsed >= relay_tiempo_calculado[i]) {
        Serial.printf("[AUTO] Rele %d apagado — %.1f min completados\n",
                      i + 1, elapsed);
        relay_estado[i]           = false;
        relay_cambio[i]           = true;
        relay_tiempo_calculado[i] = 0;
        // el estado del relé se publica a la web en guardar_evento_riego()
      }
    }

    if (relay_cambio[i]) {
      relay_cambio[i] = false;
      bool enc = relay_estado[i];
      digitalWrite(RELAY_PINS[i], enc ? HIGH : LOW);

      if (enc) {
        relay_tiempo_inicio[i] = millis();
        relay_hum_inicio[i]    = buffer_rx.datos[i].humedad_suelo;
        guardar_evento_riego(i, true);
      } else {
        float dur = (millis() - relay_tiempo_inicio[i]) / 60000.0f;
        guardar_evento_riego(i, false, buffer_rx.datos[i].humedad_suelo, dur);
      }
      Serial.printf("Rele %d: %s\n", i + 1, relay_estado[i] ? "ON" : "OFF");
    }
  }

  if (led_cambio) {
    led_cambio = false;
    digitalWrite(LED_BUILTIN, led_estado ? HIGH : LOW);
  }

  // ── Inferencia diaria según modo ─────────────────────────
if (millis() - ultimo_inferencia >= INTERVALO_INFERENCIA) {
  ultimo_inferencia = millis();

  if (modo_riego == 0) {
    Serial.println("[MODO] Inteligente — corriendo TinyML");
    ejecutar_inferencia_diaria();
  } else if (modo_riego == 1) {
    Serial.println("[MODO] Automatico — umbrales fijos");
    ejecutar_modo_automatico();
  } else {
    Serial.println("[MODO] Manual — farmer decide");
    // No hace nada automaticamente
    // El farmer controla los reles desde la web
  }
}

  // ── Ciclo de 60 segundos ──────────────────────────────
  if (millis() - ultimo_update > 60000UL) {
    ultimo_update = millis();

    prefs.putInt("dds_base", get_dds());

    leer_estacion();
    prefs.putFloat("t_max_24h", estacion.temp_max_24h);
    prefs.putFloat("t_min_24h", estacion.temp_min_24h);

    ResultadoValidacion rv = validar_estacion(estacion);
    if (rv.valido) {
      if (!wifi_ahora) encolar_estacion(estacion);
      else {
        guardar_sensores_estacion();
        actualizar_estado_campo();
      }
    } else {
      Serial.printf("[ESTACION FALLO] %s\n", rv.motivo.c_str());
    }

    static unsigned long ultimo_intento_cola = 0;
    if (cola_count > 0 && millis() - ultimo_intento_cola > 30000UL) {
      ultimo_intento_cola = millis();
      vaciar_cola();
    }

    verificar_alertas();

    Serial.printf("[STATUS] DDS:%d | %s | TS:%.1fC | HS:%.1f%% | TA:%.1fC | HA:%.1f%% | Nodos:%d | Cola:%d | ETo:%.2f\n",
                  get_dds(), get_etapa(get_dds()),
                  estado_campo.temp_suelo_promedio,
                  estado_campo.humedad_suelo_promedio,
                  estacion.temp_ambiente,
                  estacion.humedad_ambiente,
                  estado_campo.nodos_activos,
                  cola_count,
                  calcular_eto());
  }

  delay(5);
}