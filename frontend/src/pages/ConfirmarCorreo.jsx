import { useSearchParams, Link } from "react-router-dom";

export default function ConfirmarCorreo() {
  const [params] = useSearchParams();
  const confirmado = params.get("estado") === "confirmado";

  return (
    <main style={{ maxWidth: 520, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <h1>{confirmado ? "Correo confirmado" : "Enlace no válido"}</h1>
      <p>
        {confirmado
          ? "Tu cuenta ya está confirmada. Ahora puedes iniciar sesión."
          : "El enlace de confirmación es inválido, ya fue usado o ha caducado."}
      </p>
      <Link to="/login">Ir al inicio de sesión</Link>
    </main>
  );
}
