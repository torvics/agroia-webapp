import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation(); // Para saber en qué ruta estamos

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
  );
}

const styles = {
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
  }
};