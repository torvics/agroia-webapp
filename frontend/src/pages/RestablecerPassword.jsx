import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import logoImg from "../assets/agroia-logo.png";
import "./Login.css";
import { validarPassword } from "../utils/validaciones";
import { mostrarError, mostrarExito } from "../utils/dialogos";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

export default function RestablecerPassword() {
  const [parametros] = useSearchParams();
  const token = parametros.get("token") || "";
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [completado, setCompletado] = useState(false);

  const guardar = async (evento) => {
    evento.preventDefault();
    if (cargando) return;
    const tituloError = "No se pudo cambiar la contraseña";
    const errorPassword = validarPassword(passwordNueva);
    if (errorPassword) {
      mostrarError(tituloError, errorPassword);
      return;
    }
    if (passwordNueva !== confirmacion) {
      mostrarError(tituloError, "Las contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/auth/restablecer-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password_nueva: passwordNueva }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(datos.error || "No fue posible cambiar la contraseña.");
      }
      setCompletado(true);
      mostrarExito("Contraseña actualizada", datos.mensaje || "Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
      setPasswordNueva("");
      setConfirmacion("");
      // Quitar el enlace secreto del historial visible del navegador.
      window.history.replaceState({}, "", "/restablecer-password");
    } catch (err) {
      mostrarError(tituloError, err.message || "No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="left-panel">
          <div className="logo-container">
            <img src={logoImg} alt="AgroIA" className="logo-image" />
          </div>
        </div>
        <div className="right-panel">
          <h2 className="login-title">Nueva contraseña</h2>
          {completado ? (
            <>
              <p style={{ textAlign: "center" }}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <Link to="/login" className="login-button" style={{ textDecoration: "none", textAlign: "center" }}>
                Ir a iniciar sesión
              </Link>
            </>
          ) : !token ? (
            <>
              <p role="alert" className="error-text">El enlace de recuperación no es válido.</p>
              <Link to="/login">Volver al inicio de sesión</Link>
            </>
          ) : (
            <form className="login-form" onSubmit={guardar}>
              <label htmlFor="password-nueva">Nueva contraseña (12 a 128 caracteres, con letras y números)</label>
              <input
                id="password-nueva"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                className="login-input"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
              />
              <label htmlFor="password-confirmar">Confirmar contraseña</label>
              <input
                id="password-confirmar"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                className="login-input"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
              />
              <button type="submit" className="login-button" disabled={cargando}>
                {cargando ? "Guardando..." : "Restablecer contraseña"}
              </button>
              <Link to="/login" style={{ textAlign: "center", marginTop: 8 }}>Volver al login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
