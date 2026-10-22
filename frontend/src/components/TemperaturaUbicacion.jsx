import { useCallback, useEffect, useRef, useState } from "react";

const DIEZ_MINUTOS = 10 * 60 * 1000;

/**
 * Clima exterior estimado para la ubicación actual del navegador (Open-Meteo).
 * No utiliza la estación meteorológica de la parcela ni guarda coordenadas.
 * Se actualiza cada 10 minutos y admite reintento pulsando la insignia.
 */
export default function TemperaturaUbicacion({ style = {} }) {
  const [clima, setClima] = useState({ temperatura: null, fecha: null, error: "", consultando: true });
  const montado = useRef(false);
  const controlador = useRef(null);
  const permisoDenegado = useRef(false);

  const actualizar = useCallback((forzar = false) => {
    if (!montado.current || (permisoDenegado.current && !forzar)) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setClima({ temperatura: null, fecha: null, error: "La ubicación requiere HTTPS o localhost y un navegador compatible.", consultando: false });
      return;
    }

    permisoDenegado.current = false;
    controlador.current?.abort();
    const peticion = new AbortController();
    controlador.current = peticion;
    setClima(anterior => ({ ...anterior, consultando: true, error: "" }));

    navigator.geolocation.getCurrentPosition(
      async posicion => {
        if (!montado.current || peticion.signal.aborted) return;
        // Resolución de ~1 km, suficiente para consultar el clima; no se almacenan las coordenadas.
        const latitud = posicion.coords.latitude.toFixed(2);
        const longitud = posicion.coords.longitude.toFixed(2);
        const parametros = new URLSearchParams({
          latitude: latitud,
          longitude: longitud,
          current: "temperature_2m",
          forecast_days: "1",
        });
        const temporizador = setTimeout(() => peticion.abort(), 12000);
        try {
          const respuesta = await fetch(`https://api.open-meteo.com/v1/forecast?${parametros}`, {
            signal: peticion.signal,
            cache: "no-store",
          });
          if (!respuesta.ok) throw new Error(`Clima no disponible (HTTP ${respuesta.status}).`);
          const datos = await respuesta.json();
          const temperatura = Number(datos?.current?.temperature_2m);
          if (datos?.current?.temperature_2m == null || !Number.isFinite(temperatura)) {
            throw new Error("El servicio meteorológico no devolvió la temperatura actual.");
          }
          if (montado.current && !peticion.signal.aborted) {
            setClima({ temperatura, fecha: new Date(), error: "", consultando: false });
          }
        } catch (error) {
          if (montado.current && !peticion.signal.aborted) {
            setClima({ temperatura: null, fecha: null, error: error.message || "No se pudo consultar el clima.", consultando: false });
          }
        } finally {
          clearTimeout(temporizador);
        }
      },
      error => {
        if (!montado.current || peticion.signal.aborted) return;
        if (error.code === 1) permisoDenegado.current = true;
        const mensaje = error.code === 1
          ? "Permite la ubicación del navegador y pulsa aquí para reintentar."
          : "No se pudo detectar tu ubicación. Pulsa aquí para reintentar.";
        setClima({ temperatura: null, fecha: null, error: mensaje, consultando: false });
      },
      { enableHighAccuracy: false, timeout: 13000, maximumAge: 2 * 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    montado.current = true;
    actualizar();
    const intervalo = setInterval(() => actualizar(), DIEZ_MINUTOS);
    return () => {
      montado.current = false;
      controlador.current?.abort();
      clearInterval(intervalo);
    };
  }, [actualizar]);

  const hayTemperatura = Number.isFinite(clima.temperatura);
  const texto = hayTemperatura ? `${Math.round(clima.temperatura)} °C` : clima.consultando ? "… °C" : "— °C";
  const ayuda = clima.error || (clima.fecha
    ? `Temperatura exterior de tu ubicación actual, estimada por Open-Meteo. Actualizada: ${clima.fecha.toLocaleTimeString()}. Pulsa para actualizar.`
    : "Consultando la temperatura exterior en tu ubicación actual. Pulsa para reintentar.");

  return (
    <button
      type="button"
      onClick={() => actualizar(true)}
      aria-label={`Temperatura en mi ubicación: ${texto}. ${ayuda}`}
      title={ayuda}
      style={{ ...style, border: "none", color: "inherit", fontFamily: "inherit", fontSize: "inherit", cursor: "pointer", whiteSpace: "nowrap" }}
    >
      <span aria-hidden="true">📍 </span>{texto}
    </button>
  );
}
