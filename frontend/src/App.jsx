
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Componentes y páginas
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ConfigAdmin from "./pages/ConfigAdmin";
import ConfigCuenta from "./pages/ConfigCuenta";
import ConfigGeneral from "./pages/ConfigGeneral";
import RecuperarContra from "./components/recuperarcontra";
import Bitacoras from "./pages/Bitacoras";
import NodoDetalle from "./pages/NodoDetalle";
import GestionParcelasNodos from "./pages/GestionParcelasNodos";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

function limpiarSesion() {
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("rol");
  localStorage.removeItem("nombre");
}

function App() {
  const [usuario, setUsuario] = useState(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  // Recuperar la sesión al cargar o actualizar la página
  useEffect(() => {
    const controlador = new AbortController();

    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    if (!token) {
      setVerificandoSesion(false);
      return () => controlador.abort();
    }

    async function recuperarSesion() {
      try {
        const respuesta = await fetch(`${API_URL}/api/auth/perfil`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controlador.signal,
        });

        if (!respuesta.ok) {
          throw new Error("La sesión ya no es válida");
        }

        const perfil = await respuesta.json();

        if (!controlador.signal.aborted) {
          setUsuario(perfil.usuario ?? perfil);
        }
      } catch (error) {
        if (!controlador.signal.aborted) {
          limpiarSesion();
          setUsuario(null);
        }
      } finally {
        if (!controlador.signal.aborted) {
          setVerificandoSesion(false);
        }
      }
    }

    recuperarSesion();

    return () => controlador.abort();
  }, []);

  const handleLogout = () => {
    // Conservar el JWT para solicitar su revocación.
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    // Eliminar todas las credenciales locales.
    limpiarSesion();

    // Actualizar inmediatamente el estado de React.
    setUsuario(null);

    // Solicitar la revocación del JWT en Flask.
    if (token) {
      fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((respuesta) => {
          if (!respuesta.ok && respuesta.status !== 401) {
            console.warn(
              "No se pudo confirmar la revocación del JWT:",
              respuesta.status
            );
          }
        })
        .catch((error) => {
          console.warn(
            "Sesión local cerrada, pero no se pudo confirmar la revocación en Flask:",
            error
          );
        });
    }
  };

  // Evitar redirecciones mientras se comprueba el JWT
  if (verificandoSesion) {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        Verificando sesión...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta inicial */}
        <Route
          path="/"
          element={
            <Navigate
              to={usuario ? "/dashboard" : "/login"}
              replace
            />
          }
        />

        {/* Rutas públicas */}
        <Route
          path="/login"
          element={
            !usuario ? (
              <Login onLogin={setUsuario} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        <Route
          path="/recuperar-password"
          element={<Navigate to="/login" replace />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            usuario ? (
              <Dashboard
                usuario={usuario}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Pantallas de nodos */}

          <Route
            path="/nodos/:nodoId"
            element={
              usuario ? (
                <NodoDetalle
                  usuario={usuario}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />



        {/* Bitácoras */}
        <Route
          path="/Bitacoras"
          element={usuario ? <Bitacoras 
                                usuario={usuario}
                                onLogout={handleLogout}
                                /> : <Navigate to="/login" replace />}
        />

        <Route path="/gestion" element={usuario ? <GestionParcelasNodos usuario={usuario} onLogout={handleLogout}/> : <Navigate to="/login" replace/>} />

        {/* Configuración: solo administradores */}
        <Route
          path="/config-admin"
          element={
            !usuario ? (
              <Navigate to="/login" replace />
            ) : usuario.rol === "admin" ? (
              <ConfigAdmin onLogout={handleLogout} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* Configuración de cuenta */}
        <Route
          path="/config-cuenta"
          element={
            usuario ? <ConfigCuenta onLogout={handleLogout} /> : <Navigate to="/login" replace />
          }
        />

        {/* Configuración general */}
        <Route
          path="/config-general"
          element={
            usuario ? <ConfigGeneral usuario={usuario} onLogout={handleLogout} /> : <Navigate to="/login" replace />
          }
        />
        {/* Evitar pantallas vacías al abrir una ruta que no existe. */}
        <Route
          path="*"
          element={<Navigate to={usuario ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
