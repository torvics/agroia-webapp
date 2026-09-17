import { useState } from "react";
import api from "../services/api";
import "./Login.css";

import agroiaLogo from "../assets/agroia-logo.png";

export default function Login({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        correo,
        password,
      });

      localStorage.setItem("token", data.access_token);

      onLogin(data);
    } catch (err) {
      setError("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* =====================================
          PANEL IZQUIERDO
      ====================================== */}
      <section className="login-left">
        <img
          src={agroiaLogo}
          alt="AgroIA - Riego Inteligente"
          className="login-logo"
        />
      </section>

      {/* =====================================
          PANEL DERECHO
      ====================================== */}
      <section className="login-right">
        <div className="login-container">
          <h1 className="login-title">LOG IN</h1>

          <form onSubmit={handleSubmit} className="login-form">
            {/* Usuario */}
            <input
              type="text"
              placeholder="tu.usuario"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="username"
              className="login-input"
              required
            />

            {/* Contraseña */}
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="login-input"
              required
            />

            {/* Botón */}
            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "INGRESANDO..." : "INICIAR SESION"}
            </button>

            {/* Recuperar contraseña */}
            <div className="forgot-password">
              <span>¿Olvido su contraseña?</span>

              <button
                type="button"
                className="recover-button"
                onClick={() => {
                  console.log("Recuperar contraseña");
                }}
              >
                Recupérala
              </button>
            </div>

            {/* Error */}
            {error && <p className="login-error">{error}</p>}
          </form>
        </div>
      </section>
    </div>
  );
}