// Preferencias de avisos exclusivamente visuales, almacenadas en este navegador.
// No cambian la configuración SMTP ni crean alertas en MySQL.
export function leerPreferenciasAvisos() {
  try {
    const datos = JSON.parse(localStorage.getItem('agroia_avisos_visuales') || '{}');
    return { suelo: datos.suelo !== false, bateria: datos.bateria !== false };
  } catch {
    return { suelo: true, bateria: true };
  }
}
export function guardarPreferenciasAvisos(preferencias) {
  localStorage.setItem('agroia_avisos_visuales', JSON.stringify(preferencias));
  window.dispatchEvent(new Event('agroia:preferencias-avisos'));
}
export function tiempoLectura(fecha) {
  const timestamp = Date.parse(fecha || '');
  return Number.isFinite(timestamp) && timestamp <= Date.now() + 60000 && Date.now() - timestamp <= 15 * 60000;
}
