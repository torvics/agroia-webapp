import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";

const DATOS_NODO_1 = {
  id: 1,
  nombre: "Nodo 1",
  encendido: true,
  humedad: 94.45,
  temperatura: 5,
  bateria: 81,
  estado: "RP"
};

const DATOS_GENERALES = {
  clima: { temperatura: 36 },
  riego: { tipo: "Manual", dds: 0, lluviaActual: 0, lluviaAcumulada: 52 },
  historialHumedad: [20, 30, 40, 50] 
};

function Gauge({ label, value, max = 100, unit = "%", color = "#3fb6b6" }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={styles.gaugeCard}>
      <div style={styles.gaugeLabel}>{label}</div>
      <div style={styles.gaugeWrap}>
        <div style={{ ...styles.gaugeRing, background: `conic-gradient(${color} ${pct}%, #f0f0f0 ${pct}% 100%)` }} />
        <div style={styles.gaugeInner}>{value}<span style={{ fontSize: 14 }}>{unit}</span></div>
      </div>
      <div style={styles.gaugeScale}><span>0</span><span>{max}</span></div>
    </div>
  );
}

function LineChart({ data }) {
  const width = 400, height = 140, padding = 20, labels = ["A", "B", "C", "D"]; 
  const max = Math.max(...data, 100);
  const stepX = (width - padding * 2) / (data.length - 1);
  const points = data.map((v, i) => `${padding + i * stepX},${height - padding - (v / max) * (height - padding * 2)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} width="100%" height="100%">
      {[0, 1, 2, 3, 4, 5, 6].map((line) => {
        const y = height - padding - (line / 6) * (height - padding * 2);
        return (
          <g key={line}>
            <text x="5" y={y + 4} fontSize="10" fill="#666">{line}</text>
            <line x1="20" y1={y} x2={width - 10} y2={y} stroke="#e0e0e0" strokeWidth="1" />
          </g>
        );
      })}
      <polyline points={points} fill="none" stroke="#2f7bd6" strokeWidth="3" />
      {labels.map((label, i) => <text key={label} x={padding + i * stepX} y={height + 10} fontSize="12" fill="#666" textAnchor="middle">{label}</text>)}
    </svg>
  );
}

function NodoToggle({ nombre, encendido, onChange }) {
  return (
    <div style={styles.nodoToggleGrande}>
      <span style={{ fontWeight: "bold" }}>{nombre}</span>
      <div onClick={onChange} style={{ ...styles.switch, background: encendido ? "#2f7bd6" : "#ccc" }}>
        <div style={{ ...styles.switchKnob, left: encendido ? 26 : 2 }} />
      </div>
    </div>
  );
}

export default function Nodo1() {
  const [nodo, setNodo] = useState(DATOS_NODO_1);
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const toggleEncendido = () => setNodo((prev) => ({ ...prev, encendido: !prev.encendido }));
  
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div style={styles.app}>
      
      {/* SIDEBAR DESPLEGABLE CON NUEVO DISEÑO */}
      <aside style={{
        ...styles.sidebar,
        width: sidebarAbierta ? 250 : 0,
        padding: sidebarAbierta ? "0" : "0",
        borderRight: sidebarAbierta ? "1px solid #e0e0e0" : "none",
        opacity: sidebarAbierta ? 1 : 0,
      }}>
        <div style={{ visibility: sidebarAbierta ? "visible" : "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={styles.sidebarHeader}>
            <span style={{ fontSize: 24, cursor: "pointer", color: "#333", marginRight: 15 }} onClick={() => setSidebarAbierta(false)}>←</span>
            <h2 style={{ margin: 0, fontSize: 20 }}>Menú</h2>
          </div>
          
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>PRINCIPAL</div>
            <Link to="/dashboard" style={location.pathname === "/dashboard" ? styles.sidebarLinkActive : styles.sidebarLink}>Vista general</Link>
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
              <span>⚙️</span> Configuración
            </Link>
          </div>
        </div>
      </aside>

      <div style={styles.mainContent}>
        <header style={styles.banner}>
          <div style={styles.brand}>
            <span style={{ fontSize: 28 }}>🌱</span>
            <div>
              <h1 style={styles.brandTitle}>Agro IA</h1>
              <small style={styles.brandSubtitle}>RIEGO INTELIGENTE</small>
            </div>
          </div>
          <div style={styles.bannerRight}>
            <div style={styles.tempBadge}>{DATOS_GENERALES.clima.temperatura} °C</div>
            <div style={styles.iconCircle}>🔔</div>
            <div 
              style={{ ...styles.iconCircle, cursor: "pointer" }}
              onClick={() => navigate("/config-cuenta")}
            >
              👤
            </div>
          </div>
        </header>

        <div style={styles.toolbar}>
          {!sidebarAbierta && (
            <span style={{ fontSize: 24, cursor: "pointer", marginRight: 10 }} onClick={() => setSidebarAbierta(true)}>☰</span>
          )}
          
          <div style={styles.mapIconBorder}>
            <span style={{ fontSize: 24 }}>🗺️</span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column" }}>
             <h2 style={{ margin: 0, fontSize: 16 }}>Sonora Riego</h2>
             <div style={styles.dots}>
               <span style={{...styles.dot, background: "#ccc"}} />
               <span style={{...styles.dot, background: "#ccc"}} />
               <span style={{...styles.dot, background: "#ccc"}} />
               <span style={{...styles.dot, background: "#ccc"}} />
             </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 15 }}>
            <div style={styles.selectGroupContainer}>
              <span style={{ fontSize: 10, color: "#777", marginBottom: 2 }}>Tipo de Riego</span>
              <select style={styles.select} defaultValue={DATOS_GENERALES.riego.tipo}>
                <option>Manual</option>
                <option>Automático</option>
              </select>
            </div>
            
            <NodoToggle nombre="Nodo 1" encendido={nodo.encendido} onChange={toggleEncendido} />
            <button onClick={handleLogout} style={styles.logoutBtn}>Salir</button>
          </div>
        </div>

        <main style={styles.main}>
          <h2 style={styles.sectionTitle}>Nodo 1</h2>

          <div style={styles.gaugeGridNodo}>
            <Gauge label="Nodo 1 Humedad" value={nodo.humedad} color="#e6f4cd" />
            <Gauge label="Nodo 1 Temperatura" value={nodo.temperatura} unit="°C" color="#e0e0e0" />
            <Gauge label="Nodo 1 Batería" value={nodo.bateria} color="#2b3b75" />
          </div>

          <div style={styles.bottomSectionNodo}>
            <div style={styles.chartCard}>
              <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Humedad del suelo</h3>
              <div style={{ height: 180 }}>
                <LineChart data={DATOS_GENERALES.historialHumedad} />
              </div>
            </div>

            <div style={styles.statsColNodo}>
              <div style={styles.statBoxLigero}>
                <div style={styles.statLabel}>DDS</div>
                <div style={styles.statValue}>{DATOS_GENERALES.riego.dds}</div>
              </div>
              <div style={styles.statBoxLigero}>
                <div style={styles.statLabel}>Lluvia actual</div>
                <div style={styles.statValue}>{DATOS_GENERALES.riego.lluviaActual} mm</div>
              </div>
              <div style={styles.statBoxLigero}>
                <div style={styles.statLabel}>Lluvia acomulada</div>
                <div style={styles.statValue}>{DATOS_GENERALES.riego.lluviaAcumulada} mm</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  app: { display: "flex", maxWidth: 1150, minHeight: 800, margin: "20px auto", background: "#fdfdfd", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.15)", fontFamily: "sans-serif" },
  
  // Sidebar Estilos unificados
  sidebar: { backgroundColor: "#f4f6f8", display: "flex", flexDirection: "column", boxSizing: "border-box", transition: "all 0.3s ease", overflow: "hidden", whiteSpace: "nowrap", zIndex: 10 },
  sidebarHeader: { display: "flex", alignItems: "center", padding: "20px 20px", borderBottom: "1px solid #e0e0e0", marginBottom: "20px", color: "#333" },
  sidebarSection: { marginBottom: "25px", display: "flex", flexDirection: "column" },
  sidebarSectionTitle: { padding: "0 20px", fontSize: "12px", fontWeight: "bold", color: "#888", letterSpacing: "1px", marginBottom: "10px" },
  sidebarLink: { display: "block", padding: "12px 20px", color: "#444", textDecoration: "none", fontSize: "15px", fontWeight: "600", transition: "background 0.2s, color 0.2s" },
  sidebarLinkActive: { display: "block", padding: "12px 20px", textDecoration: "none", fontSize: "15px", fontWeight: "600", backgroundColor: "#e6f4cd", color: "#5a7d3c", borderLeft: "4px solid #7A9D54" },
  sidebarFooter: { marginTop: "auto", padding: "20px 0", borderTop: "1px solid #e0e0e0" },
  sidebarLinkConfig: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 20px", color: "#444", textDecoration: "none", fontSize: "15px", fontWeight: "600" },

  mainContent: { flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" },
  banner: { background: "#7A9D54", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px" },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandTitle: { margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 900, textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  brandSubtitle: { display: "block", fontSize: 10, letterSpacing: 1, opacity: 0.9 },
  bannerRight: { display: "flex", alignItems: "center", gap: 14 },
  tempBadge: { background: "rgba(0,0,0,0.3)", padding: "6px 14px", borderRadius: 20, fontWeight: 600 },
  iconCircle: { width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  
  toolbar: { display: "flex", alignItems: "center", gap: 15, padding: "14px 24px", background: "#fff", borderBottom: "1px solid #eee" },
  mapIconBorder: { border: "2px solid #ccc", borderRadius: 12, padding: "4px 8px" },
  dots: { display: "flex", gap: 6, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
  selectGroupContainer: { border: "1px solid #ccc", borderRadius: 8, padding: "4px 8px", display: "flex", flexDirection: "column", background: "#fff" },
  select: { border: "none", outline: "none", background: "transparent", fontSize: 12 },
  nodoToggleGrande: { border: "1px solid #ccc", borderRadius: 12, padding: "6px 12px", display: "flex", flexDirection: "column", alignItems: "center", fontSize: 14, gap: 6, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  switch: { width: 50, height: 26, borderRadius: 20, position: "relative", cursor: "pointer", transition: "background 0.2s" },
  switchKnob: { content: "", position: "absolute", top: 2, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s" },
  logoutBtn: { padding: "6px 12px", cursor: "pointer", border: "1px solid #ccc", borderRadius: 6, background: "#f9f9f9" },
  main: { padding: "20px 24px 24px", background: "#fdfdfd", flex: 1 },
  sectionTitle: { margin: "0 0 20px", fontSize: 26, fontWeight: "bold" },
  gaugeGridNodo: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 30 },
  gaugeCard: { border: "2px solid #eaeaea", borderRadius: 16, padding: "20px 10px", textAlign: "center", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" },
  gaugeLabel: { fontSize: 14, color: "#333", marginBottom: 15 },
  gaugeWrap: { position: "relative", width: 130, height: 130, margin: "0 auto" },
  gaugeRing: { width: "100%", height: "100%", borderRadius: "50%" },
  gaugeInner: { position: "absolute", top: 12, left: 12, right: 12, bottom: 12, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24, color: "#444" },
  gaugeScale: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#999", padding: "10px 15px 0" },
  bottomSectionNodo: { display: "flex", gap: 20 },
  chartCard: { flex: 2, border: "2px solid #eaeaea", borderRadius: 12, padding: 20, background: "#fff" },
  statsColNodo: { flex: 1, display: "flex", flexDirection: "column", gap: 15, justifyContent: "space-between" },
  statBoxLigero: { background: "#f3f5ef", borderRadius: 20, padding: "15px 10px", textAlign: "center" },
  statLabel: { fontSize: 12, color: "#8b9c7b", fontWeight: "bold", marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 800, color: "#000" },
};