import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leerPreferenciasAvisos, tiempoLectura } from './avisosUtils';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');
async function consultar(ruta) {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  if (!token) throw new Error('La sesión expiró. Vuelve a iniciar sesión.');
  const response = await fetch(`${API_URL}/api${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    if (response.status === 404) return null;
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || payload.msg || `HTTP ${response.status}`);
  }
  return response.json();
}

// Muestra únicamente avisos derivados de lecturas reales recientes.
// Nunca representa notificaciones por correo o historial de alertas persistidas.
export default function Notificaciones({ parcelaId, style, onOpen }) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [avisos, setAvisos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [historialError, setHistorialError] = useState('');
  const [detalle, setDetalle] = useState('');
  const [ultimaConsulta, setUltimaConsulta] = useState(null);

  const actualizar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      let id = parcelaId;
      if (!id) {
        const parcelas = await consultar('/parcelas');
        const lista = Array.isArray(parcelas) ? parcelas : parcelas?.parcelas ?? [];
        id = lista[0]?.id;
      }
      if (!id) {
        setAvisos([]);
        setDetalle('No hay parcelas disponibles.');
        return;
      }
      const [actual, respuestaConfig, respuestaHistorial] = await Promise.all([
        consultar(`/sensores/actual?parcela_id=${encodeURIComponent(id)}`),
        consultar(`/alertas/config?parcela_id=${encodeURIComponent(id)}`).catch(() => null),
        consultar(`/alertas/historial?parcela_id=${encodeURIComponent(id)}`).catch(e => ({ error: e.message })),
      ]);
      setHistorial(Array.isArray(respuestaHistorial?.alertas) ? respuestaHistorial.alertas : []);
      setHistorialError(respuestaHistorial?.error || (respuestaHistorial == null ? 'Historial no disponible en el backend.' : ''));
      const config = respuestaConfig?.configuracion || null;
      const nodos = Array.isArray(actual?.nodos) ? actual.nodos : [];
      const prefs = leerPreferenciasAvisos();
      const nuevos = [];
      const limiteSuelo = Number(config?.humedad_suelo_min);
      const limiteTemperatura = Number(config?.temperatura_min);
      let recientes = 0;
      for (const nodo of nodos) {
        if (!tiempoLectura(nodo.fecha_lectura)) continue;
        recientes += 1;
        if (prefs.suelo && config && config.activa && Number.isFinite(limiteSuelo) && nodo.humedad_suelo != null && Number(nodo.humedad_suelo) < limiteSuelo) {
          nuevos.push({ id: `suelo-${nodo.nodo_id}`, titulo: 'Humedad de suelo baja', texto: `${nodo.identificador || `Nodo ${nodo.nodo_id}`}: ${nodo.humedad_suelo}% (mínimo ${limiteSuelo}%).`, ruta: `/nodos/${nodo.nodo_id}` });
        }
        if (prefs.bateria && nodo.bateria_pct != null && Number(nodo.bateria_pct) < 20) {
          nuevos.push({ id: `bateria-${nodo.nodo_id}`, titulo: 'Batería baja', texto: `${nodo.identificador || `Nodo ${nodo.nodo_id}`}: ${nodo.bateria_pct}% (umbral visual 20%).`, ruta: `/nodos/${nodo.nodo_id}` });
        }
      }
      const estacion = actual?.estacion || {};
      if (config && config.activa && Number.isFinite(limiteTemperatura) && estacion.temp_ambiente != null && Number(estacion.temp_ambiente) < limiteTemperatura && (!estacion.fecha_lectura || tiempoLectura(estacion.fecha_lectura))) {
        nuevos.push({ id: 'temperatura', titulo: 'Temperatura ambiental baja', texto: `${estacion.temp_ambiente} °C (mínimo ${limiteTemperatura} °C).`, ruta: '/dashboard' });
      }
      setAvisos(nuevos);
      setUltimaConsulta(new Date());
      setDetalle(`${recientes} lectura(s) de suelo recientes. ${config ? 'Umbrales consultados de la parcela.' : 'Sin configuración de alertas disponible.'}`);
    } catch (e) {
      setError(e.message || 'No fue posible consultar los avisos.');
      setAvisos([]);
      setHistorial([]);
    } finally {
      setCargando(false);
    }
  }, [parcelaId]);

  useEffect(() => {
    if (!abierto) return;
    actualizar();
    const intervalo = setInterval(actualizar, 60000);
    return () => clearInterval(intervalo);
  }, [abierto, actualizar]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" title="Consultar avisos actuales" aria-label="Abrir notificaciones" aria-expanded={abierto}
        onClick={() => { setAbierto(x => !x); onOpen?.(); }}
        style={{ ...style, border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontFamily: 'inherit' }}>
        🔔
      </button>
      {abierto && (
        <div role="dialog" aria-label="Avisos de la parcela" style={{ position: 'absolute', right: -45, top: 'calc(100% + 13px)', width: 'min(350px, 88vw)', maxHeight: '68vh', overflowY: 'auto', padding: 16, background: '#fff', color: '#28332a', border: '1px solid #dce6d5', borderRadius: 12, boxShadow: '0 12px 35px rgba(0,0,0,0.22)', zIndex: 2000, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <strong style={{ fontSize: 17 }}>Avisos de monitoreo</strong>
            <button type="button" aria-label="Cerrar avisos" onClick={() => setAbierto(false)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: 20 }}>×</button>
          </div>
          <p style={{ color: '#68746b', margin: '6px 0 10px' }}>Basados en lecturas actuales; no son correos enviados ni el historial de MySQL.</p>
          <button type="button" onClick={actualizar} disabled={cargando} style={{ border: '1px solid #7A9D54', borderRadius: 6, padding: '6px 9px', color: '#2F5413', background: '#f5faef', cursor: cargando ? 'wait' : 'pointer' }}>{cargando ? 'Consultando...' : '↻ Actualizar'}</button>
          {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
          {!error && !cargando && avisos.length === 0 && <p style={{ padding: '9px 0' }}>Sin condiciones críticas detectadas en las lecturas consultadas.</p>}
          {!error && avisos.map(a => <Link key={a.id} to={a.ruta} onClick={() => setAbierto(false)} style={{ display: 'block', textDecoration: 'none', color: '#24391f', background: '#fff4ee', padding: '10px 9px', marginTop: 8, borderRadius: 7, borderLeft: '3px solid #d78438' }}><strong>{a.titulo}</strong><div>{a.texto}</div></Link>)}
          <div style={{ borderTop: '1px solid #e3e9df', marginTop: 12, paddingTop: 12 }}>
            <strong>Historial de alertas registradas</strong>
            {historialError && <p style={{ color: '#b42318', fontSize: 12 }}>{historialError}</p>}
            {!historialError && !cargando && historial.length === 0 && <p>No hay alertas almacenadas para esta parcela.</p>}
            {historial.slice(0, 10).map(alerta => (
              <div key={alerta.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                <strong>{alerta.tipo_alerta === 'suelo_seco' ? 'Suelo seco' : alerta.tipo_alerta === 'temperatura_baja' ? 'Temperatura baja' : alerta.tipo_alerta}</strong>
                <span style={{ float: 'right', fontSize: 11, color: '#666' }}>{alerta.estado}</span>
                <div style={{ color: '#4d574e' }}>{alerta.nodo_id ? `Nodo ${alerta.nodo_id} · ` : ''}{alerta.valor_detectado} {alerta.tipo_alerta === 'suelo_seco' ? '%' : '°C'}</div>
                <div style={{ color: '#777', fontSize: 11 }}>{alerta.fecha_deteccion ? new Date(alerta.fecha_deteccion).toLocaleString('es-MX') : 'Sin fecha'}</div>
              </div>
            ))}
          </div>
          <div style={{ color: '#68746b', borderTop: '1px solid #e8ede4', paddingTop: 9, marginTop: 12 }}>
            {detalle}<div>{ultimaConsulta ? `Consultado: ${ultimaConsulta.toLocaleTimeString('es-MX')}` : ''}</div>
          </div>
          <Link to="/config-general" onClick={() => setAbierto(false)} style={{ display: 'inline-block', color: '#2F5413', marginTop: 12 }}>Configurar umbrales →</Link>
        </div>
      )}
    </div>
  );
}
