import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MapaParcela from '../components/MapaParcela';
import logoAgroIA from '../assets/agroia-logo.png';
import TipoRiegoSelector from '../components/TipoRiegoSelector';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '') + '/api';
const normalizar = respuesta => Array.isArray(respuesta) ? respuesta : respuesta.parcelas ?? [];
async function api(ruta, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  if (!token) throw new Error('Sesión caducada. Vuelve a iniciar sesión.');
  const respuesta = await fetch(API + ruta, {method,headers:{Authorization:`Bearer ${token}`,...(body !== undefined ? {'Content-Type':'application/json'} : {})},...(body !== undefined ? {body:JSON.stringify(body)} : {})});
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.error || datos.msg || `Error HTTP ${respuesta.status}`);
  return datos;
}
const vacia = {nombre:'',ubicacion:''};
const caja = {background:'#fff',padding:22,border:'1px solid #e0e7dc',borderRadius:12,boxShadow:'0 2px 8px #00000008',marginBottom:18};
const campo = {display:'block',padding:10,width:'100%',boxSizing:'border-box',borderRadius:6,border:'1px solid #bec9b8',marginTop:5};
const btn = {padding:'9px 14px',border:0,borderRadius:6,background:'#2F5413',color:'#fff',cursor:'pointer'};
const btnSec = {...btn,background:'#7A9D54'};
const btnDanger = {...btn,background:'#a33a31'};

export default function GestionParcelasNodos({ usuario, onLogout }) {
  const navigate = useNavigate();
  const admin = usuario?.rol === 'admin';
  const [parcelas,setParcelas] = useState([]);
  const [nodos,setNodos] = useState([]);
  const [cargando,setCargando] = useState(true);
  const [ocupado,setOcupado] = useState(false);
  const [error,setError] = useState('');
  const [errorNodo,setErrorNodo] = useState('');
  const [errorRenombrado,setErrorRenombrado] = useState({});
  const [ok,setOk] = useState('');
  const [parcelaForm,setParcelaForm] = useState({...vacia});
  const [editandoParcela,setEditandoParcela] = useState(null);
  const [parcelaId,setParcelaId] = useState('');
  const [nuevoNodo,setNuevoNodo] = useState({identificador:'',tipo:'sensor_suelo'});
  const [claveCreada,setClaveCreada] = useState('');
  const [mapa,setMapa] = useState(null);
  const [renombrando,setRenombrando] = useState(null);
  const [nuevoIdentificador,setNuevoIdentificador] = useState('');

  const cargar = useCallback(async () => {
    setError('');setCargando(true);
    try {
      const [p,n] = await Promise.all([api('/parcelas'),api('/nodos')]);
      const listado = normalizar(p);
      if (!Array.isArray(listado) || !Array.isArray(n)) throw new Error('Formato de datos de parcelas o nodos inválido.');
      setParcelas(listado);setNodos(n);
      setParcelaId(actual => listado.some(x=>String(x.id)===String(actual)) ? actual : String(listado[0]?.id ?? ''));
    } catch (e) {setError(e.message);} finally {setCargando(false);}
  },[]);
  useEffect(()=>{cargar();},[cargar]);
  const ejecutar = async (operacion,exito,setErrorDestino=setError) => {
    if(ocupado)return;
    setOcupado(true);setErrorDestino('');setOk('');
    try {await operacion();setOk(exito);await cargar();}
    catch(e){setErrorDestino(e.message);}
    finally {setOcupado(false);}
  };
  const nuevaParcela = async e => {
    e.preventDefault();
    if(!parcelaForm.nombre.trim())return setError('Escribe el nombre de la parcela.');
    const editar = editandoParcela !== null;
    await ejecutar(async()=> {
      await api(editar ? `/parcelas/${editandoParcela}` : '/parcelas', {method:editar?'PUT':'POST',body:{nombre:parcelaForm.nombre.trim(),ubicacion:parcelaForm.ubicacion.trim()}});
      setParcelaForm({...vacia});setEditandoParcela(null);
    },editar?'Parcela actualizada.':'Parcela registrada en MySQL.');
  };
  const eliminarParcela = p => {
    const asociados = nodos.filter(n=>Number(n.parcela_id)===Number(p.id));
    if(asociados.length) return setError(`La parcela ${p.nombre} tiene ${asociados.length} nodo(s) registrado(s), incluidos inactivos. No la eliminaremos para proteger los datos. Revisa sus dependencias primero.`);
    if(!window.confirm(`¿ELIMINAR la parcela «${p.nombre}» (ID ${p.id}) de MySQL? Esta acción no se puede deshacer.`))return;
    ejecutar(()=>api(`/parcelas/${p.id}`,{method:'DELETE'}),'Parcela eliminada correctamente.');
  };
  const capturarGPS = () => {
    setError('');
    if(!navigator.geolocation || !window.isSecureContext) return setError('El GPS requiere HTTPS o localhost y permiso del navegador.');
    navigator.geolocation.getCurrentPosition(p => setParcelaForm(f=>({...f,ubicacion:`${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`})),e=>setError(e.code===1?'Se denegó el permiso de ubicación.':'No se pudo detectar el GPS.'),{enableHighAccuracy:true,timeout:12000});
  };
  const registrarNodo = async e => {
    e.preventDefault(); setClaveCreada('');
    if(!parcelaId)return setErrorNodo('Selecciona una parcela.');
    if(!/^[A-Za-z0-9_-]{3,64}$/.test(nuevoNodo.identificador.trim()))return setErrorNodo('El identificador debe tener entre 3 y 64 caracteres (letras, números, _ o -).');
    await ejecutar(async()=>{
      const r=await api('/nodos',{method:'POST',body:{parcela_id:Number(parcelaId),identificador:nuevoNodo.identificador.trim(),tipo:nuevoNodo.tipo}});
      setClaveCreada(r.api_key || '');setNuevoNodo({identificador:'',tipo:'sensor_suelo'});
    },'Nodo creado. Guarda la API key y configura el hardware correspondiente.',setErrorNodo);
  };
  const actualizarEstado = (n,estado) => {
    if(n.estado===estado) return;
    if(!window.confirm(`Cambiar el estado del nodo «${n.identificador}» a ${estado}. Esto NO controla la bomba ni interrumpe por sí solo la transmisión física. ¿Continuar?`))return;
    ejecutar(()=>api(`/nodos/${n.id}`,{method:'PUT',body:{estado}}),`Estado de ${n.identificador} actualizado en MySQL.`,setErrorNodo);
  };
  const bajaNodo = n => {
    if(!window.confirm(`Dar de baja lógicamente el nodo «${n.identificador}». Permanecerá en MySQL y se podrá reactivar después. ¿Confirmas?`))return;
    ejecutar(()=>api(`/nodos/${n.id}`,{method:'DELETE'}),'Nodo dado de baja (inactivo), sin borrar su historial.',setErrorNodo);
  };
  const renombrar = n => {
    if(!/^[A-Za-z0-9_-]{3,64}$/.test(nuevoIdentificador.trim()))return setErrorRenombrado(actual => ({...actual,[n.id]:'El identificador debe tener entre 3 y 64 caracteres válidos.'}));
    if(!window.confirm(`Renombrar «${n.identificador}» puede afectar al firmware y al histórico. ¿Confirmas?`))return;
    setErrorRenombrado(actual => ({...actual,[n.id]:''}));
    ejecutar(async()=>{await api(`/nodos/${n.id}`,{method:'PUT',body:{identificador:nuevoIdentificador.trim()}});setRenombrando(null);},'Nodo renombrado correctamente.',mensaje => setErrorRenombrado(actual => ({...actual,[n.id]:mensaje})));
  };
  const deParcela = nodos.filter(n=>Number(n.parcela_id)===Number(parcelaId));
  return <div style={{minHeight:'100vh',background:'#f7f8f6',color:'#28342b',fontFamily:'Arial,sans-serif'}}>
    <header style={{background:'#7A9D54',padding:'15px 30px',color:'#fff',display:'flex',gap:15,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}><div style={{display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}><Link to="/dashboard" aria-label="Volver al Dashboard de AgroIA" title="Ir al Dashboard" style={{display:'flex',alignItems:'center',textDecoration:'none'}}><img src={logoAgroIA} alt="AgroIA - Riego Inteligente" style={{height:60,cursor:'pointer'}}/></Link><div><b style={{fontSize:18}}>Parcelas y nodos</b><div style={{fontSize:12}}>Gestión para {admin?'administrador':'agricultor'}</div></div></div><nav style={{display:'flex',gap:9,alignItems:'center'}}><Link to="/dashboard" style={{...btnSec,textDecoration:'none'}}>← Dashboard</Link>{admin&&<Link to="/config-admin" style={{...btnSec,textDecoration:'none'}}>Usuarios</Link>}</nav></header>
    <main style={{maxWidth:1240,margin:'0 auto',padding:'24px 20px'}}>
      <h1 style={{margin:'0 0 8px'}}>Administración de parcelas y nodos</h1><p style={{color:'#68786a',fontSize:14}}>Los cambios se guardan en MySQL; el estado del nodo es administrativo y no activa ni desactiva físicamente el riego.</p>
      {error&&<p role="alert" style={{padding:12,background:'#ffeded',color:'#922a28',borderRadius:8}}>{error}</p>}
      {ok&&<p role="status" style={{padding:12,background:'#f2faec',color:'#2F5413',borderRadius:8}}>{ok}</p>}
      {cargando&&<p>Cargando datos de Flask...</p>}
      <section style={caja}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}><h2 style={{margin:'0 0 14px'}}>Mis parcelas {admin?'(todas las registradas)':''}</h2><button type="button" style={btnSec} onClick={cargar} disabled={ocupado}>↻ Actualizar</button></div>
        {parcelas.length===0&&!cargando&&<p>No hay parcelas registradas. Puedes crear la primera.</p>}
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:650}}><thead><tr>{['Parcela','Ubicación','Nodos','Acciones'].map(t=><th key={t} style={th}>{t}</th>)}</tr></thead><tbody>
          {parcelas.map(p=><tr key={p.id}><td style={td}><b>{p.nombre}</b><div style={{fontSize:12,color:'#666'}}>ID {p.id}{admin?` · Propietario ${p.usuario_id}`:''}</div></td><td style={td}>{p.ubicacion||'Sin ubicación'}</td><td style={td}>{nodos.filter(n=>Number(n.parcela_id)===Number(p.id)).length}</td><td style={td}><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button type="button" style={btnSec} onClick={()=>setMapa(p)}>Mapa</button><button type="button" style={btnSec} onClick={()=>{setEditandoParcela(p.id);setParcelaForm({nombre:p.nombre||'',ubicacion:p.ubicacion||''});}}>Editar</button><button type="button" style={btnDanger} onClick={()=>eliminarParcela(p)} disabled={ocupado}>Eliminar</button></div></td></tr>)}
        </tbody></table></div>
        <form onSubmit={nuevaParcela} style={{marginTop:22,padding:16,background:'#f2f7ed',borderRadius:8,display:'grid',gap:12}}><strong>{editandoParcela!==null?'Editar parcela':'Crear parcela nueva'}</strong>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12}}><label>Nombre<input required maxLength={120} style={campo} value={parcelaForm.nombre} onChange={e=>setParcelaForm(s=>({...s,nombre:e.target.value}))}/></label><label>Ubicación / coordenadas<input style={campo} maxLength={250} placeholder="Ej. 29.082600,-110.961200" value={parcelaForm.ubicacion} onChange={e=>setParcelaForm(s=>({...s,ubicacion:e.target.value}))}/></label></div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" style={btnSec} onClick={capturarGPS}>📍 Usar GPS actual en formulario</button><button type="submit" disabled={ocupado} style={btn}>{editandoParcela!==null?'Guardar cambios':'Crear parcela'}</button>{editandoParcela!==null&&<button type="button" style={btnSec} onClick={()=>{setEditandoParcela(null);setParcelaForm({...vacia});}}>Cancelar edición</button>}</div>
          <small>GPS detecta la ubicación de ESTE dispositivo. Solo guarda las coordenadas cuando confirmas el formulario. Para registrar un terreno debes estar en la parcela.</small>
        </form>
      </section>
      <section style={caja}>
        <h2 style={{margin:'0 0 14px'}}>Gestión de nodos</h2><label>Parcela<select value={parcelaId} onChange={e=>{setParcelaId(e.target.value);setClaveCreada('');}} style={{...campo,maxWidth:360}}><option value="">Seleccionar parcela</option>{parcelas.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
        {parcelaId&&<div style={{marginTop:12,marginBottom:15}}><TipoRiegoSelector parcelaId={parcelaId}/><small>El tipo de riego es una preferencia local de esta interfaz, no un comando al ESP32 ni una configuración compartida todavía.</small></div>}
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}><thead><tr>{['Identificador','Tipo','Estado','Acciones'].map(t=><th key={t} style={th}>{t}</th>)}</tr></thead><tbody>
          {deParcela.map(n=><tr key={n.id}><td style={td}><b>{n.identificador}</b><div style={{fontSize:12,color:'#666'}}>ID {n.id}</div></td><td style={td}>{n.tipo==='estacion'?'Estación':'Sensor de suelo'}</td><td style={td}><select aria-label={`Estado de ${n.identificador}`} value={n.estado} disabled={ocupado} onChange={e=>actualizarEstado(n,e.target.value)} style={{...campo,margin:0,width:160}}><option value="activo">Activo</option><option value="inactivo">Inactivo</option><option value="mantenimiento">Mantenimiento</option></select></td><td style={td}><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" onClick={()=>{setRenombrando(n.id);setNuevoIdentificador(n.identificador);setErrorRenombrado(actual => ({...actual,[n.id]:''}));}} style={btnSec}>Renombrar</button><button type="button" disabled={ocupado||n.estado==='inactivo'} onClick={()=>bajaNodo(n)} style={btnDanger}>Dar de baja</button></div>{renombrando===n.id&&<div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}><input aria-label="Nuevo identificador" value={nuevoIdentificador} onChange={e=>setNuevoIdentificador(e.target.value)} style={{...campo,margin:0,maxWidth:190}}/><button type="button" style={btn} onClick={()=>renombrar(n)}>Guardar</button><button type="button" style={btnSec} onClick={()=>setRenombrando(null)}>Cancelar</button>{errorRenombrado[n.id]&&<small role="alert" style={{color:'#b42318',flexBasis:'100%'}}>{errorRenombrado[n.id]}</small>}</div>}</td></tr>)}
          {!deParcela.length&&<tr><td colSpan={4} style={td}>No hay nodos en esta parcela.</td></tr>}
        </tbody></table></div>
        <form onSubmit={registrarNodo} style={{background:'#f2f7ed',padding:16,borderRadius:8,marginTop:18,display:'grid',gap:12}}><strong>Registrar nuevo nodo</strong><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}><label>Identificador<input value={nuevoNodo.identificador} onChange={e=>{setErrorNodo('');setNuevoNodo(s=>({...s,identificador:e.target.value}))}} style={campo} placeholder="sensor-parcela-05" required/></label><label>Tipo de dispositivo<select style={campo} value={nuevoNodo.tipo} onChange={e=>setNuevoNodo(s=>({...s,tipo:e.target.value}))}><option value="sensor_suelo">Sensor de suelo</option><option value="estacion">Estación meteorológica</option></select></label></div><button type="submit" style={{...btn,maxWidth:180}} disabled={!parcelaId||ocupado}>+ Registrar nodo</button>{errorNodo&&<small role="alert" style={{color:'#b42318'}}>{errorNodo}</small>}<small>Crear un nodo no conecta automáticamente el sensor físico. Deberás configurar su clave y el firmware.</small></form>
        {claveCreada&&<div style={{padding:14,marginTop:12,border:'2px solid #7A9D54',borderRadius:8,overflowWrap:'anywhere'}}><b>API key generada — guárdala ahora, no se mostrará de nuevo.</b><p><code>{claveCreada}</code></p><button type="button" style={btn} onClick={()=>navigator.clipboard.writeText(claveCreada).then(()=>setOk('Clave copiada al portapapeles.')).catch(()=>setError('Copia manualmente la clave.'))}>Copiar API key</button></div>}
      </section>
    </main>
    {mapa&&<MapaParcela parcela={mapa} onClose={()=>setMapa(null)}/>}
  </div>;
}
const th = {textAlign:'left',padding:'12px 10px',borderBottom:'2px solid #dce7d5',fontSize:13};
const td = {padding:'12px 10px',borderBottom:'1px solid #eef1eb',fontSize:13};
