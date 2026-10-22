import { useEffect, useState } from 'react';
const opciones = [['', 'No configurado'], ['manual', 'Manual'], ['automatico', 'Automático'], ['inteligente', 'Inteligente']];
export default function TipoRiegoSelector({ parcelaId, style = {} }) {
  const clave = parcelaId ? `agroia_tipo_riego_parcela_${parcelaId}` : null;
  const [tipo,setTipo] = useState('');
  useEffect(() => {
    const valorGuardado = clave ? localStorage.getItem(clave) || '' : '';
    // Las opciones antiguas (goteo, aspersión, gravedad) ya no aplican.
    setTipo(opciones.some(([valor]) => valor === valorGuardado) ? valorGuardado : '');
  }, [clave]);
  return <div style={{display:'flex',flexDirection:'column',gap:2,minWidth:110}} title="Preferencia guardada solo en este navegador; no controla el riego físico">
    <label style={{fontSize:10,color:'#777'}} htmlFor={`riego-${parcelaId || 'none'}`}>Modo de riego (visual)</label>
    <select id={`riego-${parcelaId || 'none'}`} style={{padding:'5px',fontSize:12,maxWidth:170,...style}} value={tipo} disabled={!clave} onChange={e=>{const valor=e.target.value;setTipo(valor);if(clave){if(valor)localStorage.setItem(clave,valor);else localStorage.removeItem(clave);}}}>
      {opciones.map(([valor,titulo])=><option key={valor} value={valor}>{titulo}</option>)}
    </select>
  </div>;
}
