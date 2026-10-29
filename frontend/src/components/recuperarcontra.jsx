import { useEffect, useState } from "react";
import logoImg from "../assets/agroia-logo.png";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

export default function RecuperarContra({ isOpen, onClose }) {
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCorreo("");
      setMensaje("");
      setError("");
      setCargando(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const enviar = async (evento) => {
    evento.preventDefault();
    if (cargando) return;
    setError("");
    setMensaje("");
    setCargando(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/auth/recuperar-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim().toLowerCase() }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo procesar la solicitud.");
      }
      setMensaje(datos.mensaje || "Si la cuenta existe, recibirás un correo.");
    } catch (err) {
      setError(err.message || "Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="titulo-recuperacion">
        <img src={logoImg} alt="AgroIA" className="modal-logo" />
        <h3 id="titulo-recuperacion" className="modal-title">Recuperar contraseña</h3>
        <p className="modal-text">
          Introduce el correo registrado. Si existe una cuenta activa, te enviaremos un enlace válido durante 20 minutos.
        </p>
        {mensaje ? (
          <p className="modal-text" role="status">{mensaje}</p>
        ) : (
          <form onSubmit={enviar} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <label htmlFor="correo-recuperacion" style={{ textAlign: "left", fontSize: 13 }}>
              Correo electrónico
            </label>
            <input
              id="correo-recuperacion"
              type="email"
              required
              maxLength={150}
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="usuario@correo.com"
              className="login-input"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            {error && <p role="alert" style={{ color: "#b42318", margin: 0 }}>{error}</p>}
            <button type="submit" className="modal-btn-enviar" disabled={cargando}>
              {cargando ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>
        )}
        <button
          type="button"
          className="modal-btn-enviar"
          onClick={onClose}
          style={{ marginTop: 12, backgroundColor: "#eef2e6", color: "#2F5413" }}
        >
          Volver a iniciar sesión
        </button>
      </div>
    </div>
  );
}
