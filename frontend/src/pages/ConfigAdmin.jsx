import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const DATOS_GENERALES = { clima: { temperatura: 36 } };



export default function ConfigAdmin() {
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token"); // ← ver nota abajo
    fetch("http://localhost:5000/api/usuarios", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (r.status === 401) { navigate("/login"); throw new Error("Sesión expirada"); }
        if (r.status === 403) throw new Error("Solo un administrador puede ver esto");
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then(setUsuarios)
      .catch((e) => setError(e.message));
  }, [navigate]);


  return (
    <div style={styles.app}>

      {/* HEADER */}
      <header style={styles.banner}>
        <div style={styles.brand}>
          <span style={{ fontSize: 28 }}>🌱</span>
          <div>
            <h1 style={styles.brandTitle}>Agro IA</h1>
            <small style={styles.brandSubtitle}>RIEGO INTELIGENTE</small>
          </div>
        </div>
        <div style={styles.bannerRight}>
          <div style={styles.tempBadge}>{DATOS_GENERALES.clima.temperatura} °C</div>
          <div style={styles.iconCircle}>🔔</div>
          <div style={styles.iconCircle}>👤</div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main style={styles.main}>

        {/* TARJETA 1: USUARIOS Y ROLES */}
        <div style={styles.card}>
          <div style={styles.cardHeaderFlex}>
            <div>
              <h2 style={styles.cardTitle}>Usuarios y roles</h2>
              <p style={styles.cardSubtitle}>Administra qué usuarios tienen acceso y con qué rol</p>
            </div>
            <button style={styles.btnNuevo}>+ Nuevo usuario</button>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Usuario</th>
                <th style={styles.th}>Correo</th>
                <th style={styles.th}>Rol</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {error && <tr><td style={styles.td} colSpan={4}>{error}</td></tr>}
              {usuarios.map((user) => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>{user.nombre}</td>
                  <td style={styles.td}>{user.correo}</td>
                  <td style={styles.td}>{user.rol}</td>
                  <td style={styles.td}>{user.activo ? "Activo" : "Inactivo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TARJETA 2: REPORTES DE CICLOS */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Reportes de ciclos</h2>
          <p style={styles.cardSubtitle}>Genera un reporte descargable del ciclo de riego seleccionado</p>

          <div style={styles.reportesFlex}>
            <select style={styles.selectInput}>
              <option>Ciclo 12 — Parcela norte (1-15 sep)</option>
              <option>Ciclo 11 — Parcela sur (15-31 ago)</option>
            </select>

            <button style={styles.btnDescarga}>⬇ Descargar PDF</button>
            <button style={styles.btnDescarga}>⬇ Descargar CSV</button>
          </div>
        </div>

        {/* BOTÓN VOLVER */}
        <div style={{ marginTop: "20px" }}>
          <button style={styles.btnVolver} onClick={() => navigate("/dashboard")}>
            Volver a inicio
          </button>
        </div>

      </main>
    </div>
  );
}

const styles = {
  app: { display: "flex", flexDirection: "column", maxWidth: 1150, minHeight: 800, margin: "20px auto", background: "#fcfafc", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.15)", fontFamily: "sans-serif" },
  banner: { background: "#7A9D54", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 30px" },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandTitle: { margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 900, textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  brandSubtitle: { display: "block", fontSize: 10, letterSpacing: 1, opacity: 0.9 },
  bannerRight: { display: "flex", alignItems: "center", gap: 14 },
  tempBadge: { background: "rgba(0,0,0,0.3)", padding: "6px 14px", borderRadius: 20, fontWeight: 600 },
  iconCircle: { width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },

  main: { padding: "30px 40px", display: "flex", flexDirection: "column", gap: "25px" },

  card: { backgroundColor: "#fff", borderRadius: 8, padding: "25px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eaeaea" },
  cardHeaderFlex: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  cardTitle: { margin: "0 0 5px 0", fontSize: 18, fontWeight: "bold", color: "#222" },
  cardSubtitle: { margin: 0, fontSize: 13, color: "#777" },

  btnNuevo: { backgroundColor: "#4f863b", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 13 },

  table: { width: "100%", borderCollapse: "collapse", marginTop: "10px" },
  th: { textAlign: "left", padding: "12px 10px", borderBottom: "1px solid #ddd", color: "#666", fontSize: 13, fontWeight: "bold" },
  tr: { borderBottom: "1px solid #eee" },
  td: { padding: "12px 10px", color: "#333", fontSize: 14 },

  reportesFlex: { display: "flex", alignItems: "center", gap: "15px", marginTop: "20px" },
  selectInput: { padding: "10px 15px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, color: "#333", minWidth: "280px", outline: "none" },
  btnDescarga: { backgroundColor: "#fff", color: "#4f863b", border: "1px solid #4f863b", padding: "10px 16px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 13, transition: "background 0.2s" },

  btnVolver: { backgroundColor: "#355e2b", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 15 }
};