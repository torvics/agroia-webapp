import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Componentes y Páginas
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ConfigAdmin from "./pages/ConfigAdmin";
import ConfigCuenta from "./pages/ConfigCuenta";
import ConfigGeneral from "./pages/ConfigGeneral";
import Nodo1 from "./pages/Nodo1";
import Nodo2 from "./pages/Nodo2";
import Nodo3 from "./pages/Nodo3";
import Nodo4 from "./pages/Nodo4";
import RecuperarContra from "./components/recuperarcontra"; 

function App() {
  const [usuario, setUsuario] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUsuario(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<Navigate to={usuario ? "/dashboard" : "/login"} />} />
        
        <Route 
          path="/login" 
          element={!usuario ? <Login onLogin={setUsuario} /> : <Navigate to="/dashboard" />} 
        />
        
        <Route path="/recuperar-password" element={<RecuperarContra />} />

        {/* Rutas Protegidas */}
        <Route 
          path="/dashboard" 
          element={usuario ? <Dashboard usuario={usuario} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />

        {/* Nodos de sensores */}
        <Route path="/nodo1" element={usuario ? <Nodo1 /> : <Navigate to="/login" />} />
        <Route path="/nodo2" element={usuario ? <Nodo2 /> : <Navigate to="/login" />} />
        <Route path="/nodo3" element={usuario ? <Nodo3 /> : <Navigate to="/login" />} />
        <Route path="/nodo4" element={usuario ? <Nodo4 /> : <Navigate to="/login" />} />

        <Route path="/config-admin" element={usuario ? <ConfigAdmin /> : <Navigate to="/login" />} />
        <Route path="/config-cuenta" element={usuario ? <ConfigCuenta /> : <Navigate to="/login" />} />
        <Route path="/config-general" element={usuario ? <ConfigGeneral /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;