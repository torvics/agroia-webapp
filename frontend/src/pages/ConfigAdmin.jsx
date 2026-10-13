
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import logoAgroIA from "../assets/agroia-logo.png";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");
const DATOS_GENERALES = { clima: { temperatura: 36 } };

export default function ConfigAdmin() {
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

  // ============================================
  // CERRAR SESIÓN Y REVOCAR JWT
  // ============================================
  const handleLogout = async () => {
    if (cerrandoSesion) return;

    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    if (!token) {
      limpiarSesion();
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

      limpiarSesion();
    } catch (err) {
      setError(
        "No fue posible cerrar sesión en el servidor. Verifica la conexión."
      );
      setCerrandoSesion(false);
    }
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
            {[1, 2, 3, 4].map((numero) => (
              <Link
                key={numero}
                to={`/nodo${numero}`}
                style={
                  location.pathname === `/nodo${numero}`
                    ? styles.sidebarLinkActive
                    : styles.sidebarLink
                }
              >
                Nodo {numero}
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
              {DATOS_GENERALES.clima.temperatura} °C
            </div>

            <div style={styles.iconCircle}>🔔</div>

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
                <p style={styles.cardSubtitle}>
                  Usuarios registrados en la base de datos de AgroIA
                </p>
              </div>

              <button
                type="button"
                style={styles.btnDeshabilitado}
                disabled
                title="Pendiente de implementar el endpoint para crear usuarios"
              >
                + Nuevo usuario
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Usuario</th>
                    <th style={styles.th}>Correo</th>
                    <th style={styles.th}>Rol</th>
                    <th style={styles.th}>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {cargandoUsuarios && (
                    <tr>
                      <td style={styles.td} colSpan={4}>
                        Cargando usuarios...
                      </td>
                    </tr>
                  )}

                  {!cargandoUsuarios &&
                    !error &&
                    usuarios.length === 0 && (
                      <tr>
                        <td style={styles.td} colSpan={4}>
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
                              color: user.activo
                                ? "#4f863b"
                                : "#d32f2f",
                              fontWeight: "bold",
                            }}
                          >
                            {user.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <p style={styles.nota}>
              La creación, modificación y eliminación de usuarios
              estará disponible cuando se integren los endpoints
              correspondientes del backend.
            </p>
          </div>

          {/* REPORTES */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Reportes de ciclos</h2>
            <p style={styles.cardSubtitle}>
              Consulta y descarga reportes de los ciclos de riego.
            </p>

            <div style={styles.reportesFlex}>
              <select style={styles.selectInput} disabled>
                <option>Seleccionar ciclo de riego</option>
              </select>

              <button
                type="button"
                style={styles.btnDeshabilitado}
                disabled
              >
                Descargar PDF
              </button>

              <button
                type="button"
                style={styles.btnDeshabilitado}
                disabled
              >
                Descargar CSV
              </button>
            </div>

            <p style={styles.nota}>
              Los reportes se conectarán aquí con el módulo
              de reportes del backend.
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
