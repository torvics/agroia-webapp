import logoImg from "../assets/agroia-logo.png";

// El backend de recuperación de contraseña no está incluido en esta versión.
// Mostrar una explicación real en lugar de afirmar que se envió un correo.
export default function RecuperarContra({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <img src={logoImg} alt="AgroIA" className="modal-logo" />
        <h3 className="modal-title">Recuperar contraseña</h3>
        <p className="modal-text" role="status">
          La recuperación automática por correo todavía no está disponible.
          Para restablecer tu acceso, solicita ayuda al administrador de AgroIA.
        </p>
        <button type="button" className="modal-btn-enviar" onClick={onClose}>
          Volver a iniciar sesión
        </button>
      </div>
    </div>
  );
}
