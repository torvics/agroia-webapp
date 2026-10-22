import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import logoAgroIA from "../assets/agroia-logo.png";
import Notificaciones from "../components/AvisosPanel";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/api\/?$/, "");

const FORMULARIO_VACIO = {
  humedad_suelo_min: "",
  temperatura_min: "",
  correo_destino: "",
  activa: false,
  cooldown_minutos: "30",
};

function prepararFormulario(configuracion) {
  if (!configuracion) return { ...FORMULARIO_VACIO };

  return {
    humedad_suelo_min: configuracion.humedad_suelo_min ?? "",
    temperatura_min: configuracion.temperatura_min ?? "",
    correo_destino: configuracion.correo_destino ?? "",
    activa: configuracion.activa === true,
    cooldown_minutos: String(configuracion.cooldown_minutos ?? 30),
  };
}

async function consultarAPI(ruta, { method = "GET", body, signal } = {}) {
  const token =
    localStorage.getItem("access_token") || localStorage.getItem("token");

  if (!token) throw new Error("No hay una sesión activa. Inicia sesión nuevamente.");

  const respuesta = await fetch(`${API_URL}/api${ruta}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal,
  });

  const contenido = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const error = new Error(
      contenido.error || contenido.msg || `Error HTTP ${respuesta.status}`
    );
    error.status = respuesta.status;
    throw error;
  }

  return contenido;
}

export default function ConfigGeneral({ usuario, onLogout }) {
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

  const [formulario, setFormulario] = useState({ ...FORMULARIO_VACIO });
  const [configExiste, setConfigExiste] = useState(false);
  const [cargandoConfig, setCargandoConfig] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [hayCambios, setHayCambios] = useState(false);
  const [errorConfig, setErrorConfig] = useState("");
  const [errorCargaConfig, setErrorCargaConfig] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [accionNodo, setAccionNodo] = useState("");
  const [identificadorNodo, setIdentificadorNodo] = useState("");
  const [tipoNuevoNodo, setTipoNuevoNodo] = useState("sensor_suelo");
  const [apiKeyNuevoNodo, setApiKeyNuevoNodo] = useState("");
  const [errorNodo, setErrorNodo] = useState("");
  const [exitoNodo, setExitoNodo] = useState("");
  const [guardandoNodo, setGuardandoNodo] = useState(false);
  const [intervaloPantalla, setIntervaloPantalla] = useState(() => { const n = Number(localStorage.getItem("agroia_intervalo_pantalla")); return [15,30,60,120].includes(n) ? n : 60; });

  // Perfil, parcelas y nodos autorizados para el usuario autenticado.
  useEffect(() => {
    const controlador = new AbortController();

    async function cargarInicial() {
      setCargandoInicial(true);
      setErrorInicial("");
      try {
        const [datosPerfil, datosParcelas, datosNodos] = await Promise.all([
          consultarAPI("/auth/perfil", { signal: controlador.signal }),
          consultarAPI("/parcelas", { signal: controlador.signal }),
          consultarAPI("/nodos", { signal: controlador.signal }),
        ]);

        if (controlador.signal.aborted) return;

        const listaParcelas = Array.isArray(datosParcelas)
          ? datosParcelas
          : datosParcelas.parcelas ?? [];
        if (!Array.isArray(listaParcelas) || !Array.isArray(datosNodos)) {
          throw new Error("La respuesta de parcelas o nodos es inválida.");
        }

        setPerfil(datosPerfil.usuario ?? datosPerfil);
        setParcelas(listaParcelas);
        setNodos(datosNodos);
        setParcelaId(listaParcelas.length ? String(listaParcelas[0].id) : "");
      } catch (error) {
        if (!controlador.signal.aborted) setErrorInicial(error.message);
      } finally {
        if (!controlador.signal.aborted) setCargandoInicial(false);
      }
    }

    cargarInicial();
    return () => controlador.abort();
  }, []);

  // Los umbrales son POR PARCELA; no por nodo individual.
  useEffect(() => {
    const controlador = new AbortController();
    setMensaje("");
    setErrorConfig("");
    setErrorCargaConfig("");
    setFormulario({ ...FORMULARIO_VACIO });
    setConfigExiste(false);
    setHayCambios(false);

    if (!parcelaId) {
      setCargandoConfig(false);
      return () => controlador.abort();
    }

    async function cargarConfiguracion() {
      setCargandoConfig(true);
      try {
        const datos = await consultarAPI(
          `/alertas/config?parcela_id=${encodeURIComponent(parcelaId)}`,
          { signal: controlador.signal }
        );
        if (controlador.signal.aborted) return;
        setFormulario(prepararFormulario(datos.configuracion));
        setConfigExiste(true);
      } catch (error) {
        if (controlador.signal.aborted) return;
        if (error.status === 404) {
          // El backend devuelve 404 cuando la parcela aún no tiene configuración.
          setConfigExiste(false);
          setFormulario({ ...FORMULARIO_VACIO });
        } else {
          setErrorCargaConfig(error.message);
        }
      } finally {
        if (!controlador.signal.aborted) setCargandoConfig(false);
      }
    }

    cargarConfiguracion();
    return () => controlador.abort();
  }, [parcelaId]);

  const parcelaSeleccionada = parcelas.find(
    (p) => String(p.id) === String(parcelaId)
  );

  const nodosParcela = nodos.filter(
    (n) => String(n.parcela_id) === String(parcelaId)
  );
  const nodosSuelo = nodosParcela.filter(
    (n) => n.tipo === "sensor_suelo" && n.estado === "activo"
  );
  const administrador = perfil?.rol === "admin";

  // Si se cambia la parcela, seleccionar un nodo de la nueva parcela.
  useEffect(() => {
    setNodoId((actual) =>
      nodosSuelo.some((n) => String(n.id) === String(actual))
        ? actual
        : nodosSuelo.length
          ? String(nodosSuelo[0].id)
          : ""
    );
  }, [parcelaId, nodos]);

  const actualizarCampo = (campo, valor) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));

    setHayCambios(true);
    setMensaje("");
    setErrorConfig("");
  };

  const guardarConfiguracion = async () => {
    // Siempre informar por qué no se puede guardar; nunca salir en silencio.
    if (guardando) return;

    setErrorConfig("");
    setMensaje("");

    if (!parcelaId) {
      setErrorConfig("Selecciona una parcela antes de guardar.");
      return;
    }
    if (cargandoInicial || cargandoConfig) {
      setErrorConfig("Espera a que termine de cargar la información antes de guardar.");
      return;
    }
    if (errorInicial || errorCargaConfig) {
      setErrorConfig(
        "No se puede guardar porque falló la carga de datos. Recarga la página para reintentar."
      );
      return;
    }

    const humedadTexto = String(formulario.humedad_suelo_min ?? "").trim();
    const temperaturaTexto = String(formulario.temperatura_min ?? "").trim();
    const cooldownTexto = String(formulario.cooldown_minutos ?? "").trim();
    const correo = String(formulario.correo_destino ?? "").trim();

    if (!humedadTexto || !temperaturaTexto) {
      setErrorConfig("Debes indicar ambos umbrales para guardar la configuración.");
      return;
    }

    const humedad = Number(humedadTexto);
    const temperatura = Number(temperaturaTexto);
    const cooldown = Number(cooldownTexto);

    if (!Number.isFinite(humedad) || humedad < 0 || humedad > 100) {
      setErrorConfig("La humedad mínima debe estar entre 0 y 100 %.");
      return;
    }
    if (!Number.isFinite(temperatura) || temperatura < -50 || temperatura > 60) {
      setErrorConfig("La temperatura mínima debe estar entre -50 y 60 °C.");
      return;
    }
    if (!/^\d+$/.test(cooldownTexto) || !Number.isInteger(cooldown) || cooldown < 1 || cooldown > 10080) {
      setErrorConfig("El tiempo entre alertas debe ser de 1 a 10080 minutos.");
      return;
    }
    if (correo && (correo.length > 255 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo))) {
      setErrorConfig("Introduce un correo de destino válido o deja el campo vacío.");
      return;
    }

    setGuardando(true);
    let postAceptado = false;
    try {
      await consultarAPI("/alertas/config", {
        method: "POST",
        body: {
          parcela_id: Number(parcelaId),
          humedad_suelo_min: humedad,
          temperatura_min: temperatura,
          correo_destino: correo || null,
          activa: Boolean(formulario.activa),
          cooldown_minutos: cooldown,
        },
      });
      postAceptado = true;

      // Leer de nuevo MySQL a través de Flask: confirmar que se guardó realmente.
      const verificacion = await consultarAPI(
        `/alertas/config?parcela_id=${encodeURIComponent(parcelaId)}`
      );
      if (!verificacion.configuracion) {
        throw new Error("El servidor no devolvió la configuración para verificar el guardado.");
      }

      const guardada = verificacion.configuracion;
      const coincide =
        Number(guardada.parcela_id) === Number(parcelaId) &&
        Number(guardada.humedad_suelo_min) === humedad &&
        Number(guardada.temperatura_min) === temperatura &&
        Number(guardada.cooldown_minutos) === cooldown &&
        guardada.activa === Boolean(formulario.activa) &&
        String(guardada.correo_destino ?? "").trim().toLowerCase() === correo.toLowerCase();

      setFormulario(prepararFormulario(guardada));
      setConfigExiste(true);
      if (!coincide) {
        throw new Error("Los valores recuperados no coinciden con los enviados. Revisa la configuración mostrada.");
      }
      setMensaje("Configuración de alertas guardada y verificada correctamente.");
      setHayCambios(false);
    } catch (error) {
      setErrorConfig(
        postAceptado
          ? `El servidor recibió el guardado, pero no se pudo verificar: ${error.message}`
          : `No se pudo guardar la configuración: ${error.message}`
      );
    } finally {
      setGuardando(false);
    }
  };

  const guardarNodo = async () => {
    if (guardandoNodo) return;
    setErrorNodo(""); setExitoNodo(""); setApiKeyNuevoNodo("");
    const identificador = identificadorNodo.trim();
    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(identificador)) {
      setErrorNodo("Identificador de 3 a 64 caracteres: letras, números, guiones y guiones bajos."); return;
    }
    if (accionNodo === "editar") {
      const seleccionado = nodosSuelo.find(n => String(n.id) === String(nodoId));
      if (!seleccionado) { setErrorNodo("Selecciona un nodo de suelo activo."); return; }
      if (!window.confirm(`Cambiar el identificador de ${seleccionado.identificador} puede afectar al firmware y al histórico. ¿Confirmas el cambio?`)) return;
    }
    setGuardandoNodo(true);
    try {
      const editar = accionNodo === "editar";
      const ruta = editar ? `/nodos/${nodoId}` : "/nodos";
      const payload = editar ? { identificador } : { parcela_id: Number(parcelaId), identificador, tipo: tipoNuevoNodo };
      const creado = await consultarAPI(ruta, { method: editar ? "PUT" : "POST", body: payload });
      if (editar) {
        setNodos(anteriores => anteriores.map(n => Number(n.id) === Number(nodoId) ? { ...n, identificador: creado.identificador } : n));
        setExitoNodo("Nombre actualizado en MySQL. Comprueba la configuración del firmware y las consultas históricas.");
      } else {
        setNodos(anteriores => [...anteriores, creado]);
        setApiKeyNuevoNodo(creado.api_key || "");
        setExitoNodo(`Nodo ${creado.identificador} creado correctamente (ID ${creado.id}).`);
      }
      setIdentificadorNodo("");
      setAccionNodo("");
    } catch (error) {
      setErrorNodo(error.message || "No se pudo guardar el nodo.");
    } finally { setGuardandoNodo(false); }
  };
  const handleLogout = () => onLogout?.();
  const handleCancelar = () => navigate("/dashboard");

  return (
    <div style={styles.app}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-imprimir { display: none !important; }
        }
      `}</style>

      <aside className="no-imprimir" style={{
        ...styles.sidebar,
        width: sidebarAbierta ? 250 : 0,
        minWidth: sidebarAbierta ? 250 : 0,
        opacity: sidebarAbierta ? 1 : 0,
        borderRight: sidebarAbierta ? "1px solid #e0e0e0" : "none",
      }}>
        <div style={{
          visibility: sidebarAbierta ? "visible" : "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}>
          <div style={styles.sidebarHeader}>
            <button type="button" onClick={() => setSidebarAbierta(false)}
              style={{ border: "none", background: "transparent", fontSize: 24, cursor: "pointer" }}
              aria-label="Cerrar menú">←</button>
            <h2 style={{ margin: 0, fontSize: 20 }}>Menú</h2>
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>PRINCIPAL</div>
            <Link to="/dashboard" style={styles.sidebarLink}>Vista general</Link>
            <Link to="/Bitacoras" style={styles.sidebarLink}>Bitácoras</Link>
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>NODOS DE SUELO</div>
            {nodosSuelo.length === 0 ? (
              <span style={{ padding: "10px 20px", color: "#777", fontSize: 13 }}>
                Sin nodos en esta parcela.
              </span>
            ) : nodosSuelo.map((item) => (
              <Link key={item.id} to={`/nodos/${item.id}`}
                style={location.pathname === `/nodos/${item.id}`
                  ? styles.sidebarLinkActive : styles.sidebarLink}>
                {item.identificador}
              </Link>
            ))}
          </div>
          <div style={styles.sidebarFooter}>
            <Link to="/config-general" style={styles.sidebarLinkActive}>
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
            <div style={styles.tempBadge}>Configuración</div>
            <Notificaciones parcelaId={parcelaId} style={styles.iconCircle} />
            <button type="button" style={{ ...styles.iconCircle, border: "none", color: "#fff", cursor: "pointer" }}
              onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú de usuario">👤</button>

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
                  {administrador && (
                    <div style={styles.userMenuOption} onClick={() => { navigate("/config-admin"); setMenuAbierto(false); }}>
                      <span style={styles.userMenuBullet}>•</span> Gestión de usuarios
                    </div>
                  )}
                  <div style={styles.userMenuOption} onClick={() => { navigate("/config-cuenta"); setMenuAbierto(false); }}>
                    <span style={styles.userMenuBullet}>•</span> Gestión de cuenta
                  </div>
                </div>
                <button type="button" style={{ ...styles.userMenuLogout, width: "100%", color: "white", background: "transparent", border: "none", borderTop: "1px solid rgba(255,255,255,0.15)" }} onClick={handleLogout}>
                  <span style={{ marginRight: 8 }}>🚪</span> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
          <div className="no-imprimir" style={styles.leftGreyBar}>
            {!sidebarAbierta && (
              <button type="button" aria-label="Abrir menú" onClick={() => setSidebarAbierta(true)}
                style={{ border: "none", background: "transparent", fontSize: 28, cursor: "pointer" }}>☰</button>
            )}
          </div>
          <main style={styles.main}>
            <h1 style={styles.pageTitle}>General</h1>
            <p style={styles.pageSubtitle}>Umbrales de alertas y administración de tus dispositivos</p>

            {errorInicial && <p role="alert" style={{ color: "#b42318" }}>{errorInicial}</p>}
            {cargandoInicial && <p style={{ color: "#666" }}>Cargando parcelas y nodos...</p>}

            {!cargandoInicial && !errorInicial && (
              <div style={styles.configContainer}>
                <section style={styles.section}>
                  <h3 style={styles.sectionTitle}>Ajuste de umbrales de alerta</h3>
                  <p style={styles.sectionDesc}>
                    Las alertas se configuran por parcela. Los valores se guardan en MySQL;
                    el envío de correos depende del servicio de alertas.
                  </p>
                  <div style={styles.row}>
                    <div>
                      <div style={styles.itemTitle}>Parcela a configurar</div>
                      <div style={styles.itemDesc}>Selecciona una de tus parcelas autorizadas.</div>
                    </div>
                    <select style={styles.selectInput} value={parcelaId}
                      onChange={(e) => setParcelaId(e.target.value)}
                      disabled={parcelas.length === 0 || guardando} aria-label="Seleccionar parcela">
                      {parcelas.length === 0 && <option value="">Sin parcelas disponibles</option>}
                      {parcelas.map((p) => (
                        <option key={p.id} value={String(p.id)}>{p.nombre || `Parcela ${p.id}`}</option>
                      ))}
                    </select>
                  </div>

                  {parcelaSeleccionada && (
                    <p style={{ fontSize: 12, color: "#777", margin: 0 }}>
                      Seleccionada: {parcelaSeleccionada.nombre || `Parcela ${parcelaId}`} (ID {parcelaId})
                    </p>
                  )}
                  {cargandoConfig && <p style={{ color: "#666" }}>Consultando configuración...</p>}
                  {!cargandoConfig && parcelaId && !errorCargaConfig && !configExiste && (
                    <p style={{ color: "#7A651C", fontSize: 13 }}>
                      Esta parcela aún no tiene configuración. Introduce ambos umbrales antes de guardar.
                    </p>
                  )}

                  <div style={styles.row}>
                    <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                      <div style={styles.iconBadge}>💧</div>
                      <div>
                        <div style={styles.itemTitle}>Humedad mínima del suelo (%)</div>
                        <div style={styles.itemDesc}>Alerta cuando la humedad está por debajo del umbral.</div>
                      </div>
                    </div>
                    <input type="number" min="0" max="100" step="0.1"
                      style={styles.textInput} aria-label="Humedad mínima del suelo"
                      value={formulario.humedad_suelo_min}
                      onChange={(e) => actualizarCampo("humedad_suelo_min", e.target.value)}
                      disabled={!parcelaId || cargandoConfig || guardando || Boolean(errorCargaConfig)}
                      placeholder="0 a 100" />
                  </div>

                  <div style={styles.row}>
                    <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                      <div style={styles.iconBadge}>🌡️</div>
                      <div>
                        <div style={styles.itemTitle}>Temperatura mínima (°C)</div>
                        <div style={styles.itemDesc}>Alerta si la temperatura está por debajo del umbral; no es un límite máximo.</div>
                      </div>
                    </div>
                    <input type="number" min="-50" max="60" step="0.1"
                      style={styles.textInput} aria-label="Temperatura mínima"
                      value={formulario.temperatura_min}
                      onChange={(e) => actualizarCampo("temperatura_min", e.target.value)}
                      disabled={!parcelaId || cargandoConfig || guardando || Boolean(errorCargaConfig)}
                      placeholder="-50 a 60" />
                  </div>

                  <div style={styles.row}>
                    <div>
                      <div style={styles.itemTitle}>Correo de destino (opcional)</div>
                      <div style={styles.itemDesc}>Las notificaciones SMTP requieren el servicio de alertas activo.</div>
                    </div>
                    <input type="email" maxLength={255} style={{ ...styles.selectInput, width: 250 }}
                      value={formulario.correo_destino} onChange={(e) => actualizarCampo("correo_destino", e.target.value)}
                      disabled={!parcelaId || cargandoConfig || guardando || Boolean(errorCargaConfig)}
                      placeholder="correo@ejemplo.com" autoComplete="email" />
                  </div>

                  <div style={styles.row}>
                    <div>
                      <div style={styles.itemTitle}>Tiempo mínimo entre alertas</div>
                      <div style={styles.itemDesc}>Evita notificaciones repetidas sobre un mismo evento.</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="number" min="1" max="10080" step="1" style={styles.textInput}
                        aria-label="Minutos entre alertas"
                        value={formulario.cooldown_minutos} onChange={(e) => actualizarCampo("cooldown_minutos", e.target.value)}
                        disabled={!parcelaId || cargandoConfig || guardando || Boolean(errorCargaConfig)} />
                      <span style={{ color: "#777", fontSize: 13 }}>min</span>
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div>
                      <div style={styles.itemTitle}>Alertas habilitadas</div>
                      <div style={styles.itemDesc}>Habilitar no envía correos de prueba; solo guarda la configuración.</div>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={formulario.activa}
                        onChange={(e) => actualizarCampo("activa", e.target.checked)}
                        disabled={!parcelaId || cargandoConfig || guardando || Boolean(errorCargaConfig)} />
                      <span>{formulario.activa ? "Sí" : "No"}</span>
                    </label>
                  </div>

                  {errorCargaConfig && <p role="alert" style={{ color: "#b42318", fontWeight: 600 }}>No se pudo consultar la configuración: {errorCargaConfig}. Cambia de parcela o recarga la página para reintentar.</p>}
                </section>

                <section style={styles.section}>
                  <h3 style={styles.sectionTitle}>Gestión de dispositivos / hardware</h3>
                  <p style={styles.sectionDesc}>
                    Nodos registrados en MySQL para la parcela seleccionada. Registrar o cambiar identificadores
                    requiere coordinar el firmware y las API keys para no interrumpir la telemetría.
                  </p>
                  <div style={styles.row}>
                    <div>
                      <div style={styles.itemTitle}>Nodo de suelo</div>
                      <div style={styles.itemDesc}>Selecciona un nodo para renombrarlo o consultar su estado. Los controles físicos siguen deshabilitados.</div>
                    </div>
                    <select style={styles.selectInput} value={nodoId}
                      onChange={(e) => setNodoId(e.target.value)}
                      disabled={nodosSuelo.length === 0} aria-label="Seleccionar nodo">
                      {nodosSuelo.length === 0 && <option value="">Sin nodos de suelo</option>}
                      {nodosSuelo.map((n) => <option key={n.id} value={String(n.id)}>{n.identificador}</option>)}
                    </select>
                  </div>

                  <div style={styles.row}>
                    <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                      <div style={styles.iconBadgeLight}>➕</div>
                      <div><div style={styles.itemTitle}>Agregar nuevo nodo</div>
                      <div style={styles.itemDesc}>Registro real en MySQL; el backend genera una clave API que debes entregar al dispositivo.</div></div>
                    </div>
                    <button type="button" disabled={!parcelaId || guardandoNodo} style={{ ...styles.saveBtn, opacity: parcelaId ? 1 : 0.5 }} onClick={() => { setAccionNodo(accionNodo === "crear" ? "" : "crear"); setErrorNodo(""); setExitoNodo(""); setApiKeyNuevoNodo(""); setIdentificadorNodo(""); }}>+ Nuevo nodo</button>
                  </div>
                  <div style={styles.row}>
                    <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                      <div style={styles.iconBadgeLight}>📝</div>
                      <div><div style={styles.itemTitle}>Renombrar nodo</div>
                      <div style={styles.itemDesc}>Actualiza el identificador en MySQL; requiere coordinarlo con firmware e histórico.</div></div>
                    </div>
                    <button type="button" disabled={!nodoId || guardandoNodo} style={{ ...styles.saveBtn, opacity: nodoId ? 1 : 0.5 }} onClick={() => { setAccionNodo(accionNodo === "editar" ? "" : "editar"); setErrorNodo(""); setExitoNodo(""); setApiKeyNuevoNodo(""); setIdentificadorNodo(nodosSuelo.find(n => String(n.id) === String(nodoId))?.identificador || ""); }}>Renombrar</button>
                  </div>
                  {accionNodo && (
                    <div style={{ background: "#f5faef", padding: 15, borderRadius: 9, border: "1px solid #d5e4c9", display: "grid", gap: 10 }}>
                      <strong>{accionNodo === "crear" ? "Registrar nodo" : "Renombrar nodo seleccionado"}</strong>
                      <label>Identificador del dispositivo
                        <input value={identificadorNodo} onChange={e => setIdentificadorNodo(e.target.value)} maxLength={64} placeholder="nodo-nuevo-05" style={{ ...styles.selectInput, display: "block", marginTop: 4, width: "100%", boxSizing: "border-box" }} />
                      </label>
                      {accionNodo === "crear" && <label>Tipo de dispositivo
                        <select value={tipoNuevoNodo} onChange={e => setTipoNuevoNodo(e.target.value)} style={{ ...styles.selectInput, display: "block", marginTop: 4 }}><option value="sensor_suelo">Sensor de suelo</option><option value="estacion">Estación meteorológica</option></select>
                      </label>}
                      <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" disabled={guardandoNodo} onClick={guardarNodo} style={styles.saveBtn}>{guardandoNodo ? "Guardando..." : "Confirmar"}</button>
                        <button type="button" onClick={() => setAccionNodo("")} style={styles.cancelBtn}>Cancelar</button>
                      </div>
                    </div>
                  )}
                  {errorNodo && <p role="alert" style={{ color: "#b42318" }}>{errorNodo}</p>}
                  {exitoNodo && <p role="status" style={{ color: "#2F5413" }}>{exitoNodo}</p>}
                  {apiKeyNuevoNodo && (
                    <div style={{ padding: 12, border: "2px solid #bcd5aa", borderRadius: 8, overflowWrap: "anywhere" }}>
                      <strong>API key del nuevo nodo — copiar ahora, no volverá a mostrarse:</strong>
                      <p><code>{apiKeyNuevoNodo}</code></p>
                      <button type="button" onClick={() => navigator.clipboard.writeText(apiKeyNuevoNodo)} style={styles.saveBtn}>Copiar API key</button>
                      <p style={{ fontSize: 12 }}>Guárdala de forma segura y configúrala en el ESP32 correspondiente; no se activa hardware automáticamente.</p>
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: "#777" }}>
                    Nodos en la parcela: {nodosParcela.length} (incluidas estaciones meteorológicas). <Link to="/gestion" style={{color:"#2F5413",fontWeight:"bold",marginLeft:12}}>Gestionar parcelas, estado y bajas →</Link>
                  </div>
                </section>

                <section style={styles.section}>
                  <h3 style={styles.sectionTitle}>Actualización del Dashboard</h3>
                  <p style={styles.sectionDesc}>Elige cada cuánto consulta el navegador las mediciones más recientes. Esto no modifica la frecuencia física de envío del ESP32.</p>
                  <div style={styles.row}>
                    <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                      <div style={styles.iconBadgeLight}>🕒</div>
                      <div style={styles.itemTitle}>Intervalo de actualización</div>
                    </div>
                    <select style={styles.selectInputSmall} value={intervaloPantalla} onChange={e => { const segundos = Number(e.target.value); setIntervaloPantalla(segundos); localStorage.setItem("agroia_intervalo_pantalla", String(segundos)); }}>
                      <option value={15}>Cada 15 segundos</option>
                      <option value={30}>Cada 30 segundos</option>
                      <option value={60}>Cada 60 segundos</option>
                      <option value={120}>Cada 2 minutos</option>
                    </select>
                  </div>
                </section>
              </div>
            )}

            {/* Feedback justo al lado del botón, siempre visible tras el clic. */}
            {errorConfig && (
              <p role="alert" style={{ color: "#b42318", fontWeight: 600, marginTop: 24, textAlign: "right" }}>
                {errorConfig}
              </p>
            )}
            {mensaje && (
              <p role="status" aria-live="polite" style={{ color: "#2F5413", fontWeight: 600, marginTop: 24, textAlign: "right" }}>
                {mensaje}
              </p>
            )}
            <div style={styles.actionButtons}>
              <button type="button" style={styles.cancelBtn} onClick={handleCancelar}>Volver</button>
              <button
                type="button"
                onClick={guardarConfiguracion}
                disabled={
                  !hayCambios ||
                  !parcelaId ||
                  cargandoInicial ||
                  cargandoConfig ||
                  guardando ||
                  Boolean(errorInicial) ||
                  Boolean(errorCargaConfig)
                }
                style={{
                  ...styles.saveBtn,
                  opacity: !hayCambios || guardando ? 0.5 : 1,
                  cursor:
                    !hayCambios || guardando
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {guardando
                  ? "Guardando..."
                  : !hayCambios && configExiste
                    ? "Cambios guardados"
                    : "Guardar configuración de alertas"}
              </button>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const styles = {
  // CAMBIO: Ocupa toda la pantalla, sin márgenes ni bordes redondeados
  app: {
    display: "flex",
    maxWidth: "100%",
    minHeight: "100vh",
    margin: 0,
    background: "#fcfafc",
    fontFamily: "sans-serif"
  },

  // CAMBIO: Transición suave para width y min-width
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

  // CAMBIO: minWidth: 0 para evitar desbordes
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

  leftGreyBar: { width: 60, backgroundColor: "#e4e4e4", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" },
  main: { flex: 1, padding: "30px 40px", overflowY: "auto", overflowX: "auto" },
  pageTitle: { margin: "0 0 5px 0", fontSize: 24, fontWeight: "500", color: "#222" },
  pageSubtitle: { margin: "0 0 30px 0", fontSize: 14, color: "#888" },
  configContainer: { display: "flex", flexDirection: "column", gap: 30 },
  section: { display: "flex", flexDirection: "column", gap: 15 },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: "bold", color: "#222" },
  sectionDesc: { margin: "0 0 10px 0", fontSize: 13, color: "#888" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", flexWrap: "wrap", gap: 10 },
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
