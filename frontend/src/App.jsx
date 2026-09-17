import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const [usuario, setUsuario] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUsuario(null);
  };

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return <Dashboard usuario={usuario} onLogout={handleLogout} />;
}

export default App;
