import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import logoAgroIA from "../assets/agroia-logo.png";
import Notificaciones from "../components/AvisosPanel";
import MapaParcela from "../components/MapaParcela";
import TipoRiegoSelector from "../components/TipoRiegoSelector";

// La variable de Vite puede contener /api al final.
// Se normaliza para construir siempre las rutas /api/...
const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

function formatearFecha(fecha) {
  if (!fecha) return "—";
  const fechaObj = new Date(fecha);
  if (Number.isNaN(fechaObj.getTime())) return "—";
  return fechaObj.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Gauge({ label, value, max = 100, unit = "%", color = "#3fb6b6" }) {
  const disponible =
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value));
  const numero = disponible ? Number(value) : 0;
  const porcentaje = disponible
    ? Math.max(0, Math.min(100, (numero / max) * 100))
    : 0;

  return (
    <div style={styles.gaugeCard}>
      <div style={styles.gaugeLabel}>{label}</div>
      <div style={styles.gaugeWrap}>
        <div
          style={{
            ...styles.gaugeRing,
            background: `conic-gradient(${color} ${porcentaje}%, #f0f0f0 ${porcentaje}% 100%)`,
          }}
        />
        <div style={styles.gaugeInner}>
          {disponible ? Number(numero.toFixed(1)) : "—"}
          {disponible && <span style={{ fontSize: 14 }}>{unit}</span>}
        </div>
      </div>
      <div style={styles.gaugeScale}>
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function LineChart({ data }) {
  if (!data.length) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#777", textAlign: "center" }}>
        No hay mediciones históricas disponibles.
      </div>
    );
  }

  const width = 400;
  const height = 140;
  const padding = 25;
  const pasoX = (width - padding * 2) / Math.max(1, data.length - 1);
  const puntos = data.map((lectura, indice) => {
    const humedad = Number(lectura.humedad_suelo);
    return {
      x: padding + indice * pasoX,
      y: height - padding - (Math.max(0, Math.min(100, humedad)) / 100) * (height - padding * 2),
      humedad,
      fecha: lectura.fecha,
    };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height + 30}`} width="100%" height="100%" role="img" aria-label="Historial de humedad del suelo">
      {[0, 25, 50, 75, 100].map((valor) => {
        const y = height - padding - (valor / 100) * (height - padding * 2);
        return (
          <g key={valor}>
            <text x="0" y={y + 4} fontSize="10" fill="#666">{valor}</text>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e0e0e0" />
          </g>
        );
      })}
      {puntos.length > 1 && (
        <polyline
          points={puntos.map((punto) => `${punto.x},${punto.y}`).join(" ")}
          fill="none"
          stroke="#2f7bd6"
          strokeWidth="3"
        />
      )}
      {puntos.map((punto, indice) => (
        <circle key={`${punto.fecha}-${indice}`} cx={punto.x} cy={punto.y} r="3" fill="#2f7bd6">
          <title>{`${formatearFecha(punto.fecha)}: ${punto.humedad}%`}</title>
        </circle>
      ))}
      <text x={padding} y={height + 15} fontSize="10" fill="#666">
        {formatearFecha(data[0].fecha)}
      </text>
      {data.length > 1 && (
        <text x={width - padding} y={height + 15} textAnchor="end" fontSize="10" fill="#666">
          {formatearFecha(data[data.length - 1].fecha)}
        </text>
      )}
    </svg>
  );
}

// Control solo visual: deshabilitado hasta verificar comandos y hardware.
function NodoToggle({ nombre }) {
  return (
    <div style={{ ...styles.nodoToggleGrande, opacity: 0.55 }}>
      <span style={{ fontWeight: "bold" }}>{nombre}</span>
      <button
        type="button"
        disabled
        aria-label={`${nombre}: no disponible hasta probar el hardware`}
        title="Control deshabilitado hasta probar el hardware"
        style={{ ...styles.switch, background: "#e0e0e0", cursor: "not-allowed", border: "none" }}
      >
        <span style={{ ...styles.switchKnob, left: 2 }} />
      </button>
    </div>
  );
}

export default function NodoDetalle({ usuario, onLogout }) {
  const { nodoId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [mapaAbierto, setMapaAbierto] = useState(false);
  const [parcelaMapa, setParcelaMapa] = useState(null);
  const [nodo, setNodo] = useState(null);
  const [nodos, setNodos] = useState([]);
  const [medicion, setMedicion] = useState(null);
  const [lecturas, setLecturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [errorActual, setErrorActual] = useState("");
  const [errorHistorial, setErrorHistorial] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    const controlador = new AbortController();

    const consultar = async (ruta, token) => {
      const respuesta = await fetch(`${API_URL}${ruta}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controlador.signal,
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(datos.error || datos.msg || `Error HTTP ${respuesta.status}`);
      }
      return datos;
    };

    const cargar = async () => {
      setCargando(true);
      setError("");
      setErrorActual("");
      setErrorHistorial("");
      setNodo(null);
      setMedicion(null);
      setLecturas([]);

      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      if (!token) {
        setError("No hay una sesión válida. Inicia sesión nuevamente.");
        setCargando(false);
        return;
      }

      try {
        // La lista ya está filtrada por el backend según el rol del usuario.
        const lista = await consultar("/api/nodos", token);
        if (!Array.isArray(lista)) throw new Error("Formato de nodos no válido.");
        if (controlador.signal.aborted) return;
        setNodos(lista);

        const seleccionado = lista.find((item) => String(item.id) === String(nodoId));
        if (!seleccionado) {
          throw new Error("Nodo no encontrado o sin permiso para esta cuenta.");
        }
        if (seleccionado.tipo === "estacion") {
          throw new Error("Esta ruta muestra sensores de suelo; el registro seleccionado es una estación meteorológica.");
        }
        setNodo(seleccionado);

        const ahora = new Date();
        const inicio = new Date(ahora.getTime() - 6 * 24 * 60 * 60 * 1000);
        const parametros = new URLSearchParams({
          parcela_id: String(seleccionado.parcela_id),
          inicio: inicio.toISOString(),
          fin: ahora.toISOString(),
          intervalo: "raw",
        });

        // Se consultan por separado: el fallo del histórico no oculta la lectura actual.
        const [resultadoActual, resultadoHistorico] = await Promise.allSettled([
          consultar(`/api/sensores/actual?parcela_id=${seleccionado.parcela_id}`, token),
          consultar(`/api/sensores/historico?${parametros.toString()}`, token),
        ]);
        if (controlador.signal.aborted) return;

        if (resultadoActual.status === "fulfilled") {
          const registros = Array.isArray(resultadoActual.value.nodos) ? resultadoActual.value.nodos : [];
          const actual = registros.find(
            (item) => String(item.nodo_id) === String(seleccionado.id) ||
              item.identificador === seleccionado.identificador
          );
          setMedicion(actual ?? null);
        } else {
          setErrorActual(resultadoActual.reason?.message || "No se pudieron cargar las mediciones.");
        }

        if (resultadoHistorico.status === "fulfilled") {
          const registros = Array.isArray(resultadoHistorico.value.nodos) ? resultadoHistorico.value.nodos : [];
          const historialNodo = registros.find(
            (item) => String(item.nodo_id) === String(seleccionado.id) ||
              item.identificador === seleccionado.identificador
          );
          const valores = (Array.isArray(historialNodo?.lecturas) ? historialNodo.lecturas : [])
            .filter((item) =>
              item.humedad_suelo !== null &&
              item.humedad_suelo !== undefined &&
              Number.isFinite(Number(item.humedad_suelo)) &&
              item.fecha &&
              !Number.isNaN(new Date(item.fecha).getTime())
            )
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
          setLecturas(valores);
        } else {
          setErrorHistorial(resultadoHistorico.reason?.message || "No se pudo consultar el historial.");
        }
      } catch (e) {
        if (!controlador.signal.aborted) setError(e.message || "Error al cargar el nodo.");
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    };

    cargar();
    return () => controlador.abort();
  }, [nodoId, recarga]);

  const handleLogout = () => onLogout?.();

  const abrirMapa = async () => {
    setMapaAbierto(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const respuesta = await fetch(`${API_URL}/api/parcelas`, { headers: { Authorization: `Bearer ${token}` } });
      if (!respuesta.ok) return;
      const resultado = await respuesta.json();
      const lista = Array.isArray(resultado) ? resultado : resultado.parcelas ?? [];
      setParcelaMapa(lista.find(p => Number(p.id) === Number(nodo?.parcela_id)) || null);
    } catch { /* El mapa mostrará la parcela sin coordenadas si no es posible consultarlas. */ }
  };

  return (
    <div style={styles.app}>
      <aside
        className="no-imprimir"
        style={{
          ...styles.sidebar,
          width: sidebarAbierta ? 250 : 0,
          minWidth: sidebarAbierta ? 250 : 0,
          borderRight: sidebarAbierta ? "1px solid #e0e0e0" : "none",
          opacity: sidebarAbierta ? 1 : 0,
        }}
      >
        <div style={{ visibility: sidebarAbierta ? "visible" : "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={styles.sidebarHeader}>
            <button type="button" style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", marginRight: 15 }} onClick={() => setSidebarAbierta(false)} aria-label="Cerrar menú">←</button>
            <h2 style={{ margin: 0, fontSize: 20 }}>Menú</h2>
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>PRINCIPAL</div>
            <Link to="/dashboard" style={location.pathname === "/dashboard" ? styles.sidebarLinkActive : styles.sidebarLink}>Vista general</Link>
            <Link to="/Bitacoras" style={location.pathname === "/Bitacoras" ? styles.sidebarLinkActive : styles.sidebarLink}>Bitácoras</Link>
            <Link to="/gestion" style={styles.sidebarLink}>Parcelas y nodos</Link>
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>NODOS DE SUELO</div>
            {nodos
              .filter(
                (item) =>
                  item.tipo !== "estacion" &&
                  item.estado === "activo" &&
                  nodo !== null &&
                  Number(item.parcela_id) === Number(nodo.parcela_id)
              )
              .map((item) => (
                <Link
                  key={item.id}
                  to={`/nodos/${item.id}`}
                  style={
                    location.pathname === `/nodos/${item.id}`
                      ? styles.sidebarLinkActive
                      : styles.sidebarLink
                  }
                >
                  {item.identificador || `Nodo ${item.id}`}
                </Link>
              ))}
            {!nodos.some((item) =>
              item.tipo !== "estacion" &&
              item.estado === "activo" &&
              nodo !== null &&
              Number(item.parcela_id) === Number(nodo.parcela_id)
            ) && (
              <span style={{ padding: "12px 20px", fontSize: 13, color: "#666" }}>Sin nodos disponibles</span>
            )}
          </div>
          <div style={styles.sidebarFooter}>
            <Link to="/config-general" style={styles.sidebarLinkConfig}><span>⚙️</span> Configuración</Link>
          </div>
        </div>
      </aside>

      <div style={styles.mainContent}>
        <header className="no-imprimir" style={styles.banner}>
          <Link to="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img src={logoAgroIA} alt="AgroIA - Riego Inteligente" style={{ height: 60, cursor: "pointer" }} />
          </Link>
          <div style={styles.bannerRight}>
            <div style={styles.tempBadge}>Monitoreo de suelo</div>
            <Notificaciones parcelaId={nodo?.parcela_id} style={styles.iconCircle} />
            <button
              type="button"
              style={{ ...styles.iconCircle, cursor: "pointer", border: "none", color: "#fff" }}
              aria-label="Abrir menú de usuario"
              onClick={() => setMenuAbierto((anterior) => !anterior)}
            >👤</button>
            {menuAbierto && (
              <div style={styles.userMenu}>
                <div style={styles.userMenuHeader}>
                  <div style={styles.userMenuAvatar}>👤</div>
                  <div style={styles.userMenuInfo}>
                    <div style={styles.userMenuName}>{usuario?.nombre ?? "Usuario"}</div>
                    <div style={styles.userMenuEmail}>{usuario?.correo ?? ""}</div>
                  </div>
                </div>
                <div style={styles.userMenuOptions}>
                  {usuario?.rol === "admin" && (
                    <div style={styles.userMenuOption} onClick={() => { navigate("/config-admin"); setMenuAbierto(false); }}>
                      <span style={styles.userMenuBullet}>•</span> Gestión de usuarios
                    </div>
                  )}
                  <div style={styles.userMenuOption} onClick={() => { navigate("/config-cuenta"); setMenuAbierto(false); }}>
                    <span style={styles.userMenuBullet}>•</span> Gestión de cuenta
                  </div>
                </div>
                <button
                  type="button"
                  style={{ ...styles.userMenuLogout, width: "100%", background: "transparent", borderLeft: "none", borderRight: "none", borderBottom: "none", color: "#fff", textAlign: "left" }}
                  onClick={handleLogout}
                >🚪 Cerrar sesión</button>
              </div>
            )}
          </div>
        </header>

        <div className="no-imprimir" style={styles.toolbar}>
          {!sidebarAbierta && (
            <button type="button" onClick={() => setSidebarAbierta(true)} aria-label="Abrir menú" style={{ border: "none", background: "transparent", fontSize: 24, cursor: "pointer" }}>☰</button>
          )}
          <button type="button" title="Ver mapa de la parcela" onClick={abrirMapa} style={{ ...styles.mapIconBorder, background: "#fff", cursor: "pointer" }}><span style={{ fontSize: 24 }}>🗺️</span></button>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>
              {nodo ? `Parcela ${nodo.parcela_id}` : "Parcela"}
            </h2>
            <div style={styles.dots} aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <span key={i} style={{ ...styles.dot, background: "#ccc" }} />)}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
            <div style={styles.selectGroupContainer}>
              <span style={{ fontSize: 10, color: "#777", marginBottom: 2 }}>Tipo de riego</span>
              <TipoRiegoSelector parcelaId={nodo?.parcela_id} style={styles.select} />
            </div>
            <NodoToggle nombre="Control de riego" />
            <button type="button" onClick={() => setRecarga((anterior) => anterior + 1)} disabled={cargando} style={{ ...styles.logoutBtn, opacity: cargando ? 0.5 : 1 }}>
              {cargando ? "Cargando..." : "Actualizar lecturas"}
            </button>
            <button type="button" onClick={handleLogout} style={styles.logoutBtn}>Salir</button>
          </div>
        </div>

        <main style={styles.main}>
          <h2 style={styles.sectionTitle}>{nodo?.identificador ?? "Detalle de nodo"}</h2>
          {cargando && <p style={{ color: "#666" }}>Cargando información del nodo...</p>}
          {error && <p role="alert" style={{ color: "#b42318", fontWeight: 600 }}>{error}</p>}

          {!cargando && !error && nodo && (
            <>
              <p style={{ color: "#666", marginTop: 0 }}>
                Nodo #{nodo.id} · Parcela {nodo.parcela_id} · Tipo: {nodo.tipo}
              </p>
              {errorActual && <p role="alert" style={{ color: "#b42318" }}>No se pudieron consultar las mediciones actuales: {errorActual}</p>}
              {!errorActual && !medicion && <p style={{ color: "#777" }}>Este nodo todavía no tiene mediciones registradas.</p>}
              <div style={styles.gaugeGridNodo}>
                <Gauge label="Humedad del suelo" value={medicion?.humedad_suelo} color="#e6f4cd" />
                <Gauge label="Temperatura del suelo" value={medicion?.temp_suelo} unit="°C" max={60} color="#e0e0e0" />
                <Gauge label="Batería" value={medicion?.bateria_pct} color="#2b3b75" />
              </div>
              <div style={styles.bottomSectionNodo}>
                <div style={styles.chartCard}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Humedad del suelo</h3>
                  <div style={{ height: 180 }}><LineChart data={lecturas} /></div>
                  {errorHistorial && <p role="alert" style={{ color: "#b42318", fontSize: 12 }}>No se pudo consultar el historial: {errorHistorial}</p>}
                </div>
                <div style={styles.statsColNodo}>
                  <div style={styles.statBoxLigero}>
                    <div style={styles.statLabel}>Identificador</div>
                    <div style={{ ...styles.statValue, fontSize: 13, overflowWrap: "anywhere" }}>{nodo.identificador}</div>
                  </div>
                  <div style={styles.statBoxLigero}>
                    <div style={styles.statLabel}>Estado registrado</div>
                    <div style={styles.statValue}>{nodo.estado ?? "—"}</div>
                  </div>
                  <div style={styles.statBoxLigero}>
                    <div style={styles.statLabel}>Última medición</div>
                    <div style={{ ...styles.statValue, fontSize: 13 }}>{formatearFecha(medicion?.fecha_lectura)}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      {mapaAbierto && <MapaParcela parcela={parcelaMapa || { id: nodo?.parcela_id, nombre: `Parcela ${nodo?.parcela_id}` }} onClose={() => setMapaAbierto(false)} />}
    </div>
  );
}

const styles = {

  app: { 

    display: "flex", 

    maxWidth: "100%", 

    minHeight: "100vh", 

    margin: 0, 

    background: "#fdfdfd", 

    fontFamily: "sans-serif" 

  },



  sidebar: { 

    backgroundColor: "#f4f6f8", 

    display: "flex", 

    flexDirection: "column", 

    boxSizing: "border-box", 

    transition: "width 0.3s ease, min-width 0.3s ease, opacity 0.3s ease", 

    overflow: "hidden", 

    whiteSpace: "nowrap", 

    zIndex: 10 

  },

  sidebarHeader: { display: "flex", alignItems: "center", padding: "20px 20px", borderBottom: "1px solid #e0e0e0", marginBottom: "20px", color: "#333" },

  sidebarSection: { marginBottom: "25px", display: "flex", flexDirection: "column" },

  sidebarSectionTitle: { padding: "0 20px", fontSize: "12px", fontWeight: "bold", color: "#888", letterSpacing: "1px", marginBottom: "10px" },

  sidebarLink: { display: "block", padding: "12px 20px", color: "#444", textDecoration: "none", fontSize: "15px", fontWeight: "600", transition: "background 0.2s, color 0.2s" },

  sidebarLinkActive: { display: "block", padding: "12px 20px", textDecoration: "none", fontSize: "15px", fontWeight: "600", backgroundColor: "#e6f4cd", color: "#5a7d3c", borderLeft: "4px solid #7A9D54" },

  sidebarFooter: { marginTop: "auto", padding: "20px 0", borderTop: "1px solid #e0e0e0" },

  sidebarLinkConfig: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 20px", color: "#444", textDecoration: "none", fontSize: "15px", fontWeight: "600" },



  mainContent: { 

    flex: 1, 

    display: "flex", 

    flexDirection: "column", 

    overflowY: "auto",

    minWidth: 0 

  },

  banner: {background: "#7A9D54", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px"},

  brand: { display: "flex", alignItems: "center", gap: 10 },

  brandTitle: { margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 900, textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },

  brandSubtitle: { display: "block", fontSize: 10, letterSpacing: 1, opacity: 0.9 },



  bannerRight: { display: "flex", alignItems: "center", gap: 14, position: "relative" },



  tempBadge: { background: "rgba(0,0,0,0.3)", padding: "6px 14px", borderRadius: 20, fontWeight: 600 },

  iconCircle: { width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },



  userMenu: {

    position: "absolute",

    top: 65,

    right: 0,

    width: 260,

    backgroundColor: "#2E5233",

    borderRadius: 12,

    padding: "16px",

    color: "#fff",

    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",

    zIndex: 100,

    fontFamily: "sans-serif",

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

  userMenuInfo: {

    display: "flex",

    flexDirection: "column",

  },

  userMenuName: {

    fontSize: 15,

    fontWeight: "bold",

    textTransform: "uppercase",

    letterSpacing: 0.5,

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

    fontSize: 14,

    cursor: "pointer",

    display: "flex",

    alignItems: "center",

    padding: "4px 0",

    transition: "opacity 0.2s",

  },

  userMenuBullet: {

    marginRight: 8,

    fontSize: 18,

    lineHeight: 1,

  },

  userMenuLogout: {

    display: "flex",

    alignItems: "center",

    fontSize: 14,

    cursor: "pointer",

    borderTop: "1px solid rgba(255,255,255,0.15)",

    paddingTop: 12,

    fontWeight: "bold",

  },



  toolbar: { display: "flex", alignItems: "center", gap: 15, padding: "14px 24px", background: "#fff", borderBottom: "1px solid #eee", flexWrap: "wrap" },

  mapIconBorder: { border: "2px solid #ccc", borderRadius: 12, padding: "4px 8px" },

  dots: { display: "flex", gap: 6, marginTop: 4 },

  dot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },

  selectGroupContainer: { border: "1px solid #ccc", borderRadius: 8, padding: "4px 8px", display: "flex", flexDirection: "column", background: "#fff" },

  select: { border: "none", outline: "none", background: "transparent", fontSize: 12 },

  nodoToggleGrande: { border: "1px solid #ccc", borderRadius: 12, padding: "6px 12px", display: "flex", flexDirection: "column", alignItems: "center", fontSize: 14, gap: 6, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },

  switch: { width: 50, height: 26, borderRadius: 20, position: "relative", transition: "background 0.2s" },

  switchKnob: { content: "", position: "absolute", top: 2, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s" },

  logoutBtn: { padding: "6px 12px", cursor: "pointer", border: "1px solid #ccc", borderRadius: 6, background: "#f9f9f9" },



  main: { 

    padding: "20px 24px 24px", 

    background: "#fdfdfd", 

    flex: 1,

    overflowX: "auto" 

  },

  sectionTitle: { margin: "0 0 20px", fontSize: 26, fontWeight: "bold" },

  gaugeGridNodo: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 30 },

  gaugeCard: { border: "2px solid #eaeaea", borderRadius: 16, padding: "20px 10px", textAlign: "center", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" },

  gaugeLabel: { fontSize: 14, color: "#333", marginBottom: 15 },

  gaugeWrap: { position: "relative", width: 130, height: 130, margin: "0 auto" },

  gaugeRing: { width: "100%", height: "100%", borderRadius: "50%" },

  gaugeInner: { position: "absolute", top: 12, left: 12, right: 12, bottom: 12, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24, color: "#444" },

  gaugeScale: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#999", padding: "10px 15px 0" },

  bottomSectionNodo: { display: "flex", gap: 20, flexWrap: "wrap" },

  chartCard: { flex: 2, border: "2px solid #eaeaea", borderRadius: 12, padding: 20, background: "#fff", minWidth: 300 },

  statsColNodo: { flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 15, justifyContent: "space-between" },

  statBoxLigero: { background: "#f3f5ef", borderRadius: 20, padding: "15px 10px", textAlign: "center" },

  statLabel: { fontSize: 12, color: "#8b9c7b", fontWeight: "bold", marginBottom: 4 },

  statValue: { fontSize: 20, fontWeight: 800, color: "#000" },

};