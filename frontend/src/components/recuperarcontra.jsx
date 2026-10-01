import { useState } from "react";
import logoImg from "../assets/agroia-logo.png";

export default function RecuperarContra({ isOpen, onClose }) {
  const [correo, setCorreo] = useState("");

  // Si isOpen es falso, no dibujamos la ventana modal
  if (!isOpen) return null; 

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Enlace enviado a " + correo);
    onClose(); // Cierra la ventanita después de enviar
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <img src={logoImg} alt="Agro IA" className="modal-logo" />
        
        <h3 className="modal-title">Recuperar contraseña</h3>
        <p className="modal-text">
          Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          <div className="modal-input-group">
            <label className="modal-label">Correo electronico</label>
            <input 
              type="email" 
              placeholder="nombre@ejemplo.com" 
              className="modal-input-recover"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="modal-btn-enviar">
            Enviar enlace
          </button>
        </form>

        <span 
          className="modal-back-link" 
          onClick={onClose}
        >
          ← Volver a iniciar sesión
        </span>
      </div>
    </div>
  );
}