import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";

const DATOS_GENERALES = { clima: { temperatura: 36 } };

export default function ConfigGeneral() {
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [nodoSeleccionado, setNodoSeleccionado] = useState("Nodo 1 - Invernadero A");
  const [tempLimite, setTempLimite] = useState("");
  const [renombrarActivo, setRenombrarActivo] = useState(false);
  const [intervalo, setIntervalo] = useState("5"); 

  const handleGuardar = () => alert("Configuración guardada exitosamente");
  const handleCancelar = () => navigate("/dashboard");

  return (
    <div style={styles.app}>
      
      <aside style={{ ...styles.sidebar, width: sidebarAbierta ? 250 : 0, padding: sidebarAbierta ? "0" : "0", borderRight: sidebarAbierta ? "1px solid #e0e0e0" : "none", opacity: sidebarAbierta ? 1 : 0 }}>
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
            <Link to="/config-general" style={location.pathname === "/config-general" ? styles.sidebarLinkActive : styles.sidebarLinkConfig}><span>⚙️</span> Configuración</Link>
          </div>
        </div>
      </aside>

      <div style={styles.mainContent}>
        <header style={styles.banner}>
          <div style={styles.brand}><span style={{ fontSize: 28 }}>🌱</span><div><h1 style={styles.brandTitle}>Agro IA</h1><small style={styles.brandSubtitle}>RIEGO INTELIGENTE</small></div></div>
          <div style={styles.bannerRight}>
            <div style={styles.tempBadge}>{DATOS_GENERALES.clima.temperatura} °C</div>
            <div style={styles.iconCircle}>🔔</div>
            <div style={{ ...styles.iconCircle, cursor: "pointer" }} onClick={() => navigate("/config-cuenta")}>👤</div>
          </div>
        </header>

        <div style={{ display: "flex", flex: 1 }}>
          <div style={styles.leftGreyBar}>
            {!sidebarAbierta && (<span style={{ fontSize: 28, cursor: "pointer", color: "#333" }} onClick={() => setSidebarAbierta(true)}>☰</span>)}
          </div>
          <main style={styles.main}>
            <h1 style={styles.pageTitle}>General</h1>
            <p style={styles.pageSubtitle}>Umbrales de alertas y administraciones de tus dispositivos</p>

            <div style={styles.configContainer}>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Ajuste de umbrales de alerta</h3>
                <p style={styles.sectionDesc}>Define a partir de qué valor un nodo dispara una notificación.</p>
                <div style={styles.row}>
                  <div><div style={styles.itemTitle}>Nodo a configurar</div><div style={styles.itemDesc}>Elige el nodo que quieres configurar</div></div>
                  <select style={styles.selectInput} value={nodoSeleccionado} onChange={(e) => setNodoSeleccionado(e.target.value)}><option>Nodo 1 - Invernadero A</option><option>Nodo 2</option><option>Nodo 3</option><option>Nodo 4</option></select>
                </div>
                <div style={styles.row}>
                  <div style={{ display: "flex", alignItems: "center", gap: 15 }}><div style={styles.iconBadge}>🔔</div><div><div style={styles.itemTitle}>Temperatura límite por nodo</div><div style={styles.itemDesc}>Alerta si se supera este valor</div></div></div>
                  <div style={styles.inputWrapper}><input type="text" placeholder="32 °C" style={styles.textInput} value={tempLimite} onChange={(e) => setTempLimite(e.target.value)} /></div>
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Gestión de dispositivos / hardware</h3>
                <p style={styles.sectionDesc}>Agrega o renombra los nodos conectados a tu sistema.</p>
                <div style={{ ...styles.row, justifyContent: "flex-start", gap: 15, cursor: "pointer" }}><div style={styles.iconBadgeLight}>➕</div><div style={styles.itemTitle}>Agregar nuevo nodo</div></div>
                <div style={styles.row}>
                  <div style={{ display: "flex", alignItems: "center", gap: 15 }}><div style={styles.iconBadgeLight}>📝</div><div style={styles.itemTitle}>Renombrar nodos</div></div>
                  <div onClick={() => setRenombrarActivo(!renombrarActivo)} style={{ ...styles.toggleBg, backgroundColor: renombrarActivo ? "#7A9D54" : "#e0e0e0" }}><div style={{ ...styles.toggleKnob, left: renombrarActivo ? 22 : 2 }} /></div>
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Frecuencia de muestreo</h3>
                <p style={styles.sectionDesc}>Ajustar cada cuánto tiempo los nodos envían lecturas.</p>
                <div style={styles.row}>
                  <div style={{ display: "flex", alignItems: "center", gap: 15 }}><div style={styles.iconBadgeLight}>🕒</div><div style={styles.itemTitle}>Intervalo de lectura</div></div>
                  <select style={styles.selectInputSmall} value={intervalo} onChange={(e) => setIntervalo(e.target.value)}>
                    <option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option>
                    <option value="25">25</option><option value="30">30</option><option value="35">35</option><option value="40">40</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={styles.actionButtons}>
              <button style={styles.cancelBtn} onClick={handleCancelar}>Cancelar</button>
              <button style={styles.saveBtn} onClick={handleGuardar}>Guardar cambios</button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { display: "flex", maxWidth: 1150, minHeight: 800, margin: "20px auto", background: "#fcfafc", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.15)", fontFamily: "sans-serif" },
  sidebar: { backgroundColor: "#f4f6f8", display: "flex", flexDirection: "column", boxSizing: "border-box", transition: "all 0.3s ease", overflow: "hidden", whiteSpace: "nowrap", zIndex: 10 },
  sidebarHeader: { display: "flex", alignItems: "center", padding: "20px 20px", borderBottom: "1px solid #e0e0e0", marginBottom: "20px", color: "#333" },
  sidebarSection: { marginBottom: "25px", display: "flex", flexDirection: "column" },
  sidebarSectionTitle: { padding: "0 20px", fontSize: "12px", fontWeight: "bold", color: "#888", letterSpacing: "1px", marginBottom: "10px" },
  sidebarLink: { display: "block", padding: "12px 20px", color: "#444", textDecoration: "none", fontSize: "15px", fontWeight: "600", transition: "background 0.2s, color 0.2s" },
  sidebarLinkActive: { display: "block", padding: "12px 20px", textDecoration: "none", fontSize: "15px", fontWeight: "600", backgroundColor: "#e6f4cd", color: "#5a7d3c", borderLeft: "4px solid #7A9D54" },
  sidebarFooter: { marginTop: "auto", padding: "20px 0", borderTop: "1px solid #e0e0e0" },
  sidebarLinkConfig: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 20px", color: "#444", textDecoration: "none", fontSize: "15px", fontWeight: "600" },
  mainContent: { flex: 1, display: "flex", flexDirection: "column" },
  banner: { background: "#7A9D54", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px" },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandTitle: { margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 900, textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  brandSubtitle: { display: "block", fontSize: 10, letterSpacing: 1, opacity: 0.9 },
  bannerRight: { display: "flex", alignItems: "center", gap: 14 },
  tempBadge: { background: "rgba(0,0,0,0.3)", padding: "6px 14px", borderRadius: 20, fontWeight: 600 },
  iconCircle: { width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  leftGreyBar: { width: 60, backgroundColor: "#e4e4e4", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" },
  main: { flex: 1, padding: "30px 40px", overflowY: "auto" },
  pageTitle: { margin: "0 0 5px 0", fontSize: 24, fontWeight: "500", color: "#222" },
  pageSubtitle: { margin: "0 0 30px 0", fontSize: 14, color: "#888" },
  configContainer: { display: "flex", flexDirection: "column", gap: 30 },
  section: { display: "flex", flexDirection: "column", gap: 15 },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: "bold", color: "#222" },
  sectionDesc: { margin: "0 0 10px 0", fontSize: 13, color: "#888" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" },
  itemTitle: { fontSize: 15, fontWeight: "bold", color: "#222", marginBottom: 4 },
  itemDesc: { fontSize: 13, color: "#888" },
  iconBadge: { width: 36, height: 36, borderRadius: "50%", backgroundColor: "#ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  iconBadgeLight: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#e6f4cd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 },
  selectInput: { padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc", outline: "none", fontSize: 14, color: "#555", backgroundColor: "#fff", width: 220 },
  selectInputSmall: { padding: "6px 10px", borderRadius: 4, border: "1px solid #2f7bd6", outline: "none", fontSize: 14, color: "#2f7bd6", backgroundColor: "#fff" },
  inputWrapper: { position: "relative", display: "inline-block" },
  textInput: { padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc", outline: "none", fontSize: 14, width: 80, backgroundColor: "#f9f9f9", color: "#999", textAlign: "center", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" },
  toggleBg: { width: 44, height: 24, borderRadius: 20, position: "relative", cursor: "pointer", transition: "background 0.3s" },
  toggleKnob: { content: "", position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },
  actionButtons: { display: "flex", justifyContent: "flex-end", gap: 20, marginTop: 40, paddingTop: 20 },
  cancelBtn: { padding: "10px 20px", border: "none", background: "transparent", color: "#888", fontSize: 15, cursor: "pointer", fontWeight: "500" },
  saveBtn: { padding: "12px 24px", border: "none", borderRadius: 8, background: "#7A9D54", color: "#fff", fontSize: 15, cursor: "pointer", fontWeight: "bold", boxShadow: "0 2px 6px rgba(122, 157, 84, 0.4)" },
};