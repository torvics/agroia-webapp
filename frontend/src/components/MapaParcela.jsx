import { useState } from 'react';
import { leerCoordenadas } from '../utils/validaciones';

// Acepta la ubicación guardada como texto «lat, lon» o como objeto {lat, lng}.
const coordenadasDeParcela = (ubicacion) => {
  if (ubicacion && typeof ubicacion === 'object') {
    const lat = Number(ubicacion.lat ?? ubicacion.latitud);
    const lng = Number(ubicacion.lng ?? ubicacion.lon ?? ubicacion.longitud);
    if (Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180) return { lat, lng };
    return null;
  }
  return typeof ubicacion === 'string' ? leerCoordenadas(ubicacion.trim()) : null;
};

/**
 * Mapa de una parcela. Siempre abre centrado en las coordenadas GUARDADAS de la
 * parcela con su marcador. La ubicación del dispositivo es una consulta aparte que
 * solo se pide al pulsar «Mi ubicación actual» y nunca sustituye a la de la parcela.
 * `cargando` permite al llamador indicar que aún está obteniendo la parcela.
 */
export default function MapaParcela({ parcela, onClose, cargando = false }) {
  const nombre = parcela?.nombre || 'Parcela';
  const ubicacion = typeof parcela?.ubicacion === 'string' ? parcela.ubicacion.trim() : '';
  const registrada = coordenadasDeParcela(parcela?.ubicacion);
  const [gps, setGps] = useState(null);
  const [modo, setModo] = useState('parcela');
  const [estado, setEstado] = useState('');

  const detectar = () => {
    setModo('gps');
    if (!navigator.geolocation || !window.isSecureContext) {
      setEstado('Para detectar tu posición usa HTTPS o localhost y habilita ubicación en el navegador.');
      return;
    }
    setEstado('Solicitando permiso de ubicación...');
    navigator.geolocation.getCurrentPosition(
      posicion => {
        setGps({ lat: posicion.coords.latitude, lng: posicion.coords.longitude, precision: posicion.coords.accuracy });
        setEstado('Ubicación de este dispositivo detectada.');
      },
      error => setEstado(error.code === 1 ? 'Permiso de ubicación denegado.' : 'No fue posible detectar tu ubicación. Revisa el GPS y los permisos.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  const punto = modo === 'gps' ? gps : registrada;
  const consulta = punto ? `${punto.lat},${punto.lng}` : '';
  const enlace = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&z=16&output=embed`;

  let aviso = null;
  if (modo === 'parcela' && cargando) aviso = 'Cargando la ubicación guardada de la parcela...';
  else if (modo === 'parcela' && !registrada) {
    aviso = ubicacion
      ? `La ubicación guardada («${ubicacion}») no son coordenadas válidas «latitud, longitud». Edita la parcela para corregirla; no se muestra una ubicación aproximada.`
      : 'Esta parcela no tiene coordenadas guardadas. Edita la parcela y registra «latitud, longitud» para verla en el mapa.';
  } else if (modo === 'gps' && !gps) aviso = `Esperando ubicación del dispositivo. ${estado}`;

  return (
    <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{position:'fixed', inset:0, background:'rgba(0,0,0,.55)',zIndex:3000,display:'grid',placeItems:'center',padding:16}}>
      <div role="dialog" aria-modal="true" aria-label={`Mapa de ${nombre}`} style={{width:'min(760px,100%)',maxHeight:'90vh',overflowY:'auto',boxSizing:'border-box',background:'#fff',borderRadius:14,padding:20,color:'#2d392d',boxShadow:'0 18px 40px rgba(0,0,0,.24)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><h2 style={{margin:0,fontSize:21,overflowWrap:'anywhere'}}>🗺️ {nombre}</h2><button type="button" aria-label="Cerrar mapa" onClick={onClose} style={{border:0,background:'transparent',cursor:'pointer',fontSize:26}}>×</button></div>
        <p style={{fontSize:13,overflowWrap:'anywhere'}}><b>Ubicación registrada de la parcela:</b> {cargando ? 'cargando...' : (ubicacion || 'Sin ubicación guardada')}</p>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
          <button type="button" onClick={() => setModo('parcela')} style={boton(modo==='parcela')}>🌱 Parcela registrada</button>
          <button type="button" onClick={() => (gps ? setModo('gps') : detectar())} style={boton(modo==='gps')}>📍 Mi ubicación actual</button>
          {modo === 'gps' && <button type="button" onClick={detectar} style={boton(false)}>↻ Volver a detectar</button>}
        </div>
        {aviso ? <div role="status" style={{background: modo==='parcela' && !cargando ? '#fff6e8' : '#f5f8f4',color: modo==='parcela' && !cargando ? '#7a4a0c' : 'inherit',padding:18,borderRadius:8}}>{aviso}</div> : (
          <iframe key={consulta} title={modo === 'gps' ? 'Ubicación del dispositivo en Google Maps' : `Ubicación de ${nombre} en Google Maps`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={embed} style={{width:'100%',height:'min(50vh,380px)',border:'1px solid #d6ded0',borderRadius:8}} />
        )}
        {modo==='parcela' && registrada && <p style={{fontSize:12,color:'#586b54'}}>Marcador en {registrada.lat.toFixed(6)}, {registrada.lng.toFixed(6)} (coordenadas guardadas de la parcela).</p>}
        {gps && modo==='gps' && <p style={{fontSize:12,color:'#586b54'}}>Ubicación detectada del dispositivo: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} · Precisión aproximada: {Math.round(gps.precision)} m. No se ha guardado como parcela.</p>}
        {modo==='gps' && estado && gps && <p role="status" style={{fontSize:12,color:'#586b54'}}>{estado}</p>}
        {punto && <a href={enlace} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',marginTop:12,color:'#2F5413',fontWeight:600}}>Abrir en Google Maps ↗</a>}
      </div>
    </div>
  );
}
function boton(activo) { return {padding:'9px 12px',border:'1px solid #b9c9b0',borderRadius:7,cursor:'pointer',background:activo?'#2F5413':'#fff',color:activo?'#fff':'#2F5413'}; }
