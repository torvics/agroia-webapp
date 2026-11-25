import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import logoAgroIA from "../assets/agroia-logo.png";
import Notificaciones from "../components/AvisosPanel";
import MapaParcela from "../components/MapaParcela";
import TipoRiegoSelector from "../components/TipoRiegoSelector";
import TemperaturaUbicacion from "../components/TemperaturaUbicacion";
import { finDiaApp, hoyApp, inicioDiaApp, sumarDias, validarRangoFechas } from "../utils/fechas";
import { mostrarError, mostrarExito } from "../utils/dialogos";
const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

const DATOS_VACIOS = {
  clima: { temperatura: null },
  nodos: [],
  ambiente: {
    humedad: null,
    temperatura: null,
  },
  suelo: {
    humedadPromedio: null,
    temperaturaPromedio: null,
  },
  riego: {
    tipo: null,
    dds: null,
    lluviaActual: null,
    lluviaAcumulada: null,
  },
  historial: {
    rojo: [],
    azul: [],
    verde: [],
  },
};
async function consultarAPI(ruta, signal) {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");
  if (!token) {
    throw new Error("No hay una sesión activa.");
  }
  const respuesta = await fetch(`${API_URL}/api${ruta}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
  if (!respuesta.ok) {
    // Mostrar el mensaje del backend (p. ej. 503 «InfluxDB no disponible»).
    const datos = await respuesta.json().catch(() => ({}));
    throw new Error(
      datos.error || datos.msg || `Error HTTP ${respuesta.status} al consultar ${ruta}`
    );
  }
  return respuesta.json();
}
function Gauge({ label, value, max = 100, unit = "%", color = "#3fb6b6" }) {
  const disponible = typeof value === "number" && Number.isFinite(value);
  const pct = disponible
    ? Math.max(0, Math.min(100, (value / max) * 100))
    : 0;
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
          {disponible ? value : "—"}
          {disponible && <span style={{ fontSize: 10 }}>{unit}</span>}
        </div>
      </div>
      <div style={styles.gaugeScale}>
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
function LineChart({ nodos = [] }) {
  const colores = [
    "#8a5cd6",
    "#3fb6b6",
    "#2f7bd6",
    "#a3c93f",
    "#e05252",
  ];
  const ancho = 620;
  const alto = 230;
  const margen = { izquierda: 45, derecha: 15, arriba: 15, abajo: 42 };
  const series = nodos
    .map((nodo, indice) => ({
      nombre: nodo.identificador || `Nodo ${nodo.nodo_id}`,
      color: colores[indice % colores.length],
      puntos: (nodo.lecturas ?? [])
        .filter(
          (lectura) =>
            typeof lectura.humedad_suelo === "number" &&
            Number.isFinite(lectura.humedad_suelo) &&
            lectura.humedad_suelo >= 0 &&
            lectura.humedad_suelo <= 100 &&
            Number.isFinite(Date.parse(lectura.fecha))
        )
        .map((lectura) => ({
          fecha: new Date(lectura.fecha).getTime(),
          humedad: lectura.humedad_suelo,
        }))
        .sort((a, b) => a.fecha - b.fecha),
    }))
    .filter((serie) => serie.puntos.length > 0);
  if (series.length === 0) {
    return (
      <p style={{ color: "#777", textAlign: "center" }}>
        No hay mediciones históricas para esta parcela.
      </p>
    );
  }
  const fechas = series.flatMap((serie) =>
    serie.puntos.map((punto) => punto.fecha)
  );
  const fechaMin = Math.min(...fechas);
  const fechaMax = Math.max(...fechas);
  const areaAncho = ancho - margen.izquierda - margen.derecha;
  const areaAlto = alto - margen.arriba - margen.abajo;
  const posicionX = (fecha) =>
    fechaMax === fechaMin
      ? margen.izquierda + areaAncho / 2
      : margen.izquierda +
        ((fecha - fechaMin) / (fechaMax - fechaMin)) * areaAncho;
  const posicionY = (humedad) =>
    margen.arriba + ((100 - humedad) / 100) * areaAlto;
  const formatoFecha = (fecha) =>
    new Date(fecha).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <div>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        width="100%"
        role="img"
        aria-label="Histórico de humedad del suelo"
      >
        {[0, 25, 50, 75, 100].map((valor) => (
          <g key={valor}>
            <line
              x1={margen.izquierda}
              x2={ancho - margen.derecha}
              y1={posicionY(valor)}
              y2={posicionY(valor)}
              stroke="#e9e9e9"
            />
            <text
              x={8}
              y={posicionY(valor) + 4}
              fontSize="11"
              fill="#777"
            >
              {valor}%
            </text>
          </g>
        ))}
        {series.map((serie) => (
          <g key={serie.nombre}>
            {serie.puntos.length > 1 && (
              <polyline
                points={serie.puntos
                  .map(
                    (punto) =>
                      `${posicionX(punto.fecha)},${posicionY(punto.humedad)}`
                  )
                  .join(" ")}
                fill="none"
                stroke={serie.color}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        ))}
        <text
          x={margen.izquierda}
          y={alto - 10}
          fontSize="11"
          fill="#777"
        >
          {formatoFecha(fechaMin)}
        </text>
        {fechaMax !== fechaMin && (
          <text
            x={ancho - margen.derecha}
            y={alto - 10}
            textAnchor="end"
            fontSize="11"
            fill="#777"
          >
            {formatoFecha(fechaMax)}
          </text>
        )}
      </svg>
      <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
        {series.map((serie) => (
          <span key={serie.nombre} style={{ fontSize: 12 }}>
            <span style={{ color: serie.color, fontWeight: "bold" }}>
              ●
            </span>{" "}
            {serie.nombre}
          </span>
        ))}
      </div>
    </div>
  );
}
// Controla el estado administrativo del nodo en MySQL, no las válvulas ni los relés.
function NodoToggle({ nodo, ocupado, onCambiar }) {
  const activo = nodo.estado === "activo";
  const enMantenimiento = nodo.estado === "mantenimiento";
  const bloqueado = ocupado || enMantenimiento;
  const nombre = nodo.identificador || `Nodo ${nodo.id}`;
  return (
    <div
      style={{ ...styles.nodoToggle, opacity: bloqueado ? 0.65 : 1 }}
      title={enMantenimiento
        ? `${nombre}: en mantenimiento; cambia su estado desde Gestionar.`
        : `${nombre}: ${activo ? "activo" : "inactivo"} en AgroIA. No controla el riego físico.`}
    >
      <span>{nombre}</span>
      <button
        type="button"
        role="switch"
        aria-label={`${activo ? "Desactivar" : "Activar"} ${nombre}`}
        aria-checked={activo}
        aria-busy={ocupado}
        disabled={bloqueado}
        onClick={() => onCambiar(nodo)}
        style={{
          ...styles.switch,
          background: activo ? "#7A9D54" : "#e0e0e0",
          border: "none",
          padding: 0,
          flexShrink: 0,
          cursor: bloqueado ? "not-allowed" : "pointer",
        }}
      >
        <span
          aria-hidden="true"
          style={{ ...styles.switchKnob, left: activo ? 20 : 2 }}
        />
      </button>
    </div>
  );
}
export default function Dashboard({ usuario, onLogout }) {
  const [datos, setDatos] = useState(DATOS_VACIOS);
  const [perfil, setPerfil] = useState(usuario ?? null);
  const [parcelas, setParcelas] = useState([]);
  const [parcelaId, setParcelaId] = useState(null);
  // Nodos registrados en MySQL
  const [nodosRegistrados, setNodosRegistrados] = useState([]);
  const [cargandoNodos, setCargandoNodos] = useState(true);
  const [errorNodos, setErrorNodos] = useState("");
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [errorDatos, setErrorDatos] = useState("");
  // Estados del histórico de humedad del suelo
  const [historicoNodos, setHistoricoNodos] = useState([]);
  const [cargandoHistorico, setCargandoHistorico] = useState(false);
  const [errorHistorico, setErrorHistorico] = useState("");
  const [mapaAbierto, setMapaAbierto] = useState(false);
  const [recargaManual, setRecargaManual] = useState(0);
  // Últimos siete días calendario por defecto, incluyendo el actual.
  const [fechaDesdeDashboard, setFechaDesdeDashboard] = useState(() =>
    sumarDias(hoyApp(), -6)
  );
  const [fechaHastaDashboard, setFechaHastaDashboard] = useState(() => hoyApp());
  const [nodoPendiente, setNodoPendiente] = useState(null);
  useEffect(() => {
    const controlador = new AbortController();
    const cargarNodosRegistrados = async () => {
      setCargandoNodos(true);
      setErrorNodos("");
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");
      if (!token) {
        setErrorNodos("No hay una sesión activa.");
        setNodosRegistrados([]);
        setCargandoNodos(false);
        return;
      }
      try {
        const respuesta = await fetch(`${API_URL}/api/nodos`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controlador.signal,
        });
        const resultado = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
          throw new Error(
            resultado.error ||
            resultado.msg ||
            `Error HTTP ${respuesta.status}`
          );
        }
        if (!Array.isArray(resultado)) {
          throw new Error("El servidor devolvió una lista de nodos no válida.");
        }
        if (!controlador.signal.aborted) {
          setNodosRegistrados(resultado);
        }
      } catch (error) {
        if (!controlador.signal.aborted) {
          setErrorNodos(error.message);
          setNodosRegistrados([]);
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoNodos(false);
        }
      }
    };
    cargarNodosRegistrados();
    return () => controlador.abort();
  }, [recargaManual]);
  // Cargar el perfil y las parcelas al entrar al dashboard.
  useEffect(() => {
    const controlador = new AbortController();
    async function cargarInicial() {
      try {
        const [respuestaPerfil, respuestaParcelas] =
          await Promise.all([
            consultarAPI("/auth/perfil", controlador.signal),
            consultarAPI("/parcelas", controlador.signal),
          ]);
        if (controlador.signal.aborted) return;
        setPerfil(respuestaPerfil.usuario ?? respuestaPerfil);
        const lista = Array.isArray(respuestaParcelas)
          ? respuestaParcelas
          : respuestaParcelas.parcelas ?? [];
        setParcelas(lista);
        setParcelaId(lista.length > 0 ? lista[0].id : null);
      } catch (error) {
        if (!controlador.signal.aborted) {
          setErrorDatos(error.message);
        }
      }
    }
    cargarInicial();
    return () => controlador.abort();
  }, []);
  // Cargar las mediciones de la parcela seleccionada.
  useEffect(() => {
    if (!parcelaId) return;
    const controlador = new AbortController();
    let consultando = false;
    // No vaciar las tarjetas durante las actualizaciones periódicas.
    setDatos(DATOS_VACIOS);
    async function cargarSensores() {
      if (consultando || controlador.signal.aborted) return;
      consultando = true;
      setCargandoDatos(true);
      setErrorDatos("");
      try {
        const [lecturas, lluvia] = await Promise.all([
          consultarAPI(
            `/sensores/actual?parcela_id=${parcelaId}`,
            controlador.signal
          ),
          consultarAPI(
            `/lluvia?parcela_id=${parcelaId}`,
            controlador.signal
          ),
        ]);
        if (controlador.signal.aborted) return;
        const estacion = lecturas.estacion ?? {};

        const nodos = (lecturas.nodos ?? [])
          .filter(nodo => nodosRegistrados.some(r => Number(r.id) === Number(nodo.nodo_id) && r.estado === "activo" && r.tipo === "sensor_suelo"))
          .map((nodo, index) => {
          // Obtener la fecha de la ultima medicion.
          const fechaMs = nodo.fecha_lectura
            ? Date.parse(nodo.fecha_lectura)
            : NaN;

          // Calcular cuanto tiempo ha pasado desde esa lectura.
          const edadMs = Date.now() - fechaMs;

          // Considerar reciente una lectura de hasta 5 minutos.
          const lecturaReciente =
            Number.isFinite(edadMs) &&
            edadMs >= 0 &&
            edadMs <= 5 * 60 * 1000;

          let estado = "Sin lecturas";

          if (Number.isFinite(fechaMs)) {
            estado = lecturaReciente
              ? "Lectura reciente"
              : "Lectura anterior";
          }

          return {
            id: nodo.nodo_id,
            nombre: nodo.identificador || `Nodo ${index + 1}`,
            humedad: nodo.humedad_suelo ?? null,
            temperatura: nodo.temp_suelo ?? null,
            bateria: nodo.bateria_pct ?? null,
            estado: estado,
          };
        });

        const promedio = (campo) => {
          const valores = nodos
            .map((nodo) => nodo[campo])
            .filter((valor) => Number.isFinite(valor));
          if (valores.length === 0) return null;
          const suma = valores.reduce(
            (total, valor) => total + valor,
            0
          );
          return Number((suma / valores.length).toFixed(2));
        };
        setDatos({
          ...DATOS_VACIOS,
          clima: {
            temperatura: estacion.temp_ambiente ?? null,
          },
          nodos,
          ambiente: {
            humedad: estacion.humedad_ambiente ?? null,
            temperatura: estacion.temp_ambiente ?? null,
          },
          suelo: {
            humedadPromedio: promedio("humedad"),
            temperaturaPromedio: promedio("temperatura"),
          },
          riego: {
            tipo: null,
            dds: estacion.dds ?? null,
            lluviaActual: lluvia.lectura_reciente
              ? lluvia.lluvia_mm ?? null
              : null,
            lluviaAcumulada: lluvia.lluvia_acum_mm ?? null,
          },
          historial: DATOS_VACIOS.historial,
        });
      } catch (error) {
        if (!controlador.signal.aborted) {
          setErrorDatos(error.message);
        }
      } finally {
        consultando = false;
        if (!controlador.signal.aborted) {
          setCargandoDatos(false);
        }
      }
    }
    cargarSensores();
    // El ESP32 publica cada 60 s; mantener los indicadores al día sin recargar la página.
    const intervaloGuardado = Number(localStorage.getItem("agroia_intervalo_pantalla"));
    const intervaloMs = [15,30,60,120].includes(intervaloGuardado) ? intervaloGuardado * 1000 : 60000;
    const intervalo = setInterval(cargarSensores, intervaloMs);
    return () => {
      clearInterval(intervalo);
      controlador.abort();
    };
  }, [parcelaId, recargaManual, nodosRegistrados]);
// Consultar histórico cuando cambia la parcela seleccionada
useEffect(() => {
  const controlador = new AbortController();
  setHistoricoNodos([]);
  setErrorHistorico("");
  if (!parcelaId) {
    setCargandoHistorico(false);
    return () => controlador.abort();
  }
  const errorRango = validarRangoFechas(fechaDesdeDashboard, fechaHastaDashboard);
  if (errorRango) {
    setErrorHistorico(errorRango);
    setCargandoHistorico(false);
    return () => controlador.abort();
  }
  async function cargarHistorico() {
    setCargandoHistorico(true);
    try {
      // El rango incluye ambos días completos en la zona horaria de la aplicación.
      const inicio = inicioDiaApp(fechaDesdeDashboard);
      const fin = finDiaApp(fechaHastaDashboard);
      const diasRango = (fin - inicio) / (1000 * 60 * 60 * 24);
      const intervaloAuto = diasRango <= 1 ? "raw" : diasRango <= 7 ? "15m" : "1h";

      const parametros = new URLSearchParams({
        parcela_id: parcelaId,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        intervalo: intervaloAuto,
      });
      const respuesta = await consultarAPI(
        `/sensores/historico?${parametros.toString()}`,
        controlador.signal
      );
      if (controlador.signal.aborted) return;
      setHistoricoNodos(
        Array.isArray(respuesta.nodos)
          ? respuesta.nodos
          : []
      );
    } catch (error) {
      if (!controlador.signal.aborted) {
        setErrorHistorico(error.message);
      }
    } finally {
      if (!controlador.signal.aborted) {
        setCargandoHistorico(false);
      }
    }
  }
  cargarHistorico();
  return () => controlador.abort();
}, [parcelaId, recargaManual, fechaDesdeDashboard, fechaHastaDashboard]);
  // Estado que controla si la barra está abierta o cerrada (empieza en false)
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  // Estado para el menú de usuario
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Enlaces desde MySQL de los sensores de suelo de la parcela seleccionada.
  // GET /api/nodos respeta los permisos del usuario en Flask.

  const nodosParcela = nodosRegistrados.filter(
    (nodo) =>
      parcelaId !== null &&
      parcelaId !== undefined &&
      Number(nodo.parcela_id) === Number(parcelaId) &&
      nodo.tipo !== "estacion" &&
      nodo.estado === "activo"
  );

  // Incluir también los inactivos para que puedan reactivarse sin salir del Dashboard.
  // Los sensores en mantenimiento se muestran, pero su cambio se administra en Gestión.
  const nodosControl = nodosRegistrados.filter(
    (nodo) =>
      parcelaId != null &&
      Number(nodo.parcela_id) === Number(parcelaId) &&
      nodo.tipo === "sensor_suelo"
  );
  // Filtrar las mediciones históricas de los nodos activos.
const idsNodosActivos = new Set(
  nodosControl
    .filter((nodo) => nodo.estado === "activo")
    .map((nodo) => Number(nodo.id))
);

  const historicoNodosActivos = historicoNodos.filter(
    (nodo) => idsNodosActivos.has(Number(nodo.nodo_id))
  );

  const cambiarEstadoNodo = async (nodo) => {
    if (nodoPendiente !== null || !["activo", "inactivo"].includes(nodo.estado)) return;
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!token) {
      mostrarError("No se pudo actualizar el nodo", "La sesión ha caducado. Inicia sesión nuevamente.");
      return;
    }
    const estadoNuevo = nodo.estado === "activo" ? "inactivo" : "activo";
    setNodoPendiente(nodo.id);
    try {
      const respuesta = await fetch(`${API_URL}/api/nodos/${nodo.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: estadoNuevo }),
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(resultado.error || resultado.msg || `Error HTTP ${respuesta.status}`);
      }
      if (resultado.estado !== estadoNuevo || Number(resultado.id) !== Number(nodo.id)) {
        throw new Error("El servidor no confirmó el cambio de estado del nodo.");
      }
      setNodosRegistrados((previos) => previos.map((actual) =>
        Number(actual.id) === Number(nodo.id) ? { ...actual, estado: estadoNuevo } : actual
      ));
      mostrarExito("Estado del nodo actualizado", `${nodo.identificador || `Nodo ${nodo.id}`} ahora está ${estadoNuevo}. No controla las bombas ni las válvulas.`);
    } catch (error) {
      mostrarError("No se pudo actualizar el nodo", error);
    } finally {
      setNodoPendiente(null);
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  return (
    <div style={styles.app}>
      {/* Estilos de impresión: ocultan todo menos el reporte */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-imprimir { display: none !important; }
        }
      `}</style>
      {/* SIDEBAR DESPLEGABLE CON NUEVO DISEÑO */}
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
            <Link to="/gestion" style={styles.sidebarLink}>Parcelas y nodos</Link>
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarSectionTitle}>NODOS</div>
            {cargandoNodos ? (
              <span style={{ padding: "10px 20px", color: "#777", fontSize: 13 }}>
                Cargando nodos...
              </span>
            ) : errorNodos ? (
              <span style={{ padding: "10px 20px", color: "#b42318", fontSize: 12, whiteSpace: "normal" }}>
                {errorNodos}
              </span>
            ) : nodosParcela.length === 0 ? (
              <span style={{ padding: "10px 20px", color: "#777", fontSize: 13, whiteSpace: "normal" }}>
                No hay nodos de suelo registrados en esta parcela.
              </span>
            ) : (
              nodosParcela.map((nodo) => (
                <Link
                  key={nodo.id}
                  to={`/nodos/${nodo.id}`}
                  style={
                    location.pathname === `/nodos/${nodo.id}`
                      ? styles.sidebarLinkActive
                      : styles.sidebarLink
                  }
                >
                  {nodo.identificador || `Nodo ${nodo.id}`}
                </Link>
              ))
            )}
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
            <TemperaturaUbicacion style={styles.tempBadge} />
            <Notificaciones parcelaId={parcelaId} style={styles.iconCircle} />
            <div
              style={{ ...styles.iconCircle, cursor: "pointer" }}
              onClick={() => setMenuAbierto(!menuAbierto)}
            >
              👤
            </div>
            {menuAbierto && (
              <>
                {/* Capa invisible que ocupa toda la pantalla para detectar el clic fuera */}
                <div
                  style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 98 }}
                  onClick={() => setMenuAbierto(false)}
                />
                
                <div style={{ ...styles.userMenu, zIndex: 99 }}>
                  <div style={styles.userMenuHeader}>
                    <div style={styles.userMenuAvatar}>👤</div>
                    <div style={styles.userMenuInfo}>
                      <div style={styles.userMenuName}>
                        {/* Usa la variable correspondiente (usuario o perfil) según el archivo */}
                        {usuario?.nombre ?? "Usuario"}
                      </div>
                      <div style={styles.userMenuEmail}>
                        {usuario?.correo ?? ""}
                      </div>
                    </div>
                  </div>
                  <div style={styles.userMenuOptions}>
                    {usuario?.rol === "admin" && (
                      <div style={styles.userMenuOption} onClick={() => { navigate("/config-admin"); setMenuAbierto(false); }}>
                        <span style={styles.userMenuBullet}>•</span> Gestión de usuarios
                      </div>
                    )}
                    <div style={styles.userMenuOption} onClick={() => { navigate("/config-cuenta"); setMenuAbierto(false); }}>
                      <span style={styles.userMenuBullet}>•</span> Gestión de cuenta
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ ...styles.userMenuLogout, width: "100%", background: "transparent", borderLeft: "none", borderRight: "none", borderBottom: "none", color: "#fff", textAlign: "left" }}
                    onClick={handleLogout}
                  >🚪 Cerrar sesión</button>
                </div>
              </>
            )}
          </div>
        </header>
        <div className="no-imprimir" style={styles.toolbar}>
          {!sidebarAbierta && (
            <span
              style={{ fontSize: 24, cursor: "pointer", marginRight: 10 }}
              onClick={() => setSidebarAbierta(true)}
            >
              ☰
            </span>
          )}
          <button type="button" onClick={() => setMapaAbierto(true)} title="Ver mapa de la parcela" aria-label="Ver mapa de la parcela" style={{ ...styles.mapIconBorder, background: "#fff", cursor: "pointer" }}>
            <span style={{ fontSize: 24 }}>🗺️</span>
          </button>
          <div style={{ display: "flex", flexDirection: "column" }}>
              {parcelas.length > 1 ? (
                <select
                  value={parcelaId ?? ""}
                  onChange={(e) => setParcelaId(Number(e.target.value))}
                  aria-label="Seleccionar parcela"
                  style={{ fontSize: 16, fontWeight: 600, border: "1px solid #ccc", borderRadius: 6, padding: 4, maxWidth: 240 }}
                >
                  {parcelas.map((parcela) => (
                    <option key={parcela.id} value={parcela.id}>
                      {parcela.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <h2 style={{ margin: 0, fontSize: 16 }}>
                  {parcelas[0]?.nombre ?? "Sin parcelas"}
                </h2>
              )}
             <div style={styles.dots} aria-label="Nodos activos">
               {nodosParcela.map((n) => <Link key={n.id} to={`/nodos/${n.id}`} title={`Abrir ${n.identificador}`} style={{ ...styles.dot, background: datos.nodos.some(m => m.id === n.id && m.estado === "Lectura reciente") ? "#7A9D54" : "#c4c4c4" }} />)}
             </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 15 }}>
            <div style={styles.selectGroupContainer}>
              <span style={{ fontSize: 10, color: "#777", marginBottom: 2 }}>Tipo de Riego</span>
              <TipoRiegoSelector parcelaId={parcelaId} style={styles.select} />
            </div>
            {/* Filtro automático para el histórico. El calendario cambia la fecha sin botón Aplicar. */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
              aria-label="Filtrar histórico por fechas"
            >
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "#666" }}>
                Desde
                <input
                  type="date"
                  value={fechaDesdeDashboard}
                  max={fechaHastaDashboard < hoyApp() ? fechaHastaDashboard : hoyApp()}
                  onChange={(e) => setFechaDesdeDashboard(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Tab" && e.key !== "Escape") e.preventDefault();
                  }}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  style={{ width: 135, padding: "6px 7px", border: "1px solid #ccc", borderRadius: 6, background: "#fff" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "#666" }}>
                Hasta
                <input
                  type="date"
                  value={fechaHastaDashboard}
                  min={fechaDesdeDashboard}
                  max={hoyApp()}
                  onChange={(e) => setFechaHastaDashboard(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Tab" && e.key !== "Escape") e.preventDefault();
                  }}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  style={{ width: 135, padding: "6px 7px", border: "1px solid #ccc", borderRadius: 6, background: "#fff" }}
                />
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 480, overflowX: "auto", padding: "3px 0" }}>
              {nodosControl.map((nodo) => (
                <NodoToggle
                  key={nodo.id}
                  nodo={nodo}
                  ocupado={nodoPendiente !== null}
                  onCambiar={cambiarEstadoNodo}
                />
              ))}
            </div>
            <Link to="/gestion" style={{ ...styles.logoutBtn, textDecoration:"none", display:"inline-flex",alignItems:"center" }}>Gestionar</Link>
            <button type="button" onClick={() => setRecargaManual(x => x + 1)} style={styles.logoutBtn} disabled={cargandoDatos}>↻ Actualizar</button>
          </div>
        </div>
        {errorDatos && (
          <div role="alert" style={{ padding: "8px 18px", color: "#7a4a0c", background: "#fff6e8", fontSize: 13 }}>
            No se pudieron cargar las lecturas actuales: {errorDatos}
          </div>
        )}
        <main style={styles.main}>
          <h2 style={styles.sectionTitle}>Vista general</h2>
          <div style={styles.gaugeGrid}>
            {datos.nodos.map((n) => <Gauge key={n.id} label={`${n.nombre} Humedad`} value={n.humedad} color="#8a5cd6" />)}
            <Gauge label="Humedad Ambiente" value={datos.ambiente.humedad} color="#3fb6b6" />
            <Gauge label="Temp Ambiente" value={datos.ambiente.temperatura} unit="°C" color="#bbbbbb" />
          </div>
          <div style={styles.gaugeGrid}>
            {datos.nodos.map((n) => <Gauge key={n.id} label={`${n.nombre} Temperatura`} value={n.temperatura} unit="°C" color="#a3c93f" />)}
            <Gauge label="Humedad Suelo Prom." value={datos.suelo.humedadPromedio} color="#d63b3b" />
            <Gauge label="Temp Suelo Prom." value={datos.suelo.temperaturaPromedio} unit="°C" color="#bbbbbb" />
          </div>
          <div style={styles.gaugeGrid}>
            {datos.nodos.map((n) => <Gauge key={n.id} label={`${n.nombre} Batería`} value={n.bateria} color="#2f7bd6" />)}
          </div>
          <div style={styles.bottomSection}>
            <div style={styles.chartCard}>
              <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>
                Humedad del suelo - FILTRO ACTIVO
              </h3>
              {cargandoHistorico ? (
                <p style={{ textAlign: "center", color: "#777" }}>
                  Cargando mediciones históricas...
                </p>
              ) : errorHistorico ? (
                <p style={{ textAlign: "center", color: "#d63b3b" }}>
                  Error al cargar el histórico: {errorHistorico}
                </p>
              ) : (
                cargandoNodos ? (
                  <p style={{ textAlign: "center", color: "#777" }}>
                    Verificando nodos activos...
                  </p>
                ) : errorNodos ? (
                  <p role="alert" style={{ textAlign: "center", color: "#d63b3b" }}>
                    No se pudo verificar qué nodos están activos: {errorNodos}
                  </p>
                ) : idsNodosActivos.size === 0 ? (
                  <p style={{ textAlign: "center", color: "#777" }}>
                    No hay nodos activos en esta parcela.
                  </p>
                ) : (
                  <LineChart nodos={historicoNodosActivos} />
                )
              )}
            </div>
            <div style={styles.statsCol}>
              <div style={{ ...styles.statBox, border: "2px solid #2f7bd6" }}>
                <div style={styles.statLabel}>DDS</div>
                <div style={styles.statValue}>{datos.riego.dds ?? "—"}</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Lluvia actual</div>
                <div style={styles.statValue}>
                    {datos.riego.lluviaActual == null ? "—" : `${datos.riego.lluviaActual} mm`}
                  </div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statLabel}>Lluvia acumulada</div>
                <div style={styles.statValue}>
                    {datos.riego.lluviaAcumulada == null ? "—" : `${datos.riego.lluviaAcumulada} mm`}
                  </div>
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
      {mapaAbierto && <MapaParcela parcela={parcelas.find(p => Number(p.id) === Number(parcelaId))} onClose={() => setMapaAbierto(false)} />}
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
  toolbar: { display: "flex", alignItems: "center", gap: 15, padding: "14px 24px", borderBottom: "1px solid #eee", background: "#fff", flexWrap: "wrap" },
  mapIconBorder: { border: "2px solid #ccc", borderRadius: 12, padding: "4px 8px" },
  dots: { display: "flex", gap: 6, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: "50%", background: "#ddd", display: "inline-block" },
  selectGroupContainer: { border: "1px solid #ccc", borderRadius: 8, padding: "4px 8px", display: "flex", flexDirection: "column", background: "#fff" },
  select: { border: "none", outline: "none", background: "transparent", fontSize: 12 },
  nodoToggle: { display: "flex", flexDirection: "column", alignItems: "center", fontSize: 12, gap: 4 },
  switch: { width: 38, height: 20, borderRadius: 20, position: "relative", transition: "background 0.2s" },
  switchKnob: { content: "", position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" },
  logoutBtn: { padding: "6px 12px", cursor: "pointer", border: "1px solid #ccc", borderRadius: 6, background: "#f9f9f9" },
  main: {
    padding: "20px 24px 24px",
    background: "#f8f9fa",
    flex: 1,
    overflowX: "auto"
  },
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
