import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import logoAgroIA from "../assets/agroia-logo.png"; 

const DATOS_GENERALES = { clima: { temperatura: 36 } };

const USUARIOS_INICIALES = [
  { id: 1, nombre: "Laura Méndez", correo: "laura@agroia.mx", password: "admin123", rol: "Admin", estado: "Activo" },
  { id: 2, nombre: "José Ramírez", correo: "jose@agroia.mx", password: "jose123", rol: "Agricultor", estado: "Activo" },
  { id: 3, nombre: "Carla Núñez", correo: "carla@agroia.mx", password: "carla123", rol: "Agricultor", estado: "Inactivo" },
];

export default function ConfigAdmin() {
  const navigate = useNavigate();
  const location = useLocation();

  // Estado para la sidebar
  const [sidebarAbierta, setSidebarAbierta] = useState(false);

  // Estado para el menú de usuario
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Estado para la lista de usuarios
  const [usuarios, setUsuarios] = useState(USUARIOS_INICIALES);

  // Estado para el modal (agregar/editar)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false); // true = editar, false = agregar
  const [usuarioActual, setUsuarioActual] = useState({
    id: null,
    nombre: "",
    correo: "",
    password: "",
    rol: "Agricultor",
    estado: "Activo",
  });

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // Abrir modal para AGREGAR
  const handleNuevoUsuario = () => {
    setModoEdicion(false);
    setUsuarioActual({
      id: null,
      nombre: "",
      correo: "",
      password: "",
      rol: "Agricultor",
      estado: "Activo",
    });
    setModalAbierto(true);
  };

  // Abrir modal para MODIFICAR
  const handleModificar = (usuario) => {
    setModoEdicion(true);
    setUsuarioActual({ ...usuario });
    setModalAbierto(true);
  };

  // Guardar (agregar o editar)
  const handleGuardar = () => {
    // Validación básica
    if (!usuarioActual.nombre || !usuarioActual.correo || !usuarioActual.password) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    if (modoEdicion) {
      // Editar usuario existente
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioActual.id ? usuarioActual : u))
      );
      alert("Usuario modificado exitosamente.");
    } else {
      // Agregar nuevo usuario
      const nuevoId = Math.max(...usuarios.map((u) => u.id), 0) + 1;
      setUsuarios((prev) => [...prev, { ...usuarioActual, id: nuevoId }]);
      alert("Usuario agregado exitosamente.");
    }
    setModalAbierto(false);
  };

  // Eliminar usuario
  const handleEliminar = (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
    }
  };

  return (
    <div style={styles.app}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-imprimir { display: none !important; }
        }
      `}</style>

      {/* SIDEBAR DESPLEGABLE */}
      <aside className="no-imprimir" style={{
        ...styles.sidebar,
        width: sidebarAbierta ? 250 : 0,
        minWidth: sidebarAbierta ? 250 : 0,
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
            <Link to="/Bitacoras" style={location.pathname === "/Bitacoras" ? styles.sidebarLinkActive : styles.sidebarLink}>Bitácoras</Link>
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

            <div
              style={{ ...styles.iconCircle, cursor: "pointer" }}
              onClick={() => setMenuAbierto(!menuAbierto)}
            >
              👤
            </div>

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

        {/* TOOLBAR */}
        <div className="no-imprimir" style={styles.toolbar}>
          {!sidebarAbierta && (
            <span
              style={{ fontSize: 24, cursor: "pointer", marginRight: 10 }}
              onClick={() => setSidebarAbierta(true)}
            >
              ☰
            </span>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Configuración de Administrador</h2>
            <span style={{ fontSize: 12, color: "#888" }}>Gestiona usuarios, roles y reportes</span>
          </div>
        </div>

        {/* CONTENIDO */}
        <main style={styles.main}>

          {/* TARJETA 1: USUARIOS Y ROLES */}
          <div style={styles.card}>
            <div style={styles.cardHeaderFlex}>
              <div>
                <h2 style={styles.cardTitle}>Usuarios y roles</h2>
                <p style={styles.cardSubtitle}>Administra qué usuarios tienen acceso y con qué rol</p>
              </div>
              <button style={styles.btnNuevo} onClick={handleNuevoUsuario}>+ Nuevo usuario</button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Usuario</th>
                    <th style={styles.th}>Correo</th>
                    <th style={styles.th}>Contraseña</th>
                    <th style={styles.th}>Rol</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((user) => (
                    <tr key={user.id} style={styles.tr}>
                      <td style={styles.td}>{user.nombre}</td>
                      <td style={styles.td}>{user.correo}</td>
                      <td style={styles.td}>{"•".repeat(user.password.length)}</td>
                      <td style={styles.td}>{user.rol}</td>
                      <td style={styles.td}>
                        <span style={{
                          color: user.estado === "Activo" ? "#4f863b" : "#d32f2f",
                          fontWeight: "bold"
                        }}>
                          {user.estado}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={styles.btnModificar}
                          onClick={() => handleModificar(user)}
                        >
                          ✏️ Modificar
                        </button>
                        <button
                          style={{ ...styles.btnModificar, color: "#d32f2f", borderColor: "#d32f2f", marginLeft: 8 }}
                          onClick={() => handleEliminar(user.id)}
                        >
                          🗑 Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TARJETA 2: REPORTES DE CICLOS */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Reportes de ciclos</h2>
            <p style={styles.cardSubtitle}>Genera un reporte descargable del ciclo de riego seleccionado</p>

            <div style={styles.reportesFlex}>
              <select style={styles.selectInput}>
                <option>Ciclo 12 — Parcela norte (1-15 sep)</option>
                <option>Ciclo 11 — Parcela sur (15-31 ago)</option>
              </select>

              <button style={styles.btnDescarga}>⬇ Descargar PDF</button>
              <button style={styles.btnDescarga}>⬇ Descargar CSV</button>
            </div>
          </div>

          {/* BOTÓN VOLVER */}
          <div style={{ marginTop: "20px" }}>
            <button style={styles.btnVolver} onClick={() => navigate("/dashboard")}>
              Volver a inicio
            </button>
          </div>
        </main>
      </div>

      {/* MODAL PARA AGREGAR/EDITAR USUARIO */}
      {modalAbierto && (
        <div style={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {modoEdicion ? "Modificar usuario" : "Nuevo usuario"}
            </h2>
            <p style={styles.modalSubtitle}>
              {modoEdicion ? "Edita los datos del usuario seleccionado" : "Completa los datos para registrar un nuevo usuario"}
            </p>

            <div style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nombre completo</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={usuarioActual.nombre}
                  onChange={(e) => setUsuarioActual({ ...usuarioActual, nombre: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Correo electrónico</label>
                <input
                  type="email"
                  style={styles.formInput}
                  value={usuarioActual.correo}
                  onChange={(e) => setUsuarioActual({ ...usuarioActual, correo: e.target.value })}
                  placeholder="Ej. juan@agroia.mx"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Contraseña</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={usuarioActual.password}
                  onChange={(e) => setUsuarioActual({ ...usuarioActual, password: e.target.value })}
                  placeholder="Contraseña"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroupHalf}>
                  <label style={styles.formLabel}>Rol</label>
                  <select
                    style={styles.formInput}
                    value={usuarioActual.rol}
                    onChange={(e) => setUsuarioActual({ ...usuarioActual, rol: e.target.value })}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Agricultor">Agricultor</option>
                  </select>
                </div>

                <div style={styles.formGroupHalf}>
                  <label style={styles.formLabel}>Estado</label>
                  <select
                    style={styles.formInput}
                    value={usuarioActual.estado}
                    onChange={(e) => setUsuarioActual({ ...usuarioActual, estado: e.target.value })}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button style={styles.modalCancelBtn} onClick={() => setModalAbierto(false)}>
                Cancelar
              </button>
              <button style={styles.modalSaveBtn} onClick={handleGuardar}>
                {modoEdicion ? "Guardar cambios" : "Agregar usuario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    maxWidth: "100%",
    minHeight: "100vh",
    margin: 0,
    background: "#fcfafc",
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

  main: { padding: "30px 40px", display: "flex", flexDirection: "column", gap: "25px", flex: 1, overflowX: "auto" },

  card: { backgroundColor: "#fff", borderRadius: 8, padding: "25px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eaeaea" },
  cardHeaderFlex: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: 10 },
  cardTitle: { margin: "0 0 5px 0", fontSize: 18, fontWeight: "bold", color: "#222" },
  cardSubtitle: { margin: 0, fontSize: 13, color: "#777" },

  btnNuevo: { backgroundColor: "#4f863b", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 13 },

  table: { width: "100%", borderCollapse: "collapse", marginTop: "10px" },
  th: { textAlign: "left", padding: "12px 10px", borderBottom: "1px solid #ddd", color: "#666", fontSize: 13, fontWeight: "bold", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #eee" },
  td: { padding: "12px 10px", color: "#333", fontSize: 14, whiteSpace: "nowrap" },

  btnModificar: {
    backgroundColor: "#fff",
    color: "#4f863b",
    border: "1px solid #4f863b",
    padding: "6px 12px",
    borderRadius: 6,
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 12,
    transition: "all 0.2s",
  },

  reportesFlex: { display: "flex", alignItems: "center", gap: "15px", marginTop: "20px", flexWrap: "wrap" },
  selectInput: { padding: "10px 15px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, color: "#333", minWidth: "280px", outline: "none" },
  btnDescarga: { backgroundColor: "#fff", color: "#4f863b", border: "1px solid #4f863b", padding: "10px 16px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 13, transition: "background 0.2s" },

  btnVolver: { backgroundColor: "#355e2b", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 15 },

  // ESTILOS DEL MODAL
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: "30px 35px",
    width: "100%",
    maxWidth: "500px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    boxSizing: "border-box",
  },
  modalTitle: {
    margin: "0 0 5px 0",
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E5233",
  },
  modalSubtitle: {
    margin: "0 0 20px 0",
    fontSize: 13,
    color: "#888",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: 15,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  formRow: {
    display: "flex",
    gap: 15,
  },
  formGroupHalf: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    flex: 1,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#444",
  },
  formInput: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    outline: "none",
    color: "#333",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 15,
    marginTop: 25,
  },
  modalCancelBtn: {
    padding: "10px 20px",
    border: "1px solid #ccc",
    borderRadius: 6,
    background: "#f9f9f9",
    color: "#555",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 14,
  },
  modalSaveBtn: {
    padding: "10px 20px",
    border: "none",
    borderRadius: 6,
    background: "#4f863b",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 14,
  },
};