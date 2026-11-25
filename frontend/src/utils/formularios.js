import { useEffect, useRef } from "react";

/**
 * Desplaza la página hasta el formulario cuando se abre y pone el foco en su
 * primer campo. `clave` es null/false mientras está cerrado; cualquier otro valor
 * (por ejemplo un contador que aumenta en cada apertura) vuelve a desplazar.
 * Devuelve la ref que se asigna al contenedor del formulario.
 */
export function useDesplazarAlAbrir(clave) {
  const ref = useRef(null);
  useEffect(() => {
    if (clave === null || clave === undefined || clave === false) return;
    const elemento = ref.current;
    if (!elemento) return;
    const sinAnimacion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    elemento.scrollIntoView({ behavior: sinAnimacion ? "auto" : "smooth", block: "start" });
    elemento.querySelector("input:not([type=hidden]), select, textarea")?.focus({ preventScroll: true });
  }, [clave]);
  return ref;
}
