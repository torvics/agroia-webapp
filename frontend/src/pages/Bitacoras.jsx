import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoAgroIA from "../assets/agroia-logo.png";
import Notificaciones from "../components/AvisosPanel";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/api\/?$/, "");

const LIMITE_PAGINA = 100; // El backend admite un máximo de 100 registros por solicitud.

const fechaInput = (fecha) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

function fechaHora(fecha) {
  if (!fecha) return "—";
  const objeto = new Date(fecha);
  if (Number.isNaN(objeto.getTime())) return "—";
  return objeto.toLocaleString("es-MX", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

async function consultarAPI(ruta, signal) {
  const token =
    localStorage.getItem("access_token") || localStorage.getItem("token");
  if (!token) throw new Error("No hay sesión activa. Inicia sesión nuevamente.");

  const respuesta = await fetch(`${API_URL}/api${ruta}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(
      resultado.error || resultado.msg || `Error HTTP ${respuesta.status} al consultar ${ruta}`
    );
  }
  return resultado;
}

function GraficaActividad({ registros }) {
  const dias = useMemo(() => {
    const conteos = new Map();
    for (const registro of registros) {
      const fecha = registro.fecha ? new Date(registro.fecha) : null;
      if (!fecha || Number.isNaN(fecha.getTime())) continue;
      const dia = fechaInput(fecha); // Día local, igual que los filtros visibles.
      conteos.set(dia, (conteos.get(dia) || 0) + 1);
    }
    return [...conteos.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, cantidad]) => ({ dia, cantidad }));
  }, [registros]);

  if (!dias.length) return <p style={styles.sinDatos}>Sin registros en esta página.</p>;

  const ancho = 330, alto = 140, margen = 25;
  const maximo = Math.max(1, ...dias.map((d) => d.cantidad));
  const paso = (ancho - margen * 2) / Math.max(1, dias.length - 1);
  const puntos = dias.map((d, i) => ({
    x: margen + i * paso,
    y: alto - margen - (d.cantidad / maximo) * (alto - margen * 2),
  }));

  return (
    <svg viewBox={`0 0 ${ancho} ${alto + 25}`} width="100%" role="img"
      aria-label="Cantidad de acciones registradas por día, en esta página">
      {[0, 0.5, 1].map((fraccion) => {
        const y = alto - margen - fraccion * (alto - margen * 2);
        return (
          <g key={fraccion}>
            <line x1={margen} x2={ancho - margen} y1={y} y2={y}
              stroke="#e0e0e0" />
            <text x="3" y={y + 4} fontSize="10" fill="#777">
              {Math.round(fraccion * maximo)}
            </text>
          </g>
        );
      })}
      {puntos.length > 1 && (
        <polyline points={puntos.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none" stroke="#2f7bd6" strokeWidth="3" />
      )}
      {puntos.map((p, i) => (
        <circle key={dias[i].dia} cx={p.x} cy={p.y} r="4" fill="#2f7bd6">
          <title>{`${dias[i].dia}: ${dias[i].cantidad} registro(s)`}</title>
        </circle>
      ))}
      <text x={margen} y={alto + 14} fontSize="10" fill="#777">
        {dias[0].dia}
      </text>
      {dias.length > 1 && (
        <text x={ancho - margen} y={alto + 14} textAnchor="end"
          fontSize="10" fill="#777">{dias[dias.length - 1].dia}</text>
      )}
    </svg>
  );
}

function GraficaAcciones({ registros }) {
  const acciones = useMemo(() => {
    const conteos = new Map();
    for (const registro of registros) {
      const accion = registro.accion || "Sin descripción";
      conteos.set(accion, (conteos.get(accion) || 0) + 1);
    }
    return [...conteos.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [registros]);

  if (!acciones.length) return <p style={styles.sinDatos}>Sin registros en esta página.</p>;
  const maximo = Math.max(...acciones.map(([, cantidad]) => cantidad));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {acciones.map(([accion, cantidad]) => (
        <div key={accion} style={{ display: "grid", gridTemplateColumns: "minmax(100px, 1fr) 2fr 26px", alignItems: "center", gap: 8 }}>
          <span title={accion} style={{ fontSize: 11, overflowWrap: "anywhere" }}>{accion}</span>
          <div style={{ background: "#e9eeeb", height: 12, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${cantidad / maximo * 100}%`, height: "100%", background: "#7A9D54" }} />
          </div>
          <span style={{ fontSize: 11, textAlign: "right" }}>{cantidad}</span>
        </div>
      ))}
      {new Set(registros.map((r) => r.accion || "Sin descripción")).size > 8 && (
        <p style={styles.sinDatos}>Se muestran las 8 acciones más frecuentes.</p>
      )}
    </div>
  );
}

export default function Bitacoras({ usuario, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [perfil, setPerfil] = useState(usuario ?? null);
  const [parcelas, setParcelas] = useState([]);
  const [nodos, setNodos] = useState([]);
  const [parcelaId, setParcelaId] = useState("");
  const [nodoId, setNodoId] = useState("");
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [errorInicial, setErrorInicial] = useState("");

  const [desde, setDesde] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 29);
    return fechaInput(fecha);
  });
  const [hasta, setHasta] = useState(() => fechaInput(new Date()));
  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function cargarInicial() {
      setCargandoInicial(true);
      setErrorInicial("");
      try {
        const [respuestaParcelas, respuestaNodos, respuestaPerfil] = await Promise.all([
          consultarAPI("/parcelas", controller.signal),
          consultarAPI("/nodos", controller.signal),
          consultarAPI("/auth/perfil", controller.signal),
        ]);
        if (controller.signal.aborted) return;
        const listaParcelas = Array.isArray(respuestaParcelas)
          ? respuestaParcelas : respuestaParcelas.parcelas ?? [];
        if (!Array.isArray(listaParcelas) || !Array.isArray(respuestaNodos)) {
          throw new Error("Flask devolvió un formato de parcelas o nodos no válido.");
        }
        setParcelas(listaParcelas);
        setNodos(respuestaNodos);
        setPerfil(respuestaPerfil.usuario ?? respuestaPerfil);
        setParcelaId(listaParcelas.length ? String(listaParcelas[0].id) : "");
      } catch (e) {
        if (!controller.signal.aborted) setErrorInicial(e.message);
      } finally {
        if (!controller.signal.aborted) setCargandoInicial(false);
      }
    }

    cargarInicial();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setRegistros([]);
    setError("");

    if (!parcelaId || cargandoInicial || errorInicial) {
      setCargando(false);
      return () => controller.abort();
    }
    if (!desde || !hasta || desde > hasta) {
      setError("Selecciona un rango de fechas válido.");
      setCargando(false);
      return () => controller.abort();
    }

    async function cargarRegistros() {
      setCargando(true);
      try {
        // La API guarda las fechas en UTC. Enviamos los límites del día local con su zona horaria.
        const inicio = new Date(`${desde}T00:00:00`);
        const fin = new Date(`${hasta}T23:59:59.999`);
        const parametros = new URLSearchParams({
          parcela_id: String(parcelaId),
          inicio: inicio.toISOString(),
          fin: fin.toISOString(),
          pagina: String(pagina),
          limite: String(LIMITE_PAGINA),
        });
        if (nodoId) parametros.set("nodo_id", nodoId);

        const respuesta = await consultarAPI(`/bitacora?${parametros}`, controller.signal);
        if (!Array.isArray(respuesta)) throw new Error("La bitácora no devolvió una lista válida.");
        if (!controller.signal.aborted) setRegistros(respuesta);
      } catch (e) {
        if (!controller.signal.aborted) setError(e.message);
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }

    cargarRegistros();
    return () => controller.abort();
  }, [parcelaId, nodoId, desde, hasta, pagina, cargandoInicial, errorInicial]);

  const parcelaSeleccionada = parcelas.find((p) => String(p.id) === parcelaId);
  const nodosParcela = nodos.filter((n) =>
    String(n.parcela_id) === parcelaId && n.tipo !== "estacion"
  );
  // Conservar nodos inactivos en filtros de historial, pero no en navegación.
  const nodosMenuActivos = nodosParcela.filter((n) => n.estado === "activo");
  const identificadorPorId = useMemo(() =>
    new Map(nodos.map((n) => [String(n.id), n.identificador || `Nodo ${n.id}`])),
    [nodos]
  );

  const resumen = useMemo(() => {
    const dias = new Set();
    const nodosConRegistros = new Set();
    const acciones = new Set();
    for (const r of registros) {
      const fecha = r.fecha ? new Date(r.fecha) : null;
      if (fecha && !Number.isNaN(fecha.getTime())) dias.add(fechaInput(fecha));
      if (r.nodo_id !== null && r.nodo_id !== undefined) nodosConRegistros.add(r.nodo_id);
      acciones.add(r.accion || "Sin descripción");
    }
    return {
      cantidad: registros.length,
      dias: dias.size,
      nodos: nodosConRegistros.size,
      acciones: acciones.size,
      ultimo: registros.length ? fechaHora(registros[0].fecha) : "—",
    };
  }, [registros]);

  const cambiarParcela = (id) => {
    setParcelaId(id);
    setNodoId("");
    setPagina(1);
  };

  const handleLogout = () => {
    if (typeof onLogout === "function") onLogout();
  };

  const fechaGeneracion = new Date().toLocaleString("es-MX", {
    year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div style={styles.app}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #bitacora-imprimible, #bitacora-imprimible * { visibility: visible; }
          #bitacora-imprimible { position: absolute; top: 0; left: 0; width: 100%; }
          .no-imprimir { display: none !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}</style>

      <aside className="no-imprimir" style={{
        ...styles.sidebar,
        width: sidebarAbierta ? 250 : 0,
        minWidth: sidebarAbierta ? 250 : 0,
        padding: 0,
        borderRight: sidebarAbierta ? "1px solid #e0e0e0" : "none",
        opacity: sidebarAbierta ? 1 : 0,
      }}>
        <div style={{ visibility: sidebarAbierta ? "visible" : "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={styles.sidebarHeader}>
            <button type="button" onClick={() => setSidebarAbierta(false)}
              style={{ border: "none", background: "none", fontSize: 23, cursor: "pointer", marginRight: 12 }}
              aria-label="Cerrar menú">←</button>
            <h2 style={{ margin: 0, fontSize: 20 }}>Menú</h2>
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>PRINCIPAL</div>
            <Link to="/dashboard" style={styles.sidebarLink}>Vista general</Link>
            <Link to="/Bitacoras" style={location.pathname.toLowerCase() === "/bitacoras" ? styles.sidebarLinkActive : styles.sidebarLink}>Bitácoras</Link>
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>NODOS DE SUELO</div>
            {nodosMenuActivos.length ? nodosMenuActivos.map((n) => (
              <Link key={n.id} to={`/nodos/${n.id}`} style={styles.sidebarLink}>
                {n.identificador || `Nodo ${n.id}`}
              </Link>
            )) : <span style={{ padding: "12px 20px", fontSize: 12, color: "#777" }}>Sin nodos en esta parcela</span>}
          </div>
          <div style={styles.sidebarFooter}>
            <Link to="/config-general" style={styles.sidebarLinkConfig}>
              <span>⚙️</span> Configuración
            </Link>
          </div>
        </div>
      </aside>

      <div style={styles.mainContent}>
        <header className="no-imprimir" style={styles.banner}>
          <Link to="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img src={logoAgroIA} alt="Agro IA - Riego Inteligente" style={{ height: 60 }} />
          </Link>
          <div style={styles.bannerRight}>
            <div style={styles.tempBadge}>Registro de acciones</div>
            <Notificaciones parcelaId={parcelaId} style={styles.iconCircle} />
            <button type="button" style={{ ...styles.iconCircle, border: 0, color: "inherit", cursor: "pointer" }}
              onClick={() => setMenuAbierto((prev) => !prev)} aria-label="Abrir menú de usuario">👤</button>
            {menuAbierto && (
              <div style={styles.userMenu}>
                <div style={styles.userMenuHeader}>
                  <div style={styles.userMenuAvatar}>👤</div>
                  <div style={styles.userMenuInfo}>
                    <div style={styles.userMenuName}>{perfil?.nombre ?? "Usuario"}</div>
                    <div style={styles.userMenuEmail}>{perfil?.correo ?? ""}</div>
                  </div>
                </div>
                <div style={styles.userMenuOptions}>
                  {perfil?.rol === "admin" && (
                    <div style={styles.userMenuOption} onClick={() => navigate("/config-admin")}>
                      <span style={styles.userMenuBullet}>•</span> Gestión de usuarios
                    </div>
                  )}
                  <div style={styles.userMenuOption} onClick={() => navigate("/config-cuenta")}>
                    <span style={styles.userMenuBullet}>•</span> Gestión de cuenta
                  </div>
                </div>
                <button type="button" style={{ ...styles.userMenuLogout, background: "none", color: "inherit", width: "100%", borderLeft: 0, borderRight: 0, borderBottom: 0 }}
                  onClick={handleLogout}>
                  <span style={{ marginRight: 8 }}>🚪</span> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="no-imprimir" style={styles.toolbar}>
          {!sidebarAbierta && (
            <button type="button" style={{ border: 0, background: "none", fontSize: 24, cursor: "pointer" }}
              aria-label="Abrir menú lateral" onClick={() => setSidebarAbierta(true)}>☰</button>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Bitácoras</h2>
            <span style={{ fontSize: 12, color: "#888" }}>Acciones registradas y filtrables por parcela y fecha</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap" }}>
            <label style={styles.filtroCampo}>
              <span style={{ fontSize: 10, color: "#777" }}>Parcela</span>
              <select value={parcelaId} onChange={(e) => cambiarParcela(e.target.value)}
                style={styles.dateInput} disabled={cargandoInicial || !parcelas.length}>
                {parcelas.length === 0 && <option value="">Sin parcelas</option>}
                {parcelas.map((p) => <option key={p.id} value={String(p.id)}>{p.nombre || `Parcela ${p.id}`}</option>)}
              </select>
            </label>
            <label style={styles.filtroCampo}>
              <span style={{ fontSize: 10, color: "#777" }}>Nodo</span>
              <select value={nodoId} onChange={(e) => { setNodoId(e.target.value); setPagina(1); }}
                style={styles.dateInput} disabled={!parcelaId}>
                <option value="">Todos los nodos</option>
                {nodosParcela.map((n) => <option key={n.id} value={String(n.id)}>{n.identificador || `Nodo ${n.id}`}</option>)}
              </select>
            </label>
            <label style={styles.filtroCampo}>
              <span style={{ fontSize: 10, color: "#777" }}>Desde</span>
              <input type="date" value={desde} max={hasta} onChange={(e) => { setDesde(e.target.value); setPagina(1); }} style={styles.dateInput} />
            </label>
            <label style={styles.filtroCampo}>
              <span style={{ fontSize: 10, color: "#777" }}>Hasta</span>
              <input type="date" value={hasta} min={desde} onChange={(e) => { setHasta(e.target.value); setPagina(1); }} style={styles.dateInput} />
            </label>
            <button type="button" onClick={() => window.print()}
              disabled={cargando || cargandoInicial || !!error || !!errorInicial || !parcelaId}
              style={{ ...styles.printBtn, opacity: cargando || cargandoInicial || error || errorInicial || !parcelaId ? 0.45 : 1 }}>
              🖨️ Imprimir
            </button>
            <button type="button" onClick={() => navigate("/dashboard")} style={styles.logoutBtn}>Volver</button>
          </div>
        </div>

        <main style={styles.main}>
          {errorInicial && <p style={{ color: "#b42318" }}>Error al cargar los datos iniciales: {errorInicial}</p>}
          {error && <p style={{ color: "#b42318" }}>Error al cargar la bitácora: {error}</p>}
          {(cargando || cargandoInicial) && <p style={{ color: "#666" }}>Cargando registros...</p>}
          {!cargandoInicial && !errorInicial && !parcelaId && <p style={{ color: "#666" }}>No hay parcelas disponibles para consultar.</p>}

          <div id="bitacora-imprimible" style={styles.reporte}>
            <div style={styles.reporteHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 30 }}>🌱</span>
                <div>
                  <div style={styles.reporteTitulo}>Agro IA</div>
                  <div style={styles.reporteSubtitulo}>Tecnología para un campo más inteligente</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={styles.reporteReporteTitulo}>Bitácora de acciones</div>
                <div style={styles.reporteFechaGen}>Generado el: {fechaGeneracion}</div>
              </div>
            </div>

            <h3 style={styles.reporteSeccion}>Información de la Parcela</h3>
            <div style={styles.infoGrid}>
              <div><div style={styles.infoLabel}>Parcela</div><div style={styles.infoValor}>{parcelaSeleccionada?.nombre ?? "—"}</div></div>
              <div><div style={styles.infoLabel}>Ubicación registrada</div><div style={styles.infoValor}>{parcelaSeleccionada?.ubicacion || "No registrada"}</div></div>
              <div><div style={styles.infoLabel}>Usuario consultante</div><div style={styles.infoValor}>{perfil?.nombre ?? "—"}</div></div>
              <div><div style={styles.infoLabel}>Rango seleccionado</div><div style={styles.infoValor}>{desde} a {hasta}</div></div>
              <div><div style={styles.infoLabel}>Nodo</div><div style={styles.infoValor}>{nodoId ? identificadorPorId.get(nodoId) || `Nodo ${nodoId}` : "Todos"}</div></div>
              <div><div style={styles.infoLabel}>Página</div><div style={styles.infoValor}>{pagina}</div></div>
            </div>

            <p style={{ fontSize: 12, color: "#666", margin: "4px 0 14px" }}>
              Los resultados y resúmenes corresponden exclusivamente a la página consultada
              (máximo {LIMITE_PAGINA} registros). Las acciones registradas no confirman por sí solas
              que se haya ejecutado riego físico. El endpoint no proporciona litros, temperatura,
              humedad ni lluvia por registro.
            </p>

            <h3 style={styles.reporteSeccion}>Resumen de registros visibles</h3>
            <div style={styles.gaugeGrid}>
              {[
                ["📋", "Registros", resumen.cantidad],
                ["📅", "Días con actividad", resumen.dias],
                ["🌱", "Nodos con registros", resumen.nodos],
                ["⚙️", "Acciones distintas", resumen.acciones],
                ["🕒", "Último registro", resumen.ultimo],
              ].map(([icono, titulo, valor]) => (
                <div key={titulo} style={styles.resumenCard}>
                  <div style={styles.resumenIcono}>{icono}</div>
                  <div style={styles.resumenLabel}>{titulo}</div>
                  <div style={{ ...styles.resumenValue, fontSize: titulo === "Último registro" ? 13 : 18 }}>{valor}</div>
                </div>
              ))}
            </div>

            <h3 style={styles.reporteSeccion}>Datos por registro</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Fecha y hora</th>
                    <th style={styles.th}>Parcela</th>
                    <th style={styles.th}>Nodo</th>
                    <th style={styles.th}>Usuario ID</th>
                    <th style={styles.th}>Acción registrada</th>
                  </tr>
                </thead>
                <tbody>
                  {!cargando && registros.length === 0 && (
                    <tr><td style={styles.td} colSpan={5}>No hay registros disponibles en este rango y filtros.</td></tr>
                  )}
                  {registros.map((r) => (
                    <tr key={r.id}>
                      <td style={styles.td}>{fechaHora(r.fecha)}</td>
                      <td style={styles.td}>{parcelaSeleccionada?.nombre || `Parcela ${parcelaId}`}</td>
                      <td style={styles.td}>{r.nodo_id == null ? "—" : identificadorPorId.get(String(r.nodo_id)) || `Nodo ${r.nodo_id}`}</td>
                      <td style={styles.td}>{r.usuario_id ?? "—"}</td>
                      <td style={{ ...styles.td, whiteSpace: "normal", minWidth: 220, overflowWrap: "anywhere" }}>{r.accion || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="no-imprimir" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#666" }}>
                Página {pagina} · {registros.length} registro(s) visibles
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={styles.logoutBtn}
                  disabled={pagina === 1 || cargando} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                  ← Anterior
                </button>
                <button type="button" style={styles.logoutBtn}
                  disabled={registros.length < LIMITE_PAGINA || cargando}
                  onClick={() => setPagina((p) => p + 1)}>Siguiente →</button>
              </div>
            </div>

            <h3 style={styles.reporteSeccion}>Gráficas de registros visibles</h3>
            <div style={styles.bottomSection}>
              <div style={styles.chartCard}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Acciones registradas por día</h4>
                <GraficaActividad registros={registros} />
              </div>
              <div style={styles.chartCard}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Acciones más frecuentes</h4>
                <GraficaAcciones registros={registros} />
              </div>
            </div>

            <div style={styles.reporteFooter}>
              <span>Reporte generado por Agro IA · Página {pagina}</span>
            </div>
          </div>
        </main>
      </div>
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
  sidebarLinkActive: { display: "block", padding: "12px 20px", textDecoration: "none", fontSize: "15px", fontWeight: "600",backgroundColor: "#e6f4cd", color: "#5a7d3c", borderLeft: "4px solid #7A9D54" },
  sidebarFooter: { marginTop: "auto", padding: "20px 0", borderTop: "1px solid #e0e0e0" },
  sidebarLinkConfig: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 20px", color: "#444", textDecoration: "none", fontSize: "15px", fontWeight: "600" },

  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    minWidth: 0,
    width: "100%"
  },
  banner: {background: "#7A9D54", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px"},
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandTitle: { margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 900, textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  brandSubtitle: { display: "block", fontSize: 10, letterSpacing: 1, opacity: 0.9 },

  // CAMBIO: position relative para el menú de usuario
  bannerRight: { display: "flex", alignItems: "center", gap: 14, position: "relative" },

  tempBadge: { background: "rgba(0,0,0,0.3)", padding: "6px 14px", borderRadius: 20, fontWeight: 600 },
  iconCircle: { width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },

  // ESTILOS DEL MENÚ DE USUARIO
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

  toolbar: { display: "flex", alignItems: "center", gap: 15, padding: "14px 24px", borderBottom: "1px solid #eee", background: "#fff", flexWrap: "wrap" },
  filtroCampo: { display: "flex", flexDirection: "column", gap: 2 },
  dateInput: { padding: "5px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 },
  printBtn: { padding: "8px 14px", cursor: "pointer", border: "none", borderRadius: 6, background: "#7A9D54", color: "#fff", fontWeight: "bold", fontSize: 13, whiteSpace: "nowrap" },
  logoutBtn: { padding: "8px 14px", cursor: "pointer", border: "1px solid #ccc", borderRadius: 6, background: "#f9f9f9", fontSize: 13, whiteSpace: "nowrap" },

  main: { padding: "20px 24px 24px", background: "#f8f9fa", flex: 1, overflowX: "auto" },

  reporte: { border: "2px solid #eaeaea", borderRadius: 12, padding: "24px 28px", background: "#fff", maxWidth: "100%", boxSizing: "border-box", overflowX: "auto" },
  reporteHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, borderBottom: "2px solid #eee", paddingBottom: 16, marginBottom: 20 },
  reporteTitulo: { fontSize: 20, fontWeight: 900, color: "#222" },
  reporteSubtitulo: { fontSize: 11, color: "#888" },
  reporteReporteTitulo: { fontSize: 15, fontWeight: 700, color: "#222" },
  reporteFechaGen: { fontSize: 11, color: "#888" },
  reporteSeccion: { fontSize: 16, fontWeight: 700, color: "#222", margin: "20px 0 12px", borderBottom: "1px solid #eee", paddingBottom: 6 },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 10 },
  infoLabel: { fontSize: 11, color: "#999" },
  infoValor: { fontSize: 14, fontWeight: 700, color: "#222" },
  infoSub: { fontSize: 11, color: "#999" },

  gaugeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginBottom: 18 },
  resumenCard: { border: "2px solid #eaeaea", borderRadius: 16, padding: "15px 10px", textAlign: "center", background: "#f3f6fb" },
  resumenIcono: { fontSize: 18, marginBottom: 4 },
  resumenLabel: { fontSize: 11, color: "#7A9D54", fontWeight: "bold", marginBottom: 6 },
  resumenValue: { fontSize: 18, fontWeight: 800, color: "#000" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { textAlign: "left", borderBottom: "2px solid #eee", padding: "8px 10px", color: "#555", whiteSpace: "nowrap" },
  td: { borderBottom: "1px solid #f0f0f0", padding: "8px 10px", whiteSpace: "nowrap" },

  bottomSection: { display: "flex", gap: 20, flexWrap: "wrap" },
  chartCard: { flex: 1, minWidth: 220, border: "2px solid #eaeaea", borderRadius: 12, padding: 14, background: "#fff" },
  sinDatos: { color: "#999", fontSize: 13 },
  reporteFooter: { marginTop: 24, paddingTop: 12, borderTop: "1px solid #eee", fontSize: 11, color: "#999", textAlign: "right" },
};
