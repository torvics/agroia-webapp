import { useState } from "react";
import logoImg from "../assets/agroia-logo.png";
import "./Login.css"; 
import RecuperarContra from "../components/recuperarcontra";
import { mostrarError } from "../utils/dialogos";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

export default function Login({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargando) return;
    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        mostrarError("No se pudo iniciar sesión", data.error || "Credenciales inválidas");
        return;
      }

      // "access_token" lo lee ConfigAdmin; "token" lo dejo por si App.jsx lo usa
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("rol", data.rol);
      localStorage.setItem("nombre", data.nombre);

      onLogin(data); // data trae access_token, rol y nombre
    } catch {
      mostrarError("No se pudo iniciar sesión", "No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="left-panel">
          <div className="logo-container">
            <img src={logoImg} alt="AgroIA Logo" className="logo-image" />
          </div>
        </div>

        <div className="right-panel">
          <h2 className="login-title">LOG IN</h2>
          
          <form onSubmit={handleSubmit} className="login-form">
            <input
              type="email"
              placeholder="tu correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="login-input"
              autoComplete="email"
              aria-label="Correo electrónico"
            />
            <input
              type="password"
              placeholder="****"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />
            
            <button type="submit" className="login-button" disabled={cargando}>
              {cargando ? "ENTRANDO..." : "INICIAR SESIÓN"}
            </button>

          </form>

          <div className="recover-container">
            <span className="recover-text">¿Olvidó su contraseña? </span>
            <button type="button" className="recover-link" onClick={() => setModalAbierto(true)}>
              Recupérala
            </button>
          </div>
        </div>
      </div>

      <RecuperarContra 
        isOpen={modalAbierto} 
        onClose={() => setModalAbierto(false)} 
      />
    </div>
  );
}