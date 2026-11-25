// Fechas de la aplicación. Mismo criterio que backend/app/utils/fechas.py:
// ningún día puede ser posterior a «hoy» en America/Hermosillo.
export const ZONA_HORARIA_APP = "America/Hermosillo";
// Hermosillo no usa horario de verano: UTC-7 todo el año.
const DESFASE_APP = "-07:00";

export const MENSAJE_FECHA_FUTURA =
  "No se permiten fechas posteriores a hoy (hora de Hermosillo).";

const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA_APP,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Hoy en la zona de la aplicación, como AAAA-MM-DD (valor de <input type="date">).
export function hoyApp(ahora = new Date()) {
  return formatoDia.format(ahora);
}

export function esFechaValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto || "")) return false;
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

// Suma días a una fecha AAAA-MM-DD sin depender de la zona del navegador.
export function sumarDias(texto, dias) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

// Límites del día en la zona de la aplicación.
export function inicioDiaApp(texto) {
  return new Date(`${texto}T00:00:00${DESFASE_APP}`);
}

export function finDiaApp(texto) {
  return new Date(`${texto}T23:59:59.999${DESFASE_APP}`);
}

// Devuelve "" si el rango es válido o el mensaje de error.
export function validarRangoFechas(desde, hasta, ahora = new Date()) {
  if (!esFechaValida(desde) || !esFechaValida(hasta)) {
    return "Selecciona fechas válidas.";
  }
  const hoy = hoyApp(ahora);
  if (desde > hoy || hasta > hoy) return MENSAJE_FECHA_FUTURA;
  if (desde > hasta) {
    return "La fecha inicial no puede ser posterior a la fecha final.";
  }
  return "";
}
