import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import "./fechas.css";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Impedir la edición manual de los campos de fecha
const esCampoFecha = (elemento) => {
  return (
    elemento instanceof HTMLInputElement &&
    ["date", "datetime-local"].includes(elemento.type)
  );
};

const impedirEdicionFecha = (evento) => {
  if (!esCampoFecha(evento.target)) return;

  // Permitir navegar entre campos y salir del selector
  if (
    evento.type === "keydown" &&
    ["Tab", "Escape"].includes(evento.key)
  ) {
    return;
  }

  // Bloquear escritura, pegado y arrastre
  evento.preventDefault();
};

document.addEventListener(
  "keydown",
  impedirEdicionFecha,
  true
);

document.addEventListener(
  "paste",
  impedirEdicionFecha,
  true
);

document.addEventListener(
  "drop",
  impedirEdicionFecha,
  true
);