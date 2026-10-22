import { useEffect, useState } from 'react';

const leerCoordenadas = (ubicacion) => {
  if (ubicacion && typeof ubicacion === 'object') {
    const lat = Number(ubicacion.lat ?? ubicacion.latitud);
    const lng = Number(ubicacion.lng ?? ubicacion.lon ?? ubicacion.longitud);
    if (Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180) return { lat, lng };
  }
  if (typeof ubicacion !== 'string') return null;
  const match = ubicacion.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]); const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};

export default function MapaParcela({ parcela, onClose }) {
  const nombre = parcela?.nombre || 'Parcela';
  const ubicacion = typeof parcela?.ubicacion === 'string' ? parcela.ubicacion.trim() : '';
  const [gps, setGps] = useState(null);
  const [modo, setModo] = useState('gps');
  const [estado, setEstado] = useState('');
  const registrada = leerCoordenadas(parcela?.ubicacion);

  const detectar = () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setEstado('Para detectar tu posición usa HTTPS o localhost y habilita ubicación en el navegador.');
      return;
    }
    setEstado('Solicitando permiso de ubicación...');
    navigator.geolocation.getCurrentPosition(
      posicion => {
        setGps({ lat: posicion.coords.latitude, lng: posicion.coords.longitude, precision: posicion.coords.accuracy });
        setModo('gps'); setEstado('Ubicación de este dispositivo detectada.');
      },
      error => setEstado(error.code === 1 ? 'Permiso de ubicación denegado. Puedes usar el mapa de la parcela registrada.' : 'No fue posible detectar tu ubicación. Revisa el GPS y los permisos.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  // El usuario abrió el mapa voluntariamente; el navegador solicita permiso GPS.
  useEffect(() => { detectar(); }, []);

  const punto = modo === 'gps' ? gps : registrada;
  const consulta = punto ? `${punto.lat},${punto.lng}` : (ubicacion || nombre);
  const enlace = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&z=16&output=embed`;
  return (
    <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{position:'fixed', inset:0, background:'rgba(0,0,0,.55)',zIndex:3000,display:'grid',placeItems:'center',padding:16}}>
      <div role="dialog" aria-modal="true" aria-label="Google Maps" style={{width:'min(760px,100%)',maxHeight:'90vh',overflowY:'auto',background:'#fff',borderRadius:14,padding:20,color:'#2d392d',boxShadow:'0 18px 40px rgba(0,0,0,.24)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><h2 style={{margin:0,fontSize:21}}>🗺️ {nombre} — Google Maps</h2><button type="button" aria-label="Cerrar mapa" onClick={onClose} style={{border:0,background:'transparent',cursor:'pointer',fontSize:26}}>×</button></div>
        <p style={{fontSize:13}}><b>Ubicación registrada de la parcela:</b> {ubicacion || 'Sin ubicación guardada'}</p>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
          <button type="button" onClick={() => { setModo('gps'); if (!gps) detectar(); }} style={boton(modo==='gps')}>📍 Mi ubicación actual</button>
          <button type="button" onClick={detectar} style={boton(false)}>↻ Detectar GPS</button>
          <button type="button" onClick={() => setModo('parcela')} style={boton(modo==='parcela')}>🌱 Parcela registrada</button>
        </div>
        {modo === 'gps' && !gps ? <div style={{background:'#f5f8f4',padding:18,borderRadius:8}}>Esperando ubicación GPS. {estado}</div> : (
          <iframe title="Ubicación en Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={embed} style={{width:'100%',height:'min(50vh,380px)',border:'1px solid #d6ded0',borderRadius:8}} />
        )}
        {gps && modo==='gps' && <p style={{fontSize:12,color:'#586b54'}}>Ubicación detectada del dispositivo: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} · Precisión aproximada: {Math.round(gps.precision)} m. No se ha guardado como parcela.</p>}
        {modo==='parcela' && !registrada && <p style={{fontSize:12,color:'#985c14'}}>La ubicación de la parcela es texto, no coordenadas GPS. Google Maps mostrará un resultado de búsqueda, no necesariamente el terreno exacto.</p>}
        {estado && <p role="status" style={{fontSize:12,color:'#586b54'}}>{estado}</p>}
        <a href={enlace} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',marginTop:12,color:'#2F5413',fontWeight:600}}>Abrir en Google Maps ↗</a>
      </div>
    </div>
  );
}
function boton(activo) { return {padding:'9px 12px',border:'1px solid #b9c9b0',borderRadius:7,cursor:'pointer',background:activo?'#2F5413':'#fff',color:activo?'#fff':'#2F5413'}; }
