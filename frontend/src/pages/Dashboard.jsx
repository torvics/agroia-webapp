import { useEffect, useState } from "react";
import api from "../services/api";

export default function Dashboard({ usuario, onLogout }) {
  const [parcelas, setParcelas] = useState([]);

  useEffect(() => {
    api.get("/parcelas").then((res) => setParcelas(res.data)).catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Bienvenido, {usuario.nombre}</h1>
        <button onClick={onLogout}>Cerrar sesión</button>
      </div>
      <p>Rol: {usuario.rol}</p>

      <h3>Tus parcelas</h3>
      {parcelas.length === 0 && <p>Aún no tienes parcelas registradas.</p>}
      <ul>
        {parcelas.map((p) => (
          <li key={p.id}>{p.nombre} — {p.ubicacion}</li>
        ))}
      </ul>
    </div>
  );
}
