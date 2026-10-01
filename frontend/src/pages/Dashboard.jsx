import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
// import api from "../services/api";

const DATOS_EJEMPLO = {
  clima: { temperatura: 36 },
  nodos: [
    { id: 1, nombre: "Nodo 1", encendido: true, humedad: 94.45, temperatura: 5, bateria: 81, estado: "RP" },
    { id: 2, nombre: "Nodo 2", encendido: true, humedad: 67.2, temperatura: 17.8, bateria: 83, estado: "RP" },
    { id: 3, nombre: "Nodo 3", encendido: true, humedad: 71.3, temperatura: 17.2, bateria: 81, estado: "RP" },
    { id: 4, nombre: "Nodo 4", encendido: true, humedad: 64.3, temperatura: 14.1, bateria: 91, estado: "RP" },
  ],
  ambiente: { humedad: 65, temperatura: 18 },
  suelo: { humedadPromedio: 94.45, temperaturaPromedio: 5 },
  riego: { tipo: "Manual", dds: 0, lluviaActual: 0, lluviaAcumulada: 52 },
  historial: {
    rojo: [40, 70, 20, 55, 15, 65],
    azul: [20, 35, 55, 25, 60, 45],
    verde: [30, 45, 70, 35, 55, 15],
  },
};

function Gauge({ label, value, max = 100, unit = "%", color = "#3fb6b6" }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={styles.gaugeCard}>
      <div style={styles.gaugeLabel}>{label}</div>
      <div style={styles.gaugeWrap}>
        <div
          style={{
            ...styles.gaugeRing,
            background: `conic-gradient(${color} ${pct}%, #e9e9e9 ${pct}% 100%)`,
          }}
        />
        <div style={styles.gaugeInner}>
          {value}
          <span style={{ fontSize: 10 }}>{unit}</span>
        </div>
      </div>
      <div style={styles.gaugeScale}>
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function LineChart({ series }) {
  const colors = { rojo: "#e05252", azul: "#2f7bd6", verde: "#5aa859" };
  const width = 300;
  const height = 140;
  const padding = 10;

  const toPoints = (arr) => {
    const max = Math.max(...arr, 1);
    const stepX = (width - padding * 2) / (arr.length - 1);
    return arr
      .map((v, i) => {
        const x = padding + i * stepX;
        const y = height - padding - (v / max) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="160">
      {Object.entries(series).map(([key, arr]) => (
        <polyline
          key={key}
          points={toPoints(arr)}
          fill="none"
          stroke={colors[key] || "#2f7bd6"}
          strokeWidth="3"
        />
      ))}
    </svg>
  );
}

function NodoToggle({ nombre, encendido, onChange }) {
  return (
    <div style={styles.nodoToggle}>
      <span>{nombre}</span>
      <div
        onClick={onChange}
        style={{
          ...styles.switch,
          background: encendido ? "#2f7bd6" : "#ccc",
        }}
      >
        <div
          style={{
            ...styles.switchKnob,
            left: encendido ? 20 : 2,
          }}
        />
      </div>
    </div>
  );
}

export default function Dashboard({ usuario, onLogout }) {
  const [datos, setDatos] = useState(DATOS_EJEMPLO);
  const navigate = useNavigate();
  const location = useLocation(); // Esto nos ayuda a saber en qué ruta estamos

  const toggleNodo = (id) => {
    setDatos((prev) => ({
      ...prev,
      nodos: prev.nodos.map((n) =>
        n.id === id ? { ...n, encendido: !n.encendido } : n
      ),
    }));
  };

  // Función para darle color verde al link activo
  const getLinkStyle = (path) => {
    const isActive = location.pathname === path;
    return {
      ...styles.sidebarLink,
      backgroundColor: isActive ? "#e6f4cd" : "transparent",
      color: isActive ? "#5a7d3c" : "#444",
      borderLeft: isActive ? "4px solid #7A9D54" : "4px solid transparent",
    };
  };

  return (
    <div style={styles.app}>
      
      {/* --- BARRA LATERAL MODERNA --- */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Menú</h2>
        </div>
        
        <div style={styles.sidebarSection}>
          <div style={styles.sidebarSectionTitle}>PRINCIPAL</div>
          <Link to="/dashboard" style={getLinkStyle("/dashboard")}>Vista general</Link>
        </div>

        <div style={styles.sidebarSection}>
          <div style={styles.sidebarSectionTitle}>NODOS</div>
          <Link to="/nodo1" style={getLinkStyle("/nodo1")}>Nodo 1</Link>
          <Link to="/nodo2" style={getLinkStyle("/nodo2")}>Nodo 2</Link>
          <Link to="/nodo3" style={getLinkStyle("/nodo3")}>Nodo 3</Link>
          <Link to="/nodo4" style={getLinkStyle("/nodo4")}>Nodo 4</Link>
        </div>
        
        <div style={styles.sidebarFooter}>
          <Link to="/config-general" style={styles.sidebarLinkConfig}>
            <span>⚙️</span> Configuración
          </Link>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
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
            <div style={styles.tempBadge}>{datos.clima.temperatura} °C</div>
            <div style={styles.iconCircle}>🔔</div>
            <div style={styles.iconCircle}>👤</div>
          </div>
        </header>

        <div style={styles.toolbar}>
          <div style={styles.mapIconBorder}>
            <span style={{ fontSize: 24 }}>🗺️</span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column" }}>
             <h2 style={{ margin: 0, fontSize: 16 }}>Sonora Riego</h2>
             <div style={styles.dots}>
               {[1, 2, 3, 4].map((d) => (
                 <span key={d} style={styles.dot} />
               ))}
             </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 15 }}>
            <div style={styles.selectGroupContainer}>
              <span style={{ fontSize: 10, color: "#777", marginBottom: 2 }}>Tipo de Riego</span>
              <select style={styles.select} defaultValue={datos.riego.tipo}>
                <option>Manual</option>
                <option>Automático</option>
              </select>
            </div>
            
            {datos.nodos.map((n) => (
              <NodoToggle key={n.id} nombre={n.nombre} encendido={n.encendido} onChange={() => toggleNodo(n.id)} />
            ))}
            
            <button onClick={onLogout} style={styles.logoutBtn}>Salir</button>
          </div>
        </div>

        <main style={styles.main}>
          <h2 style={styles.sectionTitle}>Vista general</h2>

          <div style={styles.gaugeGrid}>
            {datos.nodos.map((n) => (
              <Gauge key={n.id} label={`${n.nombre} Humedad`} value={n.humedad} color="#8a5cd6" />
            ))}
            <Gauge label="Humedad Ambiente" value={datos.ambiente.humedad} color="#3fb6b6" />
            <Gauge label="Temp Ambiente" value={datos.ambiente.temperatura} unit="°C" color="#bbbbbb" />
          </div>

          <div style={styles.gaugeGrid}>
            {datos.nodos.map((n) => (
              <Gauge key={n.id} label={`${n.nombre} Temperatura`} value={n.temperatura} unit="°C" color="#a3c93f" />
            ))}
            <Gauge label="Humedad Suelo Prom." value={datos.suelo.humedadPromedio} color="#d63b3b" />
            <Gauge label="Temp Suelo Prom." value={datos.suelo.temperaturaPromedio} unit="°C" color="#bbbbbb" />
          </div>

          <div style={styles.gaugeGrid}>
            {datos.nodos.map((n) => (
              <Gauge key={n.id} label={`${n.nombre} Batería`} value={n.bateria} color="#2f7bd6" />
            ))}
          </div>

          <div style={styles.bottomSection}>
            <div style={styles.chartCard}>
              <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Humedad del suelo</h3>
              <LineChart series={datos.historial} />
            </div>

            <div style={styles.statsCol}>
              <div style={{ ...styles.statBox, border: "2px solid #2f7bd6" }}>
                <div style={styles.statLabel}>DDS</div>
                <div style={styles.statValue}>{datos.riego.dds}</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Lluvia actual</div>
                <div style={styles.statValue}>{datos.riego.lluviaActual} mm</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Lluvia acumulada</div>
                <div style={styles.statValue}>{datos.riego.lluviaAcumulada} mm</div>
              </div>
            </div>

            <div style={styles.statsCol}>
              {datos.nodos.map((n) => (
                <div key={n.id} style={styles.nodeStatus}>
                  <span>{n.nombre.toUpperCase()}</span>
                  <span style={styles.rp}>{n.estado}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  app: { display: "flex", maxWidth: 1250, minHeight: "100vh", margin: "0 auto", background: "#fdfdfd", fontFamily: "sans-serif" },
  
  // --- ESTILOS DE LA BARRA LATERAL ---
  sidebar: { 
    width: "250px", 
    backgroundColor: "#f4f6f8", 
    borderRight: "1px solid #e0e0e0", 
    display: "flex", 
    flexDirection: "column", 
    padding: "20px 0",
    minHeight: "100vh", 
  },
  sidebarHeader: { 
    padding: "0 20px 20px", 
    borderBottom: "1px solid #e0e0e0", 
    marginBottom: "20px",
    color: "#333"
  },
  sidebarSection: { 
    marginBottom: "25px",
    display: "flex",
    flexDirection: "column"
  },
  sidebarSectionTitle: { 
    padding: "0 20px", 
    fontSize: "12px", 
    fontWeight: "bold", 
    color: "#888", 
    letterSpacing: "1px", 
    marginBottom: "10px" 
  },
  sidebarLink: { 
    display: "block", 
    padding: "12px 20px", 
    color: "#444", 
    textDecoration: "none", 
    fontSize: "15px", 
    fontWeight: "600",
    transition: "background 0.2s, color 0.2s" 
  },
  sidebarFooter: {
    marginTop: "auto", 
    padding: "20px 0",
    borderTop: "1px solid #e0e0e0"
  },
  sidebarLinkConfig: {
    display: "flex", 
    alignItems: "center",
    gap: "10px",
    padding: "12px 20px", 
    color: "#444", 
    textDecoration: "none", 
    fontSize: "15px", 
    fontWeight: "600",
  },
  
  // --- RESTO DE LOS ESTILOS ---
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
  dot: { width: 10, height: 10, borderRadius: "50%", background: "#ddd", display: "inline-block" },
  
  selectGroupContainer: { border: "1px solid #ccc", borderRadius: 8, padding: "4px 8px", display: "flex", flexDirection: "column", background: "#fff" },
  select: { border: "none", outline: "none", background: "transparent", fontSize: 12 },
  
  nodoToggle: { display: "flex", flexDirection: "column", alignItems: "center", fontSize: 12, gap: 4 },
  switch: { width: 38, height: 20, borderRadius: 20, position: "relative", cursor: "pointer", transition: "background 0.2s" },
  switchKnob: { content: "", position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" },
  logoutBtn: { padding: "6px 12px", cursor: "pointer", border: "1px solid #ccc", borderRadius: 6, background: "#f9f9f9" },
  
  main: { padding: "20px 24px 24px", background: "#f8f9fa", flex: 1 },
  sectionTitle: { margin: "0 0 20px", fontSize: 26, fontWeight: "bold" },
  
  gaugeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginBottom: 18 },
  gaugeCard: { border: "2px solid #eaeaea", borderRadius: 16, padding: "15px 10px", textAlign: "center", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" },
  gaugeLabel: { fontSize: 13, color: "#333", marginBottom: 10 },
  gaugeWrap: { position: "relative", width: 110, height: 110, margin: "0 auto" },
  gaugeRing: { width: "100%", height: "100%", borderRadius: "50%" },
  gaugeInner: { position: "absolute", top: 12, left: 12, right: 12, bottom: 12, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, color: "#444" },
  gaugeScale: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999", padding: "8px 10px 0" },
  
  bottomSection: { display: "flex", gap: 20, flexWrap: "wrap" },
  chartCard: { flex: 2, border: "2px solid #eaeaea", borderRadius: 12, padding: 14, background: "#fff" },
  
  statsCol: { flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 10 },
  statBox: { background: "#f3f6fb", borderRadius: 10, padding: 12, textAlign: "center" },
  statLabel: { fontSize: 11, color: "#7A9D54", fontWeight: "bold", marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 800, color: "#000" },
  
  nodeStatus: { background: "#f3f6fb", borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 },
  rp: { color: "#2f7bd6", fontWeight: 700 },
};