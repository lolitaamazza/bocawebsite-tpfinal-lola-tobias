/**
 * Qué estante se enciende y cuál muestra la placa.
 * Manda el mouse sobre el 3D, después el ítem de la lista (mouse o foco de
 * teclado), después el estante fijado con un toque o el botón.
 * `active` es el estante por el que pasa la cámara: con la lista abajo
 * (`stacked`, celular) la placa lo acompaña; con la lista al costado no hace
 * falta. Atenuar el resto es solo para el encendido explícito.
 */
export function shelfFocus({ hover3d = null, hoverList = null, pinned = null, active = null, stacked = false } = {}) {
  const highlight = hover3d ?? hoverList ?? pinned
  return { highlight, label: highlight ?? (stacked ? active : null) }
}

/** Un toque fija el estante; tocar el mismo o fuera de los estantes lo suelta */
export const togglePin = (pinned, i) => (i === null || i === undefined || pinned === i ? null : i)

/** Estado de cada ítem de la lista: se apaga si la cámara está en otro estante */
export function itemState(i, { active = null, highlight = null, pinned = null } = {}) {
  return {
    dim: active !== null && active !== i && highlight !== i,
    lit: highlight === i || active === i,
    pinned: pinned === i,
  }
}
