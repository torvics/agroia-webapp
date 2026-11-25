import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import logoAgroIA from "../assets/agroia-logo.png";
import Notificaciones from "../components/AvisosPanel";
import { validarCorreo, validarNombrePersona, validarPassword } from "../utils/validaciones";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");
// El reporte usa fechas locales del navegador; Flask recibe UTC con zona horaria.
function fechaParaInput(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function interpretarFechaLocal(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) return null;
  return fecha;
}

function obtenerRangoReporte(desde, hasta) {
  const fechaDesde = interpretarFechaLocal(desde);
  const fechaHasta = interpretarFechaLocal(hasta);
  if (!fechaDesde || !fechaHasta) {
    throw new Error("Selecciona fechas válidas para generar el reporte.");
  }
  if (fechaDesde > fechaHasta) {
    throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
  }
  // El backend trata 'fin' como exclusivo: se envía el inicio del día siguiente.
  const finExclusivo = new Date(
    fechaHasta.getFullYear(), fechaHasta.getMonth(), fechaHasta.getDate() + 1
  );
  // Se valida también la duración real, como hace Flask (incluye cambios de horario).
  if (finExclusivo.getTime() - fechaDesde.getTime() > 366 * 86400000) {
    throw new Error("El rango máximo del reporte es de 366 días.");
  }
  return {
    inicio: fechaDesde.toISOString(),
    fin: finExclusivo.toISOString(),
  };
}

export default function ConfigAdmin({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Interfaz
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  // Usuarios reales desde MySQL
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState("");
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", correo: "", rol: "agricultor", password: "" });
  const [errorAlta, setErrorAlta] = useState("");
  const [exitoAlta, setExitoAlta] = useState("");
  const [creandoUsuario, setCreandoUsuario] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [edicionUsuario, setEdicionUsuario] = useState({ nombre:'', correo:'', rol:'agricultor', activo:true });
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState('');
  const [okEdicion, setOkEdicion] = useState('');

  // Reportes: parcelas autorizadas, fechas y descarga autenticada.
  const [parcelasReporte, setParcelasReporte] = useState([]);
  const [parcelaReporte, setParcelaReporte] = useState("");
  const [nodosRegistrados, setNodosRegistrados] = useState([]);
  const [cargandoParcelas, setCargandoParcelas] = useState(true);
  const [errorParcelas, setErrorParcelas] = useState("");
  const [desde, setDesde] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 29);
    return fechaParaInput(fecha);
  });
  const [hasta, setHasta] = useState(() => fechaParaInput(new Date()));
  const [descargando, setDescargando] = useState("");
  const [errorReporte, setErrorReporte] = useState("");
  const [mensajeReporte, setMensajeReporte] = useState("");

  const nombreSesion = localStorage.getItem("nombre") || "Usuario";
  const rolSesion = localStorage.getItem("rol") || "Sesión activa";

  const limpiarSesion = () => {
    ["access_token", "token", "rol", "nombre"].forEach((clave) => {
      localStorage.removeItem(clave);
    });
    window.location.replace("/login");
  };

  // ============================================
  // CONSULTAR USUARIOS DESDE EL BACKEND
  // ============================================
  useEffect(() => {
    let activo = true;
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    if (!token) {
      window.location.replace("/login");
      return;
    }

    const cargarUsuarios = async () => {
      try {
        const respuesta = await fetch(`${API_URL}/api/usuarios`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (respuesta.status === 401) {
          limpiarSesion();
          return;
        }

        if (respuesta.status === 403) {
          throw new Error(
            "Solo un administrador puede consultar los usuarios."
          );
        }

        if (!respuesta.ok) {
          throw new Error(`Error del servidor: ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos)) {
          throw new Error("Formato de usuarios no válido.");
        }

        if (activo) {
          setUsuarios(datos);
          setError("");
        }
      } catch (err) {
        if (activo) {
          setError(err.message);
        }
      } finally {
        if (activo) {
          setCargandoUsuarios(false);
        }
      }
    };

    cargarUsuarios();

    return () => {
      activo = false;
    };
  }, []);

  // La carga de reportes es independiente de la consulta de usuarios.
  useEffect(() => {
    const controller = new AbortController();
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");

    if (!token) {
      setErrorParcelas("No hay sesión activa. Inicia sesión nuevamente.");
      setCargandoParcelas(false);
      return () => controller.abort();
    }

    const consultar = async (ruta) => {
      const respuesta = await fetch(`${API_URL}/api${ruta}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!respuesta.ok) {
        const contenido = await respuesta.json().catch(() => ({}));
        throw new Error(
          contenido.error || contenido.msg || `Error HTTP ${respuesta.status}`
        );
      }
      return respuesta.json();
    };

    const cargarParcelas = async () => {
      try {
        const datos = await consultar("/parcelas");
        const lista = Array.isArray(datos) ? datos : datos.parcelas;
        if (!Array.isArray(lista)) {
          throw new Error("El servidor devolvió un formato de parcelas incorrecto.");
        }
        if (controller.signal.aborted) return;
        setParcelasReporte(lista);
        setParcelaReporte((anterior) =>
          lista.some((p) => String(p.id) === anterior)
            ? anterior
            : lista.length ? String(lista[0].id) : ""
        );
        setErrorParcelas("");
      } catch (e) {
        if (!controller.signal.aborted) setErrorParcelas(e.message);
      } finally {
        if (!controller.signal.aborted) setCargandoParcelas(false);
      }
    };

    const cargarNodos = async () => {
      try {
        const datos = await consultar("/nodos");
        if (!controller.signal.aborted && Array.isArray(datos)) {
          setNodosRegistrados(datos);
        }
      } catch {
        // La navegación de nodos no impide generar reportes.
        if (!controller.signal.aborted) setNodosRegistrados([]);
      }
    };

    cargarParcelas();
    cargarNodos();
    return () => controller.abort();
  }, []);

  const nodosMenu = nodosRegistrados.filter(
    (n) => n.tipo === "sensor_suelo" &&
      n.estado === "activo" &&
      String(n.parcela_id) === String(parcelaReporte)
  );

  const descargarReporte = async (formato) => {
    if (descargando) return;
    setErrorReporte("");
    setMensajeReporte("");

    if (!parcelaReporte) {
      setErrorReporte("Selecciona una parcela para descargar el reporte.");
      return;
    }

    let rango;
    try {
      rango = obtenerRangoReporte(desde, hasta);
    } catch (e) {
      setErrorReporte(e.message);
      return;
    }

    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!token) {
      setErrorReporte("Tu sesión ha expirado. Inicia sesión nuevamente.");
      return;
    }

    setDescargando(formato);
    try {
      const parametros = new URLSearchParams({ ...rango, formato });
      const respuesta = await fetch(
        `${API_URL}/api/reportes/${encodeURIComponent(parcelaReporte)}?${parametros}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!respuesta.ok) {
        const contenido = await respuesta.json().catch(() => ({}));
        throw new Error(
          contenido.error || contenido.msg ||
          `No se pudo descargar el reporte (HTTP ${respuesta.status}).`
        );
      }

      const tipo = (respuesta.headers.get("Content-Type") || "").toLowerCase();
      const tipoEsperado = formato === "pdf" ? "application/pdf" : "text/csv";
      if (!tipo.includes(tipoEsperado)) {
        throw new Error("El servidor no devolvió el formato de archivo esperado.");
      }
      const archivo = await respuesta.blob();
      if (!archivo.size) throw new Error("El servidor devolvió un archivo vacío.");

      const urlTemporal = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = urlTemporal;
      enlace.download =
        `reporte_parcela_${parcelaReporte}_${desde}_${hasta}.${formato}`;
      document.body.appendChild(enlace);
      try {
        enlace.click();
      } finally {
        enlace.remove();
        // Tiempo suficiente para que el navegador inicie la descarga.
        setTimeout(() => URL.revokeObjectURL(urlTemporal), 1500);
      }
      setMensajeReporte(
        `Se preparó la descarga del reporte ${formato.toUpperCase()}.`
      );
    } catch (e) {
      setErrorReporte(e.message || "No se pudo descargar el reporte.");
    } finally {
      setDescargando("");
    }
  };

  // ============================================
  // CERRAR SESIÓN Y REVOCAR JWT
  // ============================================
  const handleLogout = async () => {
    if (cerrandoSesion) return;

    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    if (!token) {
      if (onLogout) onLogout(); else limpiarSesion();
      return;
    }

    setCerrandoSesion(true);
    setError("");

    try {
      const respuesta = await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!respuesta.ok && respuesta.status !== 401) {
        throw new Error("No se pudo revocar el token.");
      }

      if (onLogout) onLogout(); else limpiarSesion();
    } catch (err) {
      setError(
        "No fue posible cerrar sesión en el servidor. Verifica la conexión."
      );
      setCerrandoSesion(false);
    }
  };

  const crearUsuario = async (evento) => {
    evento.preventDefault();
    setErrorAlta(""); setExitoAlta("");
    const nombre = nuevoUsuario.nombre.trim();
    const correo = nuevoUsuario.correo.trim().toLowerCase();
    const errorDatos = validarNombrePersona(nombre) || validarCorreo(correo) || validarPassword(nuevoUsuario.password);
    if (errorDatos) { setErrorAlta(errorDatos); return; }
    setCreandoUsuario(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const respuesta = await fetch(`${API_URL}/api/usuarios`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, rol: nuevoUsuario.rol, password: nuevoUsuario.password }),
      });
      const creado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(creado.error || creado.msg || `No se pudo crear la cuenta (HTTP ${respuesta.status}). Comprueba la actualización del backend.`);
      setUsuarios(actual => [...actual, creado]);
      setNuevoUsuario({ nombre: "", correo: "", rol: "agricultor", password: "" });
      setAltaAbierta(false);
      setExitoAlta(`Usuario ${creado.nombre} registrado correctamente.`);
    } catch (error) { setErrorAlta(error.message); }
    finally { setCreandoUsuario(false); }
  };

  const guardarEdicionUsuario = async (e) => {
    e.preventDefault();
    if (guardandoUsuario || !editandoUsuario) return;
    setErrorEdicion('');setOkEdicion('');setGuardandoUsuario(true);
    try {
      const datos = { ...edicionUsuario, nombre:edicionUsuario.nombre.trim(), correo:edicionUsuario.correo.trim().toLowerCase() };
      const original = usuarios.find(u => u.id === editandoUsuario);
      const errorDatos =
        (datos.nombre !== original?.nombre ? validarNombrePersona(datos.nombre) : '') ||
        (datos.correo !== String(original?.correo ?? '').toLowerCase() ? validarCorreo(datos.correo) : '');
      if (errorDatos) throw new Error(errorDatos);
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/usuarios/${editandoUsuario}`, { method:'PUT', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(datos) });
      const r = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(r.error || r.msg || `No se pudo modificar (HTTP ${res.status})`);
      setUsuarios(actual=>actual.map(u=>u.id===r.id?r:u));
      setEditandoUsuario(null);setOkEdicion('Usuario actualizado en MySQL. Los cambios de rol pueden requerir iniciar sesión de nuevo.');
    } catch(err) {setErrorEdicion(err.message);} finally {setGuardandoUsuario(false);}
  };
  // ============================================
  // INTERFAZ DE ADMINISTRACIÓN
  // ============================================
  return (
    <div style={styles.app}>
      {/* SIDEBAR */}
      <aside
        style={{
          ...styles.sidebar,
          width: sidebarAbierta ? 250 : 0,
          minWidth: sidebarAbierta ? 250 : 0,
          opacity: sidebarAbierta ? 1 : 0,
        }}
      >
        <div
          style={{
            visibility: sidebarAbierta ? "visible" : "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <div style={styles.sidebarHeader}>
            <button
              type="button"
              style={styles.iconButton}
              onClick={() => setSidebarAbierta(false)}
            >
              ←
            </button>
            <h2 style={{ margin: 0, fontSize: 20 }}>Menú</h2>
          </div>

          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>PRINCIPAL</div>
            <Link
              to="/dashboard"
              style={
                location.pathname === "/dashboard"
                  ? styles.sidebarLinkActive
                  : styles.sidebarLink
              }
            >
              Vista general
            </Link>
            <Link
              to="/Bitacoras"
              style={
                location.pathname.toLowerCase() === "/bitacoras"
                  ? styles.sidebarLinkActive
                  : styles.sidebarLink
              }
            >
              Bitácoras
            </Link>
          </div>

          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>NODOS</div>
            {nodosMenu.length === 0 ? (
              <span style={{ display: "block", padding: "10px 20px", color: "#777", fontSize: 13 }}>
                Sin nodos de suelo en la parcela seleccionada.
              </span>
            ) : nodosMenu.map((nodo) => (
              <Link
                key={nodo.id}
                to={`/nodos/${nodo.id}`}
                style={
                  location.pathname === `/nodos/${nodo.id}`
                    ? styles.sidebarLinkActive
                    : styles.sidebarLink
                }
              >
                {nodo.identificador || `Nodo ${nodo.id}`}
              </Link>
            ))}
          </div>

          <div style={styles.sidebarFooter}>
            <Link
              to="/config-general"
              style={styles.sidebarLinkConfig}
            >
              ⚙️ Configuración
            </Link>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div style={styles.mainContent}>
        <header style={styles.banner}>
          <Link to="/dashboard">
            <img
              src={logoAgroIA}
              alt="AgroIA - Riego Inteligente"
              style={{ height: 60 }}
            />
          </Link>

          <div style={styles.bannerRight}>
            <div style={styles.tempBadge}>
              Administración
            </div>

            <Notificaciones style={styles.iconCircle} />

            <button
              type="button"
              style={styles.iconCircleButton}
              onClick={() => setMenuAbierto(!menuAbierto)}
            >
              👤
            </button>

            {menuAbierto && (
              <div style={styles.userMenu}>
                <div style={styles.userMenuHeader}>
                  <div style={styles.userMenuAvatar}>👤</div>
                  <div>
                    <div style={styles.userMenuName}>
                      {nombreSesion}
                    </div>
                    <div style={styles.userMenuEmail}>
                      {rolSesion}
                    </div>
                  </div>
                </div>

                <div style={styles.userMenuOptions}>
                  <Link
                    to="/config-admin"
                    style={styles.userMenuOption}
                    onClick={() => setMenuAbierto(false)}
                  >
                    • Gestión de usuarios
                  </Link>

                  <Link
                    to="/config-cuenta"
                    style={styles.userMenuOption}
                    onClick={() => setMenuAbierto(false)}
                  >
                    • Gestión de cuenta
                  </Link>
                </div>

                <button
                  type="button"
                  style={styles.userMenuLogout}
                  disabled={cerrandoSesion}
                  onClick={handleLogout}
                >
                  🚪 {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* BARRA SUPERIOR */}
        <div style={styles.toolbar}>
          {!sidebarAbierta && (
            <button
              type="button"
              style={styles.iconButton}
              onClick={() => setSidebarAbierta(true)}
            >
              ☰
            </button>
          )}

          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>
              Configuración de Administrador
            </h2>
            <span style={{ fontSize: 12, color: "#888" }}>
              Consulta usuarios, roles y reportes
            </span>
          </div>
        </div>

        <main style={styles.main}>
          {error && (
            <div role="alert" style={styles.errorBox}>
              {error}
            </div>
          )}

          {/* USUARIOS Y ROLES */}
          <div style={styles.card}>
            <div style={styles.cardHeaderFlex}>
              <div>
                <h2 style={styles.cardTitle}>Usuarios y roles</h2>
                <Link to="/gestion" style={{color:"#2F5413",fontSize:13}}>Administrar parcelas y nodos →</Link>
                <p style={styles.cardSubtitle}>
                  Usuarios registrados en la base de datos de AgroIA
                </p>
              </div>

              <button type="button" onClick={() => { setAltaAbierta(x => !x); setErrorAlta(""); setExitoAlta(""); }} style={{ ...styles.btnDeshabilitado, opacity: 1, cursor: "pointer", background: "#7A9D54", color: "#fff" }}>+ Nuevo usuario</button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Usuario</th>
                    <th style={styles.th}>Correo</th>
                    <th style={styles.th}>Rol</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {cargandoUsuarios && (
                    <tr>
                      <td style={styles.td} colSpan={5}>
                        Cargando usuarios...
                      </td>
                    </tr>
                  )}

                  {!cargandoUsuarios &&
                    !error &&
                    usuarios.length === 0 && (
                      <tr>
                        <td style={styles.td} colSpan={5}>
                          No hay usuarios registrados.
                        </td>
                      </tr>
                    )}

                  {!cargandoUsuarios &&
                    usuarios.map((user) => (
                      <tr key={user.id} style={styles.tr}>
                        <td style={styles.td}>{user.nombre}</td>
                        <td style={styles.td}>{user.correo}</td>
                        <td style={styles.td}>{user.rol}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              color: !user.activo
                                ? "#d32f2f"
                                : user.correo_confirmado === false
                                ? "#b26a00"
                                : "#4f863b",
                              fontWeight: "bold",
                            }}
                          >
                            {!user.activo
                              ? "Inactivo"
                              : user.correo_confirmado === false
                              ? "Pendiente de confirmar"
                              : "Activo"}
                          </span>
                        </td>
                        <td style={styles.td}><button type="button" style={{...styles.btnDeshabilitado,opacity:1,cursor:'pointer',background:'#7A9D54',color:'#fff'}} onClick={()=>{setEditandoUsuario(user.id);setEdicionUsuario({nombre:user.nombre,correo:user.correo,rol:user.rol,activo:Boolean(user.activo)});setErrorEdicion('');setOkEdicion('');}}>Editar</button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {editandoUsuario !== null && (
              <form onSubmit={guardarEdicionUsuario} style={{background:'#f3f8ef',border:'1px solid #c9dfba',padding:16,borderRadius:10,marginTop:15,display:'grid',gap:10}}>
                <strong>Editar usuario ID {editandoUsuario}</strong>
                <label>Nombre<input required minLength={2} maxLength={60} style={{display:'block',padding:9,width:'100%',boxSizing:'border-box'}} value={edicionUsuario.nombre} onChange={e=>setEdicionUsuario(p=>({...p,nombre:e.target.value}))}/></label>
                <label>Correo<input required type="email" style={{display:'block',padding:9,width:'100%',boxSizing:'border-box'}} value={edicionUsuario.correo} onChange={e=>setEdicionUsuario(p=>({...p,correo:e.target.value}))}/></label>
                <label>Rol<select style={{display:'block',padding:9,width:'100%'}} value={edicionUsuario.rol} onChange={e=>setEdicionUsuario(p=>({...p,rol:e.target.value}))}><option value="admin">Administrador</option><option value="agricultor">Agricultor</option></select></label>
                <label><input type="checkbox" checked={edicionUsuario.activo} onChange={e=>setEdicionUsuario(p=>({...p,activo:e.target.checked}))}/> Cuenta activa</label>
                <p style={{fontSize:12,color:'#777'}}>No se edita la contraseña aquí. No puedes quitarte tus propios permisos de administrador. Los roles se revalidan al iniciar sesión.</p>
                <div style={{display:'flex',gap:10}}><button style={styles.logoutBtn} disabled={guardandoUsuario} type="submit">{guardandoUsuario?'Guardando...':'Guardar cambios'}</button><button type="button" style={styles.logoutBtn} onClick={()=>setEditandoUsuario(null)}>Cancelar</button></div>
              </form>
            )}
            {errorEdicion && <p role="alert" style={{color:'#b42318'}}>{errorEdicion}</p>}
            {okEdicion && <p role="status" style={{color:'#2F5413'}}>{okEdicion}</p>}
            {altaAbierta && (
              <form onSubmit={crearUsuario} style={{ background: "#f3f8ef", border: "1px solid #c9dfba", borderRadius: 10, padding: 16, marginTop: 15, display: "grid", gap: 12 }}>
                <strong>Registrar nuevo usuario</strong>
                <label>Nombre <input required minLength={2} maxLength={60} value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario(p => ({ ...p, nombre: e.target.value }))} style={{ padding: 9, width: "100%", boxSizing: "border-box" }} /></label>
                <label>Correo <input required type="email" maxLength={255} value={nuevoUsuario.correo} onChange={e => setNuevoUsuario(p => ({ ...p, correo: e.target.value }))} style={{ padding: 9, width: "100%", boxSizing: "border-box" }} /></label>
                <label>Rol <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario(p => ({ ...p, rol: e.target.value }))} style={{ padding: 9, display: "block", width: "100%" }}><option value="agricultor">Agricultor</option><option value="admin">Administrador</option></select></label>
                <label>Contraseña inicial <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={nuevoUsuario.password} onChange={e => setNuevoUsuario(p => ({ ...p, password: e.target.value }))} style={{ padding: 9, width: "100%", boxSizing: "border-box" }} /></label>
                <p style={{ fontSize: 12, color: "#666" }}>El agricultor recibirá un correo de confirmación y no podrá iniciar sesión hasta confirmarlo.</p>
                <div style={{ display: "flex", gap: 10 }}><button type="submit" disabled={creandoUsuario} style={styles.logoutBtn}>{creandoUsuario ? "Creando..." : "Crear cuenta"}</button><button type="button" onClick={() => setAltaAbierta(false)} style={styles.logoutBtn}>Cancelar</button></div>
              </form>
            )}
            {errorAlta && <p role="alert" style={{ color: "#b42318" }}>{errorAlta}</p>}
            {exitoAlta && <p role="status" style={{ color: "#2F5413" }}>{exitoAlta}</p>}
            <p style={styles.nota}>Los cambios de usuario se guardan en MySQL. Desactivar una cuenta evita futuros accesos según la verificación de autenticación del backend; las sesiones ya emitidas requieren control adicional de revocación.</p>
          </div>

          {/* REPORTES REALES POR PARCELA */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Reportes por parcela</h2>
            <p style={styles.cardSubtitle}>
              Descarga reportes PDF y CSV generados por Flask con datos
              de la parcela y el período seleccionados.
            </p>

            <div style={styles.reportesFlex}>
              <label style={styles.campoReporte}>
                Parcela
                <select
                  style={styles.selectInput}
                  value={parcelaReporte}
                  disabled={cargandoParcelas || Boolean(descargando)}
                  onChange={(e) => {
                    setParcelaReporte(e.target.value);
                    setErrorReporte("");
                    setMensajeReporte("");
                  }}
                >
                  {!parcelasReporte.length && (
                    <option value="">Sin parcelas disponibles</option>
                  )}
                  {parcelasReporte.map((parcela) => (
                    <option key={parcela.id} value={String(parcela.id)}>
                      {parcela.nombre || `Parcela ${parcela.id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.campoReporte}>
                Desde
                <input
                  type="date"
                  style={styles.fechaInput}
                  value={desde}
                  max={hasta}
                  disabled={Boolean(descargando)}
                  onChange={(e) => {
                    setDesde(e.target.value);
                    setErrorReporte("");
                    setMensajeReporte("");
                  }}
                />
              </label>

              <label style={styles.campoReporte}>
                Hasta (incluido)
                <input
                  type="date"
                  style={styles.fechaInput}
                  value={hasta}
                  min={desde}
                  disabled={Boolean(descargando)}
                  onChange={(e) => {
                    setHasta(e.target.value);
                    setErrorReporte("");
                    setMensajeReporte("");
                  }}
                />
              </label>
            </div>

            <div style={{ ...styles.reportesFlex, marginTop: 15 }}>
              <button
                type="button"
                style={{
                  ...styles.btnReporte,
                  opacity: descargando || cargandoParcelas || !parcelaReporte ? 0.55 : 1,
                }}
                disabled={Boolean(descargando) || cargandoParcelas || !parcelaReporte}
                onClick={() => descargarReporte("pdf")}
              >
                {descargando === "pdf" ? "Generando PDF..." : "📄 Descargar PDF"}
              </button>
              <button
                type="button"
                style={{
                  ...styles.btnReporte,
                  opacity: descargando || cargandoParcelas || !parcelaReporte ? 0.55 : 1,
                }}
                disabled={Boolean(descargando) || cargandoParcelas || !parcelaReporte}
                onClick={() => descargarReporte("csv")}
              >
                {descargando === "csv" ? "Generando CSV..." : "📊 Descargar CSV"}
              </button>
            </div>

            {errorParcelas && (
              <p role="alert" style={styles.errorBox}>
                No fue posible cargar las parcelas: {errorParcelas}
              </p>
            )}
            {errorReporte && (
              <p role="alert" style={styles.errorBox}>{errorReporte}</p>
            )}
            {mensajeReporte && (
              <p role="status" style={styles.exitoReporte}>{mensajeReporte}</p>
            )}

            <p style={styles.nota}>
              Se incluyen ambos días seleccionados según la zona horaria del navegador.
              El rango máximo es de 366 días. Estos son reportes de parcela;
              no son un registro de actuación física verificada del ESP32.
            </p>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              style={styles.btnVolver}
              onClick={() => navigate("/dashboard")}
            >
              Volver a inicio
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    width: "100%",
    minHeight: "100vh",
    background: "#fcfafc",
    fontFamily: "sans-serif",
  },

  sidebar: {
    backgroundColor: "#f4f6f8",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    transition: "width 0.3s ease, min-width 0.3s ease, opacity 0.3s ease",
    overflow: "hidden",
    whiteSpace: "nowrap",
    zIndex: 10,
  },

  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    padding: "20px",
    borderBottom: "1px solid #e0e0e0",
    marginBottom: 20,
    color: "#333",
    gap: 15,
  },

  sidebarSection: {
    marginBottom: 25,
    display: "flex",
    flexDirection: "column",
  },

  sidebarSectionTitle: {
    padding: "0 20px",
    fontSize: 12,
    fontWeight: "bold",
    color: "#888",
    letterSpacing: 1,
    marginBottom: 10,
  },

  sidebarLink: {
    display: "block",
    padding: "12px 20px",
    color: "#444",
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 600,
  },

  sidebarLinkActive: {
    display: "block",
    padding: "12px 20px",
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 600,
    backgroundColor: "#e6f4cd",
    color: "#5a7d3c",
    borderLeft: "4px solid #7A9D54",
  },

  sidebarFooter: {
    marginTop: "auto",
    padding: "20px 0",
    borderTop: "1px solid #e0e0e0",
  },

  sidebarLinkConfig: {
    display: "flex",
    gap: 10,
    padding: "12px 20px",
    color: "#444",
    textDecoration: "none",
    fontWeight: 600,
  },

  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },

  banner: {
    background: "#7A9D54",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 24px",
  },

  bannerRight: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    position: "relative",
  },

  tempBadge: {
    background: "rgba(0,0,0,0.3)",
    padding: "6px 14px",
    borderRadius: 20,
    fontWeight: 600,
  },

  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircleButton: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "rgba(0,0,0,0.3)",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 18,
  },

  iconButton: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 24,
    color: "#333",
  },

  userMenu: {
    position: "absolute",
    top: 65,
    right: 0,
    width: 260,
    backgroundColor: "#2E5233",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
    zIndex: 100,
  },

  userMenuHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid rgba(255,255,255,0.15)",
    paddingBottom: 12,
    marginBottom: 12,
  },

  userMenuAvatar: {
    fontSize: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: "50%",
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  userMenuName: {
    fontSize: 15,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  userMenuEmail: {
    fontSize: 12,
    opacity: 0.85,
  },

  userMenuOptions: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 12,
  },

  userMenuOption: {
    color: "#fff",
    textDecoration: "none",
    fontSize: 14,
    padding: "4px 0",
  },

  userMenuLogout: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    textAlign: "left",
    fontSize: 14,
    cursor: "pointer",
    border: "none",
    borderTop: "1px solid rgba(255,255,255,0.15)",
    padding: "12px 0 0",
    background: "transparent",
    color: "#fff",
    fontWeight: "bold",
  },

  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    padding: "14px 24px",
    background: "#fff",
    borderBottom: "1px solid #eee",
  },

  main: {
    padding: "30px 40px",
    display: "flex",
    flexDirection: "column",
    gap: 25,
    flex: 1,
    overflowX: "auto",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 25,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    border: "1px solid #eaeaea",
  },

  cardHeaderFlex: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10,
  },

  cardTitle: {
    margin: "0 0 5px 0",
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },

  cardSubtitle: {
    margin: 0,
    fontSize: 13,
    color: "#777",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
  },

  th: {
    textAlign: "left",
    padding: "12px 10px",
    borderBottom: "1px solid #ddd",
    color: "#666",
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  tr: {
    borderBottom: "1px solid #eee",
  },

  td: {
    padding: "12px 10px",
    color: "#333",
    fontSize: 14,
    whiteSpace: "nowrap",
  },

  reportesFlex: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    marginTop: 20,
    flexWrap: "wrap",
  },

  selectInput: {
    padding: "10px 15px",
    borderRadius: 6,
    border: "1px solid #ccc",
    minWidth: 280,
  },

  campoReporte: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "#555",
    fontWeight: 600,
    fontSize: 13,
  },

  fechaInput: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff",
    color: "#333",
    fontSize: 14,
  },

  btnReporte: {
    background: "#355e2b",
    color: "#fff",
    border: "none",
    padding: "11px 17px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 14,
  },

  exitoReporte: {
    marginTop: 15,
    color: "#2F5413",
    fontWeight: "bold",
    fontSize: 13,
  },

  btnDeshabilitado: {
    backgroundColor: "#f1f1f1",
    color: "#777",
    border: "1px solid #ccc",
    padding: "10px 16px",
    borderRadius: 6,
    cursor: "not-allowed",
    fontWeight: "bold",
  },

  btnVolver: {
    background: "#355e2b",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 15,
  },

  nota: {
    color: "#777",
    fontSize: 12,
    marginTop: 15,
  },

  errorBox: {
    background: "#fff1f0",
    border: "1px solid #ffccc7",
    color: "#a8071a",
    padding: 14,
    borderRadius: 6,
  },
};
