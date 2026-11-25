
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import logoAgroIA from "../assets/agroia-logo.png";
import { leerPreferenciasAvisos, guardarPreferenciasAvisos } from "../components/avisosUtils";
import Notificaciones from "../components/AvisosPanel";
import { validarCorreo, validarNombrePersona, validarPassword } from "../utils/validaciones";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

export default function ConfigCuenta({ onLogout }) {
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState("");
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [preferenciasAvisos, setPreferenciasAvisos] = useState(() => leerPreferenciasAvisos());
  // Edición de perfil
  // null: ningún campo en edición
  // "nombre": editar solamente el nombre
  // "correo": editar solamente el correo
  const [campoEditando, setCampoEditando] = useState(null);
  const [nombreFormulario, setNombreFormulario] = useState("");
  const [correoFormulario, setCorreoFormulario] = useState("");
  const [passwordActualCorreo, setPasswordActualCorreo] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState("");
  // Cambio de contraseña
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);



  const navigate = useNavigate();
  const location = useLocation();

  // Consultar los datos reales del usuario autenticado.
  useEffect(() => {
    const controlador = new AbortController();

    async function cargarPerfil() {
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

      if (!token) {
        setErrorPerfil("No hay una sesión activa.");
        setCargandoPerfil(false);
        return;
      }

      try {
        const respuesta = await fetch(
          `${API_URL}/api/auth/perfil`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controlador.signal,
          }
        );

        if (!respuesta.ok) {
          throw new Error(
            `No se pudo consultar el perfil. HTTP ${respuesta.status}`
          );
        }

        const datos = await respuesta.json();
        const perfilActual = datos.usuario ?? datos;

        if (!controlador.signal.aborted) {
          setPerfil(perfilActual);

          // Preparar los campos con información de MySQL
          setNombreFormulario(perfilActual.nombre ?? "");
          setCorreoFormulario(perfilActual.correo ?? "");

          setErrorPerfil("");
        }
      } catch (error) {
        if (!controlador.signal.aborted) {
          setErrorPerfil(error.message);
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoPerfil(false);
        }
      }
    }

    cargarPerfil();

    return () => controlador.abort();
  }, []);

  // Cerrar sesión y revocar el JWT en Flask.
  const handleLogout = () => {
    onLogout();
  };



const iniciarEdicion = (campo) => {
  if (!perfil) return;

  // Recuperar los valores originales.
  setNombreFormulario(perfil.nombre ?? "");
  setCorreoFormulario(perfil.correo ?? "");
  setPasswordActualCorreo("");
  setPasswordActual("");
  setPasswordNueva("");
  setConfirmarPassword("");

  setErrorPerfil("");
  setMensajePerfil("");
  setCampoEditando(campo);
};

const cancelarEdicion = () => {
  setNombreFormulario(perfil?.nombre ?? "");
  setCorreoFormulario(perfil?.correo ?? "");
  setPasswordActualCorreo("");
  setPasswordActual("");
  setPasswordNueva("");
  setConfirmarPassword("");

  setErrorPerfil("");
  setCampoEditando(null);
};

const guardarPerfil = async () => {
  if (guardandoPerfil || !perfil || !campoEditando) return;

  setErrorPerfil("");
  setMensajePerfil("");

  // Solo enviaremos el campo que se está editando.
  const cuerpo = {};

  if (campoEditando === "nombre") {
    const nuevoNombre = nombreFormulario.trim();

    const errorNombre = validarNombrePersona(nuevoNombre);
    if (errorNombre) {
      setErrorPerfil(errorNombre);
      return;
    }

    if (nuevoNombre === perfil.nombre) {
      setCampoEditando(null);
      setMensajePerfil("No se realizaron cambios.");
      return;
    }

    cuerpo.nombre = nuevoNombre;
  }

  if (campoEditando === "correo") {
    const nuevoCorreo = correoFormulario.trim().toLowerCase();

    const errorCorreo = validarCorreo(nuevoCorreo);
    if (errorCorreo) {
      setErrorPerfil(errorCorreo);
      return;
    }

    if (nuevoCorreo === perfil.correo.toLowerCase()) {
      setCampoEditando(null);
      setPasswordActualCorreo("");
      setMensajePerfil("No se realizaron cambios.");
      return;
    }

    if (!passwordActualCorreo) {
      setErrorPerfil(
        "Introduce tu contraseña actual para cambiar el correo."
      );
      return;
    }

    cuerpo.correo = nuevoCorreo;
    cuerpo.password_actual = passwordActualCorreo;
  }

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (!token) {
    setErrorPerfil("La sesión ha expirado. Inicia sesión nuevamente.");
    return;
  }

  setGuardandoPerfil(true);

  try {
    const respuesta = await fetch(`${API_URL}/api/auth/perfil`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cuerpo),
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        `Error al actualizar el perfil: HTTP ${respuesta.status}`
      );
    }

    const perfilActualizado = resultado.usuario ?? resultado;
    setPerfil(perfilActualizado);
    setNombreFormulario(perfilActualizado.nombre);
    setCorreoFormulario(perfilActualizado.correo);
    setPasswordActualCorreo("");

    localStorage.setItem("nombre", perfilActualizado.nombre);

    setCampoEditando(null);
    setMensajePerfil("Perfil actualizado correctamente.");
  } catch (error) {
    setErrorPerfil(error.message);
  } finally {
    setGuardandoPerfil(false);
  }
};



const cambiarPassword = async () => {
  if (guardandoPassword || campoEditando !== "password") return;

  setErrorPerfil("");
  setMensajePerfil("");

  // Validar que los tres campos estén completos.
  if (!passwordActual || !passwordNueva || !confirmarPassword) {
    setErrorPerfil("Debes completar los tres campos.");
    return;
  }

  // Respetar las validaciones implementadas en Flask.
  const errorPassword = validarPassword(passwordNueva);
  if (errorPassword) {
    setErrorPerfil(errorPassword);
    return;
  }

  if (passwordNueva !== confirmarPassword) {
    setErrorPerfil("Las contraseñas nuevas no coinciden.");
    return;
  }

  if (passwordActual === passwordNueva) {
    setErrorPerfil(
      "La nueva contraseña debe ser diferente de la actual."
    );
    return;
  }

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (!token) {
    setErrorPerfil("La sesión ha expirado. Inicia sesión nuevamente.");
    return;
  }

  setGuardandoPassword(true);

  try {
    const respuesta = await fetch(
      `${API_URL}/api/auth/password`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password_actual: passwordActual,
          password_nueva: passwordNueva,
        }),
      }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error ||
        `No se pudo cambiar la contraseña. HTTP ${respuesta.status}`
      );
    }

    // Flask ya revocó el JWT utilizado.
    // Eliminamos las credenciales de este navegador.
    [
      "access_token",
      "token",
      "rol",
      "nombre",
    ].forEach((clave) => localStorage.removeItem(clave));

    setPasswordActual("");
    setPasswordNueva("");
    setConfirmarPassword("");

    // Se requiere iniciar sesión con la contraseña nueva.
    window.location.replace("/login");

  } catch (error) {
    setErrorPerfil(error.message);
  } finally {
    setGuardandoPassword(false);
  }
};



  const ListItem = ({ icono, titulo, subtitulo, rightElement }) => (
    <div style={styles.listItem}>
      <div style={styles.listLeft}>
        <div style={styles.iconSquare}>{icono}</div>
        <div style={styles.listText}>
          <div style={styles.listTitle}>{titulo}</div>
          <div style={styles.listSubtitle}>{subtitulo}</div>
        </div>
      </div>
      <div>{rightElement}</div>
    </div>
  );

  return (
    <div style={styles.app}>
      {/* BARRA LATERAL */}
      <aside
        style={{
          ...styles.sidebar,
          width: sidebarAbierta ? 250 : 0,
          minWidth: sidebarAbierta ? 250 : 0,
          flexShrink: 0,
          padding: 0,
          borderRight: sidebarAbierta
            ? "1px solid #e0e0e0"
            : "none",
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
            <span
              style={{ fontSize: 24, cursor: "pointer" }}
              onClick={() => setSidebarAbierta(false)}
            >
              ←
            </span>
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
          </div>

          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>NODOS</div>
            {/* Los nodos son dinámicos; sus rutas reales se encuentran en el Dashboard. */}
            <Link to="/dashboard" style={styles.sidebarLink}>
              Ver nodos activos
            </Link>
          </div>

          <div style={styles.sidebarFooter}>
            <Link
              to="/config-general"
              style={styles.sidebarLinkConfig}
            >
              <span>⚙️</span> Configuración
            </Link>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div style={styles.mainContent}>
        <header style={styles.banner}>
          <Link
            to="/dashboard"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src={logoAgroIA}
              alt="Agro IA - Riego Inteligente"
              style={{ height: 60 }}
            />
          </Link>

          <div
            style={{
              ...styles.bannerRight,
              position: "relative",
            }}
          >
            <div style={styles.tempBadge}>Mi cuenta</div>
            <Notificaciones style={styles.iconCircle} />

            {/* Menú de usuario */}
            <button
              type="button"
              aria-label="Abrir menú de usuario"
              style={{
                ...styles.iconCircle,
                border: "none",
                cursor: "pointer",
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "#fff",
              }}
              onClick={() => setMenuAbierto((anterior) => !anterior)}
            >
              👤
            </button>

            {menuAbierto && (
              <div
                style={{
                  position: "absolute",
                  top: 55,
                  right: 0,
                  width: 245,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: "#2E5233",
                  color: "#fff",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                  zIndex: 100,
                }}
              >
                <div style={{ fontWeight: "bold" }}>
                  {perfil?.nombre ?? "Usuario"}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    marginTop: 4,
                    overflowWrap: "anywhere",
                  }}
                >
                  {perfil?.correo ?? ""}
                </div>

                <hr
                  style={{
                    border: "none",
                    borderTop: "1px solid rgba(255,255,255,0.2)",
                    margin: "14px 0",
                  }}
                />

                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  style={estiloOpcionMenu}
                >
                  Vista general
                </button>

                {perfil?.rol === "admin" && (
                  <button
                    type="button"
                    onClick={() => navigate("/config-admin")}
                    style={estiloOpcionMenu}
                  >
                    Gestión de usuarios
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={cerrandoSesion}
                  style={{
                    ...estiloOpcionMenu,
                    marginTop: 8,
                    borderTop: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {cerrandoSesion ? "Cerrando..." : "Cerrar sesión"}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Barra de herramientas a ancho completo, como en Dashboard. */}
        <div style={styles.contentArea}>
          <div style={styles.toolbar}>
            {!sidebarAbierta && (
              <button
                type="button"
                aria-label="Abrir menú lateral"
                onClick={() => setSidebarAbierta(true)}
                style={styles.menuButton}
              >
                ☰
              </button>
            )}
            <span style={styles.toolbarTitle}>Gestión de cuenta</span>
          </div>

          <main style={styles.main}>
            <h1 style={styles.pageTitle}>Cuenta</h1>

            {errorPerfil && (
              <p style={{ color: "#b42318" }}>{errorPerfil}</p>
            )}
            {mensajePerfil && (
              <p style={{ color: "#2F5413", fontWeight: "bold" }}>
                {mensajePerfil}
              </p>
            )}

            <div style={styles.cardsContainer}>
              {/* PERFIL REAL */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>PERFIL</h3>

                <div style={styles.cardContent}>

                  {/* ========================= */}
                  {/* NOMBRE */}
                  {/* ========================= */}
                  {campoEditando === "nombre" ? (
                    <label style={{ fontWeight: "bold", fontSize: 14 }}>
                      Nombre
                      <input
                        type="text"
                        value={nombreFormulario}
                        maxLength={100}
                        onChange={(e) => setNombreFormulario(e.target.value)}
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding: 10,
                          borderRadius: 8,
                          border: "1px solid #aaa",
                          boxSizing: "border-box",
                        }}
                      />
                    </label>
                  ) : (
                    <ListItem
                      icono="👤"
                      titulo="Nombre"
                      subtitulo={perfil?.nombre ?? "No disponible"}
                      rightElement={
                        <button
                          type="button"
                          disabled={campoEditando !== null || !perfil}
                          aria-label="Editar nombre"
                          onClick={() => iniciarEdicion("nombre")}
                          style={{
                            border: "none",
                            background: "transparent",
                            fontSize: 20,
                            cursor: campoEditando ? "not-allowed" : "pointer",
                            opacity: campoEditando ? 0.4 : 1,
                          }}
                        >
                          📝
                        </button>
                      }
                    />
                  )}

                  {/* ========================= */}
                  {/* CORREO ELECTRÓNICO */}
                  {/* ========================= */}
                  {campoEditando === "correo" ? (
                    <>
                      <label style={{ fontWeight: "bold", fontSize: 14 }}>
                        Correo electrónico
                        <input
                          type="email"
                          value={correoFormulario}
                          maxLength={150}
                          onChange={(e) => setCorreoFormulario(e.target.value)}
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #aaa",
                            boxSizing: "border-box",
                          }}
                        />
                      </label>

                      <label style={{ fontWeight: "bold", fontSize: 14 }}>
                        Contraseña actual
                        <input
                          type="password"
                          value={passwordActualCorreo}
                          onChange={(e) => setPasswordActualCorreo(e.target.value)}
                          autoComplete="current-password"
                          placeholder="Confirma tu contraseña"
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #aaa",
                            boxSizing: "border-box",
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    <ListItem
                      icono="✉️"
                      titulo="Correo"
                      subtitulo={perfil?.correo ?? "No disponible"}
                      rightElement={
                        <button
                          type="button"
                          disabled={campoEditando !== null || !perfil}
                          aria-label="Editar correo electrónico"
                          onClick={() => iniciarEdicion("correo")}
                          style={{
                            border: "none",
                            background: "transparent",
                            fontSize: 20,
                            cursor: campoEditando ? "not-allowed" : "pointer",
                            opacity: campoEditando ? 0.4 : 1,
                          }}
                        >
                          📝
                        </button>
                      }
                    />
                  )}

                  {/* ========================= */}
                  {/* CONTRASEÑA */}
                  {/* ========================= */}

                  {campoEditando === "password" ? (
                    <>
                      <label style={{ fontWeight: "bold", fontSize: 14 }}>
                        Contraseña actual
                        <input
                          type="password"
                          value={passwordActual}
                          onChange={(e) => setPasswordActual(e.target.value)}
                          autoComplete="current-password"
                          placeholder="Introduce tu contraseña actual"
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #aaa",
                            boxSizing: "border-box",
                          }}
                        />
                      </label>

                      <label style={{ fontWeight: "bold", fontSize: 14 }}>
                        Nueva contraseña
                        <input
                          type="password"
                          value={passwordNueva}
                          onChange={(e) => setPasswordNueva(e.target.value)}
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={128}
                          placeholder="Mínimo 12 caracteres"
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #aaa",
                            boxSizing: "border-box",
                          }}
                        />
                      </label>

                      <label style={{ fontWeight: "bold", fontSize: 14 }}>
                        Confirmar nueva contraseña
                        <input
                          type="password"
                          value={confirmarPassword}
                          onChange={(e) => setConfirmarPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Repite la contraseña nueva"
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #aaa",
                            boxSizing: "border-box",
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    <ListItem
                      icono="🔒"
                      titulo="Contraseña"
                      subtitulo="Contraseña protegida"
                      rightElement={
                        <button
                          type="button"
                          disabled={campoEditando !== null || !perfil}
                          aria-label="Cambiar contraseña"
                          onClick={() => iniciarEdicion("password")}
                          style={{
                            border: "none",
                            background: "transparent",
                            fontSize: 20,
                            cursor: campoEditando
                              ? "not-allowed"
                              : "pointer",
                            opacity: campoEditando ? 0.4 : 1,
                          }}
                        >
                          📝
                        </button>
                      }
                    />
                  )}


                </div>
              </div>



              {/* Preferencias visuales de avisos de este navegador, independientes de SMTP. */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>PREFERENCIAS RÁPIDAS</h3>
                <p style={{ fontSize: 12, color: "#666", padding: "0 18px" }}>Estas preferencias controlan los avisos dentro del navegador; no modifican el envío de correos.</p>
                <div style={styles.cardContent}>
                  <ListItem
                    icono="🔔"
                    titulo="Avisos de humedad baja"
                    subtitulo="Mostrar avisos visuales según el umbral de la parcela"
                    rightElement={<label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={preferenciasAvisos.suelo} onChange={e => { const nuevas = { ...preferenciasAvisos, suelo: e.target.checked }; setPreferenciasAvisos(nuevas); guardarPreferenciasAvisos(nuevas); }} /><span>{preferenciasAvisos.suelo ? "Sí" : "No"}</span></label>}
                  />
                  <ListItem
                    icono="🔋"
                    titulo="Avisos de batería baja"
                    subtitulo="Mostrar avisos visuales cuando una batería esté por debajo del 20 %"
                    rightElement={<label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={preferenciasAvisos.bateria} onChange={e => { const nuevas = { ...preferenciasAvisos, bateria: e.target.checked }; setPreferenciasAvisos(nuevas); guardarPreferenciasAvisos(nuevas); }} /><span>{preferenciasAvisos.bateria ? "Sí" : "No"}</span></label>}
                  />
                </div>
              </div>
            </div>

            <div style={styles.actionButtons}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => {
                  if (campoEditando !== null) {
                    cancelarEdicion();
                  } else {
                    navigate("/dashboard");
                  }
                }}
              >
                {campoEditando !== null ? "Cancelar" : "Volver"}
              </button>

              <button
                type="button"
                disabled={
                  campoEditando === null ||
                  guardandoPerfil ||
                  guardandoPassword ||
                  !perfil
                }
                onClick={
                  campoEditando === "password"
                    ? cambiarPassword
                    : guardarPerfil
                }
                style={{
                  ...styles.saveBtn,
                  opacity:
                    campoEditando === null || guardandoPerfil || guardandoPassword
                      ? 0.5
                      : 1,
                  cursor:
                    campoEditando === null || guardandoPerfil || guardandoPassword
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {guardandoPerfil || guardandoPassword
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const estiloOpcionMenu = {
  display: "block",
  width: "100%",
  padding: "10px 0",
  background: "transparent",
  border: "none",
  color: "#fff",
  textAlign: "left",
  cursor: "pointer",
  fontSize: 14,
};

const styles = {
  app: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    minHeight: "100vh",
    margin: 0,
    background: "#f8f9fa",
    boxSizing: "border-box",
    fontFamily: "sans-serif",
  },
  sidebar: { backgroundColor: "#f4f6f8", display: "flex", flexDirection: "column", boxSizing: "border-box", transition: "all 0.3s ease", overflow: "hidden", whiteSpace: "nowrap", zIndex: 10 },
  sidebarHeader: { display: "flex", alignItems: "center", padding: "20px 20px", borderBottom: "1px solid #e0e0e0", marginBottom: "20px", color: "#333" },
  sidebarSection: { marginBottom: "25px", display: "flex", flexDirection: "column" },
  sidebarSectionTitle: { padding: "0 20px", fontSize: "12px", fontWeight: "bold", color: "#888", letterSpacing: "1px", marginBottom: "10px" },
  sidebarLink: { display: "block", padding: "12px 20px", color: "#444", textDecoration: "none", fontSize: "15px", fontWeight: "600", transition: "background 0.2s, color 0.2s" },
  sidebarLinkActive: { display: "block", padding: "12px 20px", textDecoration: "none", fontSize: "15px", fontWeight: "600", backgroundColor: "#e6f4cd", color: "#5a7d3c", borderLeft: "4px solid #7A9D54" },
  sidebarFooter: { marginTop: "auto", padding: "20px 0", borderTop: "1px solid #e0e0e0" },
  sidebarLinkConfig: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 20px", color: "#444", textDecoration: "none", fontSize: "15px", fontWeight: "600" },
  mainContent: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
 banner: {background: "#7A9D54", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 24px"},
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandTitle: { margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 900, textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  brandSubtitle: { display: "block", fontSize: 10, letterSpacing: 1, opacity: 0.9 },
  bannerRight: { display: "flex", alignItems: "center", gap: 14 },
  tempBadge: { background: "rgba(0,0,0,0.3)", padding: "6px 14px", borderRadius: 20, fontWeight: 600 },
  iconCircle: { width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  contentArea: { display: "flex", flex: 1, flexDirection: "column", minWidth: 0 },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minHeight: 66,
    padding: "12px 24px",
    borderBottom: "1px solid #eee",
    background: "#fff",
    boxSizing: "border-box",
  },
  menuButton: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    background: "transparent",
    border: "none",
    padding: 4,
    fontSize: 25,
    color: "#333",
    cursor: "pointer",
  },
  toolbarTitle: { fontSize: 15, fontWeight: 600, color: "#444" },
  main: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    padding: "24px",
    background: "#f8f9fa",
    boxSizing: "border-box",
    overflowX: "auto",
  },
  pageTitle: { margin: "0 0 22px", fontSize: 26, fontWeight: "bold", color: "#111" },
  cardsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))",
    gap: 20,
    alignItems: "start",
    width: "100%",
  },
  card: {
    minWidth: 0,
    width: "100%",
    backgroundColor: "#eef2e6",
    borderRadius: 16,
    padding: 24,
    boxSizing: "border-box",
  },
  cardTitle: { margin: "0 0 20px 0", fontSize: 14, color: "#8b9485", fontWeight: "bold", letterSpacing: "1px" },
  cardContent: { display: "flex", flexDirection: "column", gap: "20px" },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, minWidth: 0 },
  listLeft: { display: "flex", alignItems: "center", gap: 15, minWidth: 0 },
  iconSquare: { width: 38, height: 38, borderRadius: "10px", backgroundColor: "#8aab73", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: "2px solid #779a5f" },
  listText: { display: "flex", flexDirection: "column", minWidth: 0, overflowWrap: "anywhere" },
  listTitle: { fontSize: 15, fontWeight: "bold", color: "#222" },
  listSubtitle: { fontSize: 12, color: "#777", marginTop: "2px" },
  editIcon: { fontSize: 20, cursor: "pointer", color: "#333", opacity: 0.8 },
  toggleBgBlue: { width: 46, height: 26, borderRadius: 20, position: "relative", cursor: "pointer", transition: "background 0.3s" },
  toggleKnob: { content: "", position: "absolute", top: 2, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" },
  badge: { backgroundColor: "#a8c090", color: "#4a6336", padding: "6px 14px", borderRadius: "8px", fontSize: 14, fontWeight: "bold" },
  actionButtons: { display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 16, marginTop: 26, paddingTop: 20 },
  cancelBtn: { padding: "10px 20px", border: "none", background: "transparent", color: "#888", fontSize: 15, cursor: "pointer", fontWeight: "bold" },
  saveBtn: { padding: "12px 24px", border: "none", borderRadius: "8px", background: "#2d5a27", color: "#fff", fontSize: 15, cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 6px rgba(45, 90, 39, 0.3)" },
};