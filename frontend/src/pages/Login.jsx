import { useState } from "react";
import logoImg from "../assets/agroia-logo.png";
import "./Login.css"; 
// Importamos el nuevo componente que acabas de crear
import RecuperarContra from "../components/recuperarcontra"; 

export default function Login({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  // Estado para decirle al componente RecuperarContra si debe abrirse
  const [modalAbierto, setModalAbierto] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // Validación: TIENES que escribir "jose" y "1234" para que entre
    if (correo.trim() === "jose" && password === "1234") {
      const fakeData = { access_token: "mock-token-jose" };
      localStorage.setItem("token", fakeData.access_token);
      
      // Al ejecutar onLogin, tu App.jsx detecta el usuario y hace la redirección
      onLogin(fakeData); 
      return;
    } else {
      setError("Credenciales inválidas (Usa: jose y 1234)");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Panel Izquierdo */}
        <div className="left-panel">
          <div className="logo-container">
            <img src={logoImg} alt="AgroIA Logo" className="logo-image" />
            
          </div>
        </div>

        {/* Panel Derecho */}
        <div className="right-panel">
          <h2 className="login-title">LOG IN</h2>
          
          <form onSubmit={handleSubmit} className="login-form">
            <input
              type="text"
              placeholder="tu usuario"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="login-input"
            />
            <input
              type="password"
              placeholder="****"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />
            
            <button type="submit" className="login-button">
              INICIAR SESIÓN
            </button>

            {error && <p className="error-text">{error}</p>}
          </form>

          <div className="recover-container">
            <span className="recover-text">¿Olvidó su contraseña? </span>
            <span 
              className="recover-link" 
              onClick={() => setModalAbierto(true)}
            >
              Recupérala
            </span>
          </div>
        </div>
      </div>

      {/* Aquí mandamos a llamar a la mini ventana y le pasamos los controles */}
      <RecuperarContra 
        isOpen={modalAbierto} 
        onClose={() => setModalAbierto(false)} 
      />
    </div>
  );
}