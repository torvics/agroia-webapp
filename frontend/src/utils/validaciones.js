// Validadores compartidos. Mismas reglas que backend/app/utils/validaciones.py.
// Cada función devuelve un mensaje de error, o "" si el valor es válido.

const LETRA = /\p{L}/gu;
const contarLetras = (texto) => (texto.match(LETRA) || []).length;

export const MENSAJE_NOMBRE_PERSONA =
  "El nombre debe tener de 2 a 60 caracteres, al menos dos letras y solo letras (incluidas tildes y ñ), espacios, guion o apóstrofo.";
export const MENSAJE_PASSWORD =
  "La contraseña debe tener de 12 a 128 caracteres, incluir al menos una letra y un número, y no empezar ni terminar con espacios.";
export const MENSAJE_NOMBRE_PARCELA =
  "El nombre de la parcela debe tener de 2 a 100 caracteres, incluir al menos dos letras y no estar formado solo por números o signos (ej. «Parcela 3 Norte»).";
export const MENSAJE_COORDENADAS =
  "La ubicación debe tener el formato «latitud, longitud», por ejemplo 29.086200, -110.951200 (latitud de -90 a 90 y longitud de -180 a 180).";
export const MENSAJE_CORREO = "Introduce un correo válido (ej. usuario@dominio.com).";

const RE_NOMBRE_PERSONA = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;
const RE_NOMBRE_PARCELA = /^[\p{L}\p{N}_][\p{L}\p{N}_ .,#'’()/-]*$/u;
const RE_COORDENADAS = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
const RE_CORREO = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function validarNombrePersona(valor) {
  const nombre = String(valor ?? "").trim();
  if (nombre.length < 2 || nombre.length > 60 || contarLetras(nombre) < 2 || !RE_NOMBRE_PERSONA.test(nombre)) {
    return MENSAJE_NOMBRE_PERSONA;
  }
  return "";
}

// Política para contraseñas nuevas (el inicio de sesión no la aplica).
export function validarPassword(valor) {
  const clave = typeof valor === "string" ? valor : "";
  if (
    clave.length < 12 || clave.length > 128 || clave !== clave.trim() ||
    contarLetras(clave) < 1 || !/\d/.test(clave)
  ) {
    return MENSAJE_PASSWORD;
  }
  return "";
}

export function validarNombreParcela(valor) {
  const nombre = String(valor ?? "").trim().replace(/\s+/g, " ");
  if (nombre.length < 2 || nombre.length > 100 || contarLetras(nombre) < 2 || !RE_NOMBRE_PARCELA.test(nombre)) {
    return MENSAJE_NOMBRE_PARCELA;
  }
  return "";
}

// Devuelve { lat, lng } si el texto es una coordenada válida; si no, null.
export function leerCoordenadas(valor) {
  if (typeof valor !== "string") return null;
  const m = valor.match(RE_COORDENADAS);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

export function validarCoordenadas(valor, { obligatorio = false } = {}) {
  const texto = String(valor ?? "").trim();
  if (!texto) return obligatorio ? MENSAJE_COORDENADAS : "";
  return leerCoordenadas(texto) ? "" : MENSAJE_COORDENADAS;
}

export function validarCorreo(valor, { opcional = false, maximo = 150 } = {}) {
  const correo = String(valor ?? "").trim();
  if (!correo) return opcional ? "" : MENSAJE_CORREO;
  if (correo.length > maximo || !RE_CORREO.test(correo)) return MENSAJE_CORREO;
  return "";
}
