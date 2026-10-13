import { useMemo, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import logoAgroIA from "../assets/agroia-logo.png"; 

const DATOS_GENERALES = { clima: { temperatura: 36 } };

// Datos de ejemplo de la parcela. Reemplaza por los datos reales de tu backend.
const PARCELA = {
  nombre: "Parcela 1",
  cultivo: "Frijol",
  ciclo: "Ciclo 3",
  ubicacion: "Nodo 1",
  coordenadas: "29.0920° N, 110.9559° W",
  usuario: "Mariana Sandoval (Agricultor)",
};

// Datos de ejemplo. Reemplaza por la respuesta real de tu backend
// cuando tengas el endpoint de bitácoras (ej. GET /bitacoras?desde=...&hasta=...).
const REGISTROS_EJEMPLO = [
  { fecha: "2026-08-01", nodo: "Nodo 1", tipo: "Automático", litros: 15.0, temperatura: 22.4, humedadSuelo: 28.7, humedadAmbiente: 68.2, lluvia: 0.0, observacion: "Inicio de ciclo" },
  { fecha: "2026-08-03", nodo: "Nodo 1", tipo: "Automático", litros: 18.5, temperatura: 23.1, humedadSuelo: 31.2, humedadAmbiente: 72.6, lluvia: 0.0, observacion: "-" },
  { fecha: "2026-08-05", nodo: "Nodo 1", tipo: "Manual", litros: 20.0, temperatura: 24.8, humedadSuelo: 34.7, humedadAmbiente: 65.3, lluvia: 0.0, observacion: "Riego manual por baja humedad" },
  { fecha: "2026-08-08", nodo: "Nodo 1", tipo: "Inteligente", litros: 12.5, temperatura: 26.2, humedadSuelo: 42.1, humedadAmbiente: 58.7, lluvia: 2.3, observacion: "Lluvia detectada" },
  { fecha: "2026-08-12", nodo: "Nodo 1", tipo: "Automático", litros: 16.0, temperatura: 27.6, humedadSuelo: 37.5, humedadAmbiente: 62.8, lluvia: 0.0, observacion: "-" },
  { fecha: "2026-08-16", nodo: "Nodo 1", tipo: "Automático", litros: 14.5, temperatura: 29.3, humedadSuelo: 33.8, humedadAmbiente: 55.4, lluvia: 0.0, observacion: "-" },
  { fecha: "2026-08-20", nodo: "Nodo 1", tipo: "Inteligente", litros: 10.0, temperatura: 28.7, humedadSuelo: 36.2, humedadAmbiente: 60.1, lluvia: 0.0, observacion: "-" },
  { fecha: "2026-08-24", nodo: "Nodo 1", tipo: "Automático", litros: 17.5, temperatura: 26.9, humedadSuelo: 31.7, humedadAmbiente: 57.6, lluvia: 0.0, observacion: "-" },
  { fecha: "2026-08-28", nodo: "Nodo 1", tipo: "Manual", litros: 19.0, temperatura: 25.4, humedadSuelo: 29.8, humedadAmbiente: 64.3, lluvia: 0.0, observacion: "Riego manual" },
  { fecha: "2026-09-02", nodo: "Nodo 1", tipo: "Automático", litros: 16.5, temperatura: 27.8, humedadSuelo: 34.6, humedadAmbiente: 59.2, lluvia: 0.5, observacion: "Lluvia ligera" },
];

function parseFecha(f) {
  return new Date(f + "T00:00:00");
}

function formatearFechaLarga(fechaStr) {
  const f = new Date(fechaStr);
  return f.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function MiniLineChart({ datos, campo, color }) {
  const width = 300, height = 140, padding = 10;
  if (datos.length === 0) return <p style={styles.sinDatos}>Sin datos</p>;
  const valores = datos.map((d) => d[campo]);
  const max = Math.max(...valores, 1);
  const min = Math.min(...valores, 0);
  const rango = max - min || 1;
  const stepX = (width - padding * 2) / Math.max(datos.length - 1, 1);

  const puntos = valores.map((v, i) => {
    const x = padding + i * stepX;
    const y = height - padding - ((v - min) / rango) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="160">
      <polyline points={puntos} fill="none" stroke={color} strokeWidth="3" />
    </svg>
  );
}

function MiniBarChart({ datos, campo, color }) {
  const width = 300, height = 140, padding = 10;
  if (datos.length === 0) return <p style={styles.sinDatos}>Sin datos</p>;
  const valores = datos.map((d) => d[campo]);
  const max = Math.max(...valores, 1);
  const barWidth = (width - padding * 2) / datos.length - 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="160">
      {valores.map((v, i) => {
        const barHeight = (v / max) * (height - padding * 2);
        const x = padding + i * ((width - padding * 2) / datos.length);
        const y = height - padding - barHeight;
        return <rect key={i} x={x} y={y} width={barWidth} height={barHeight} fill={color} />;
      })}
    </svg>
  );
}

export default function Bitacoras() {
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false); // NUEVO: Estado para el menú de usuario
  const navigate = useNavigate();
  const location = useLocation();

  const hoy = new Date().toISOString().slice(0, 10);
  const [desde, setDesde] = useState("2026-08-01");
  const [hasta, setHasta] = useState(hoy);

  const registrosFiltrados = useMemo(() => {
    const fDesde = parseFecha(desde);
    const fHasta = parseFecha(hasta);
    return REGISTROS_EJEMPLO.filter((r) => {
      const f = parseFecha(r.fecha);
      return f >= fDesde && f <= fHasta;
    }).sort((a, b) => parseFecha(a.fecha) - parseFecha(b.fecha));
  }, [desde, hasta]);

  const resumen = useMemo(() => {
    if (registrosFiltrados.length === 0) {
      return { litrosTotal: 0, dias: 0, tempProm: 0, humedadProm: 0, lluviaTotal: 0, lluviaDetectada: "No" };
    }
    const litrosTotal = registrosFiltrados.reduce((s, r) => s + r.litros, 0);
    const tempProm = registrosFiltrados.reduce((s, r) => s + r.temperatura, 0) / registrosFiltrados.length;
    const humedadProm = registrosFiltrados.reduce((s, r) => s + r.humedadSuelo, 0) / registrosFiltrados.length;
    const lluviaTotal = registrosFiltrados.reduce((s, r) => s + r.lluvia, 0);
    return {
      litrosTotal: litrosTotal.toFixed(1),
      dias: registrosFiltrados.length,
      tempProm: tempProm.toFixed(1),
      humedadProm: humedadProm.toFixed(1),
      lluviaTotal: lluviaTotal.toFixed(1),
      lluviaDetectada: lluviaTotal > 0 ? "Sí" : "No",
    };
  }, [registrosFiltrados]);

  const handleImprimir = () => window.print();

  // NUEVO: Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const fechaGeneracion = new Date().toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric",
  }) + " | " + new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) + " hrs";

  return (
    <div style={styles.app}>

      {/* Estilos de impresión: ocultan todo menos el reporte */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #bitacora-imprimible, #bitacora-imprimible * { visibility: visible; }
          #bitacora-imprimible { position: absolute; top: 0; left: 0; width: 100%; }
          .no-imprimir { display: none !important; }
        }
      `}</style>

      {/* SIDEBAR DESPLEGABLE - misma estructura que Dashboard.jsx */}
      <aside className="no-imprimir" style={{
        ...styles.sidebar,
        width: sidebarAbierta ? 250 : 0,
        minWidth: sidebarAbierta ? 250 : 0,
        padding: sidebarAbierta ? "0" : "0",
        borderRight: sidebarAbierta ? "1px solid #e0e0e0" : "none",
        opacity: sidebarAbierta ? 1 : 0,
        transition: "width 0.3s ease, min-width 0.3s ease, opacity 0.3s ease"
      }}>
        <div style={{ visibility: sidebarAbierta ? "visible" : "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={styles.sidebarHeader}>
            <span style={{ fontSize: 24, cursor: "pointer", color: "#333", marginRight: 15 }} onClick={() => setSidebarAbierta(false)}>←</span>
            <h2 style={{ margin: 0, fontSize: 20 }}>Menú</h2>
          </div>

          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>PRINCIPAL</div>
            <Link to="/dashboard" style={location.pathname === "/dashboard" ? styles.sidebarLinkActive : styles.sidebarLink}>Vista general</Link>
            <Link to="/bitacoras" style={location.pathname === "/bitacoras" ? styles.sidebarLinkActive : styles.sidebarLink}>Bitácoras</Link>
          </div>

          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>NODOS</div>
            <Link to="/nodo1" style={location.pathname === "/nodo1" ? styles.sidebarLinkActive : styles.sidebarLink}>Nodo 1</Link>
            <Link to="/nodo2" style={location.pathname === "/nodo2" ? styles.sidebarLinkActive : styles.sidebarLink}>Nodo 2</Link>
            <Link to="/nodo3" style={location.pathname === "/nodo3" ? styles.sidebarLinkActive : styles.sidebarLink}>Nodo 3</Link>
            <Link to="/nodo4" style={location.pathname === "/nodo4" ? styles.sidebarLinkActive : styles.sidebarLink}>Nodo 4</Link>
          </div>

          <div style={styles.sidebarFooter}>
            <Link to="/config-general" style={styles.sidebarLinkConfig}>
              <span>⚙️️</span> Configuración
            </Link>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div style={styles.mainContent}>
        <header className="no-imprimir" style={styles.banner}>
          <Link to="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img 
              src={logoAgroIA} 
              alt="Agro IA - Riego Inteligente" 
              style={{ height: 60, cursor: "pointer" }} 
             />
          </Link>
          <div style={styles.bannerRight}>
            <div style={styles.tempBadge}>{DATOS_GENERALES.clima.temperatura} °C</div>
            <div style={styles.iconCircle}>🔔</div>
            
            {/* ICONO DE USUARIO CON MENÚ DESPLEGABLE */}
            <div 
              style={{ ...styles.iconCircle, cursor: "pointer" }}
              onClick={() => setMenuAbierto(!menuAbierto)}
            >
              👤
            </div>

            {/* MENÚ DESPLEGABLE DE USUARIO */}
            {menuAbierto && (
              <div style={styles.userMenu}>
                <div style={styles.userMenuHeader}>
                  <div style={styles.userMenuAvatar}>👤</div>
                  <div style={styles.userMenuInfo}>
                    <div style={styles.userMenuName}>JOSE BUZANI</div>
                    <div style={styles.userMenuEmail}>Josebuzani06@gmail.com</div>
                  </div>
                </div>

                <div style={styles.userMenuOptions}>
                  <div style={styles.userMenuOption} onClick={() => { navigate("/config-admin"); setMenuAbierto(false); }}>
                    <span style={styles.userMenuBullet}>•</span> Gestión de usuarios
                  </div>
                  <div style={styles.userMenuOption} onClick={() => { setMenuAbierto(false); }}>
                    <span style={styles.userMenuBullet}>•</span> Cambiar cuenta
                  </div>
                  <div style={styles.userMenuOption} onClick={() => { navigate("/config-cuenta"); setMenuAbierto(false); }}>
                    <span style={styles.userMenuBullet}>•</span> Gestión de cuenta
                  </div>
                </div>

                <div style={styles.userMenuLogout} onClick={handleLogout}>
                  <span style={{ marginRight: 8 }}>🚪</span> Cerrar sesión
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="no-imprimir" style={styles.toolbar}>
          {!sidebarAbierta && (
            <span style={{ fontSize: 24, cursor: "pointer", marginRight: 10 }} onClick={() => setSidebarAbierta(true)}>☰</span>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Bitácoras</h2>
            <span style={{ fontSize: 12, color: "#888" }}>Historial de riego filtrable por fecha</span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
            <div style={styles.filtroCampo}>
              <span style={{ fontSize: 10, color: "#777" }}>Desde</span>
              <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} style={styles.dateInput} />
            </div>
            <div style={styles.filtroCampo}>
              <span style={{ fontSize: 10, color: "#777" }}>Hasta</span>
              <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} style={styles.dateInput} />
            </div>
            <button onClick={handleImprimir} style={styles.printBtn}>🖨️ Imprimir</button>
            <button onClick={() => navigate("/dashboard")} style={styles.logoutBtn}>Volver</button>
          </div>
        </div>

        <main style={styles.main}>
          {/* ---------- REPORTE IMPRIMIBLE ---------- */}
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
                <div style={styles.reporteReporteTitulo}>Reporte de Bitácora</div>
                <div style={styles.reporteFechaGen}>Generado el: {fechaGeneracion}</div>
              </div>
            </div>

            <h3 style={styles.reporteSeccion}>Información de la Parcela</h3>
            <div style={styles.infoGrid}>
              <div><div style={styles.infoLabel}>Parcela</div><div style={styles.infoValor}>{PARCELA.nombre}</div></div>
              <div><div style={styles.infoLabel}>Cultivo</div><div style={styles.infoValor}>{PARCELA.cultivo}</div></div>
              <div><div style={styles.infoLabel}>Ciclo</div><div style={styles.infoValor}>{PARCELA.ciclo}</div><div style={styles.infoSub}>{desde} – {hasta}</div></div>
              <div><div style={styles.infoLabel}>Ubicación</div><div style={styles.infoValor}>{PARCELA.ubicacion}</div></div>
              <div><div style={styles.infoLabel}>Coordenadas</div><div style={styles.infoValor}>{PARCELA.coordenadas}</div></div>
              <div><div style={styles.infoLabel}>Usuario</div><div style={styles.infoValor}>{PARCELA.usuario}</div></div>
            </div>

            <h3 style={styles.reporteSeccion}>Resumen del Periodo</h3>
            <div style={styles.gaugeGrid}>
              <div style={styles.resumenCard}>
                <div style={styles.resumenIcono}>💧</div>
                <div style={styles.resumenLabel}>Riego total aplicado</div>
                <div style={styles.resumenValue}>{resumen.litrosTotal} L</div>
              </div>
              <div style={styles.resumenCard}>
                <div style={styles.resumenIcono}>📅</div>
                <div style={styles.resumenLabel}>Registros en rango</div>
                <div style={styles.resumenValue}>{resumen.dias}</div>
              </div>
              <div style={styles.resumenCard}>
                <div style={styles.resumenIcono}>🌡️</div>
                <div style={styles.resumenLabel}>Temperatura prom.</div>
                <div style={styles.resumenValue}>{resumen.tempProm} °C</div>
              </div>
              <div style={styles.resumenCard}>
                <div style={styles.resumenIcono}>💦</div>
                <div style={styles.resumenLabel}>Humedad suelo prom.</div>
                <div style={styles.resumenValue}>{resumen.humedadProm} %</div>
              </div>
              <div style={styles.resumenCard}>
                <div style={styles.resumenIcono}>🌧️</div>
                <div style={styles.resumenLabel}>Lluvia detectada</div>
                <div style={styles.resumenValue}>{resumen.lluviaDetectada}</div>
                <div style={styles.infoSub}>({resumen.lluviaTotal} mm)</div>
              </div>
            </div>

            <h3 style={styles.reporteSeccion}>Datos por Registro</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Fecha</th>
                    <th style={styles.th}>Parcela</th>
                    <th style={styles.th}>Nodo</th>
                    <th style={styles.th}>Tipo de riego</th>
                    <th style={styles.th}>Litros</th>
                    <th style={styles.th}>Temp. (°C)</th>
                    <th style={styles.th}>Hum. suelo (%)</th>
                    <th style={styles.th}>Hum. amb. (%)</th>
                    <th style={styles.th}>Lluvia (mm)</th>
                    <th style={styles.th}>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.length === 0 && (
                    <tr><td style={styles.td} colSpan={10}>No hay registros en ese rango de fechas.</td></tr>
                  )}
                  {registrosFiltrados.map((r, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{formatearFechaLarga(r.fecha)}</td>
                      <td style={styles.td}>{PARCELA.nombre}</td>
                      <td style={styles.td}>{r.nodo}</td>
                      <td style={styles.td}>{r.tipo}</td>
                      <td style={styles.td}>{r.litros.toFixed(1)}</td>
                      <td style={styles.td}>{r.temperatura.toFixed(1)}</td>
                      <td style={styles.td}>{r.humedadSuelo.toFixed(1)}</td>
                      <td style={styles.td}>{r.humedadAmbiente.toFixed(1)}</td>
                      <td style={styles.td}>{r.lluvia.toFixed(1)}</td>
                      <td style={styles.td}>{r.observacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={styles.reporteSeccion}>Gráficas del Periodo</h3>
            <div style={styles.bottomSection}>
              <div style={styles.chartCard}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Temperatura (°C)</h4>
                <MiniLineChart datos={registrosFiltrados} campo="temperatura" color="#e05252" />
              </div>
              <div style={styles.chartCard}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Humedad de suelo (%)</h4>
                <MiniLineChart datos={registrosFiltrados} campo="humedadSuelo" color="#2f7bd6" />
              </div>
              <div style={styles.chartCard}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>Lluvia (mm)</h4>
                <MiniBarChart datos={registrosFiltrados} campo="lluvia" color="#3fb6b6" />
              </div>
            </div>

            <div style={styles.reporteFooter}>
              <span>Reporte generado por Agro IA</span>
            </div>
          </div>
          {/* ---------- FIN REPORTE IMPRIMIBLE ---------- */}
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
  sidebarLinkActive: { display: "block", padding: "12px 20px", textDecoration: "none", fontSize: "15px", fontWeight: "600", backgroundColor: "#e6f4cd", color: "#5a7d3c", borderLeft: "4px solid #7A9D54" },
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