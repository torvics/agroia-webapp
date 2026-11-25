import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "./dialogos.css";

// Colores de AgroIA para los cuadros de diálogo modales.
export const COLOR_EXITO = "#7A9D54";
export const COLOR_ERROR = "#b42318";
const COLOR_NEUTRO = "#6b7280";

// Los textos se pasan siempre como `text` (no HTML) para que los mensajes
// de la API no puedan inyectar marcado.
const base = Swal.mixin({
  customClass: { popup: "agroia-swal" },
  buttonsStyling: true,
  confirmButtonText: "Aceptar",
  returnFocus: true,
  heightAuto: false, // evita saltos de scroll al abrir el diálogo
});

/** Acción realizada correctamente. */
export function mostrarExito(titulo, texto = "") {
  return base.fire({ icon: "success", title: titulo, text: texto, confirmButtonColor: COLOR_EXITO, iconColor: COLOR_EXITO });
}

/** La acción falló o no se pudo realizar. `error` puede ser un Error o un texto. */
export function mostrarError(titulo, error = "") {
  const texto = error instanceof Error ? error.message : String(error ?? "");
  return base.fire({ icon: "error", title: titulo, text: texto, confirmButtonColor: COLOR_ERROR, iconColor: COLOR_ERROR });
}

/** Aviso informativo (p. ej. «no hay cambios que guardar»). */
export function mostrarAviso(titulo, texto = "") {
  return base.fire({ icon: "info", title: titulo, text: texto, confirmButtonColor: COLOR_EXITO, iconColor: COLOR_EXITO });
}

/**
 * Confirmación antes de una acción. Devuelve true solo si el usuario confirma.
 * `peligro` pinta el botón de confirmar en rojo (eliminar, dar de baja...).
 */
export async function confirmar({ titulo, texto = "", confirmar: textoConfirmar = "Confirmar", cancelar = "Cancelar", peligro = false }) {
  const resultado = await base.fire({
    icon: peligro ? "warning" : "question",
    iconColor: peligro ? COLOR_ERROR : COLOR_EXITO,
    title: titulo,
    text: texto,
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: cancelar,
    confirmButtonColor: peligro ? COLOR_ERROR : COLOR_EXITO,
    cancelButtonColor: COLOR_NEUTRO,
    reverseButtons: true,
    focusCancel: peligro,
  });
  return resultado.isConfirmed === true;
}
