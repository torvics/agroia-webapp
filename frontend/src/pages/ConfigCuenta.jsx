import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";

const DATOS_GENERALES = { clima: { temperatura: 36 } };

export default function ConfigCuenta() {
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [alertaHumedad, setAlertaHumedad] = useState(true);
  const [alertaBateria, setAlertaBateria] = useState(true);

  const handleGuardar = () => alert("Preferencias de cuenta guardadas");
  const handleCancelar = () => navigate("/dashboard");

  const ListItem = ({ icono, titulo, subtitulo, rightElement }) => (
    <div style={styles.listItem}>
      <div style={styles.listLeft}><div style={styles.iconSquare}>{icono}</div><div style={styles.listText}><div style={styles.listTitle}>{titulo}</div><div style={styles.listSubtitle}>{subtitulo}</div></div></div>
      <div>{rightElement}</div>
    </div>
  );

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
            <Link to="/config-general" style={styles.sidebarLinkConfig}><span>⚙️</span> Configuración</Link>
          </div>
        </div>
      </aside>

      <div style={styles.mainContent}>
        <header style={styles.banner}>
          <div style={styles.brand}><span style={{ fontSize: 28 }}>🌱</span><div><h1 style={styles.brandTitle}>Agro IA</h1><small style={styles.brandSubtitle}>RIEGO INTELIGENTE</small></div></div>
          <div style={styles.bannerRight}>
            <div style={styles.tempBadge}>{DATOS_GENERALES.clima.temperatura} °C</div>
            <div style={styles.iconCircle}>🔔</div>
            <div style={{ ...styles.iconCircle, cursor: "pointer", backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => navigate("/config-cuenta")}>👤</div>
          </div>
        </header>

        <div style={{ display: "flex", flex: 1 }}>
          <div style={styles.leftGreyBar}>
            {!sidebarAbierta && (<span style={{ fontSize: 28, cursor: "pointer", color: "#333" }} onClick={() => setSidebarAbierta(true)}>☰</span>)}
          </div>
          <main style={styles.main}>
            <h1 style={styles.pageTitle}>Cuenta</h1>

            <div style={styles.cardsContainer}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>PERFIL</h3>
                <div style={styles.cardContent}>
                  <ListItem icono="👤" titulo="Nombre" subtitulo="Mariana Sandoval" rightElement={<span style={styles.editIcon}>📝</span>} />
                  <ListItem icono="✉️" titulo="Correo" subtitulo="mariana@agroia.mx" rightElement={<span style={styles.editIcon}>📝</span>} />
                  <ListItem icono="🔒" titulo="Contraseña" subtitulo="Última actualización hace 3 meses" rightElement={<span style={styles.editIcon}>📝</span>} />
                </div>
              </div>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>PREFERENCIAS RÁPIDAS</h3>
                <div style={styles.cardContent}>
                  <ListItem icono="🔔" titulo="Alertas de humedad baja" subtitulo="" rightElement={<div onClick={() => setAlertaHumedad(!alertaHumedad)} style={{...styles.toggleBgBlue, backgroundColor: alertaHumedad ? "#4b9af8" : "#ccc" }}><div style={{...styles.toggleKnob, left: alertaHumedad ? 22 : 2}} /></div>} />
                  <ListItem icono="🔔" titulo="Batería baja del nodo" subtitulo="" rightElement={<div onClick={() => setAlertaBateria(!alertaBateria)} style={{...styles.toggleBgBlue, backgroundColor: alertaBateria ? "#4b9af8" : "#ccc" }}><div style={{...styles.toggleKnob, left: alertaBateria ? 22 : 2}} /></div>} />
                  <ListItem icono="🌐" titulo="Idioma" subtitulo="" rightElement={<div style={styles.badge}>Español</div>} />
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
  pageTitle: { margin: "0 0 30px 0", fontSize: 26, fontWeight: "bold", color: "#111" },
  cardsContainer: { display: "flex", gap: "25px", flexWrap: "wrap" },
  card: { flex: 1, minWidth: "300px", backgroundColor: "#eef2e6", borderRadius: "16px", padding: "25px", boxSizing: "border-box" },
  cardTitle: { margin: "0 0 20px 0", fontSize: 14, color: "#8b9485", fontWeight: "bold", letterSpacing: "1px" },
  cardContent: { display: "flex", flexDirection: "column", gap: "20px" },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  listLeft: { display: "flex", alignItems: "center", gap: "15px" },
  iconSquare: { width: 38, height: 38, borderRadius: "10px", backgroundColor: "#8aab73", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: "2px solid #779a5f" },
  listText: { display: "flex", flexDirection: "column" },
  listTitle: { fontSize: 15, fontWeight: "bold", color: "#222" },
  listSubtitle: { fontSize: 12, color: "#777", marginTop: "2px" },
  editIcon: { fontSize: 20, cursor: "pointer", color: "#333", opacity: 0.8 },
  toggleBgBlue: { width: 46, height: 26, borderRadius: 20, position: "relative", cursor: "pointer", transition: "background 0.3s" },
  toggleKnob: { content: "", position: "absolute", top: 2, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" },
  badge: { backgroundColor: "#a8c090", color: "#4a6336", padding: "6px 14px", borderRadius: "8px", fontSize: 14, fontWeight: "bold" },
  actionButtons: { display: "flex", justifyContent: "flex-end", gap: 20, marginTop: 50, paddingTop: 20 },
  cancelBtn: { padding: "10px 20px", border: "none", background: "transparent", color: "#888", fontSize: 15, cursor: "pointer", fontWeight: "bold" },
  saveBtn: { padding: "12px 24px", border: "none", borderRadius: "8px", background: "#2d5a27", color: "#fff", fontSize: 15, cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 6px rgba(45, 90, 39, 0.3)" },
};