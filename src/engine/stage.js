const clamp01 = (v) => Math.min(1, Math.max(0, v))
/**
 * Hueco libre de pantalla (0..1) para la remera en primer plano. Con `slot`
 * (el perfil del jugador) es ese rectángulo, nunca por encima de la cabecera.
 * Sin slot, como la ficha: a su izquierda en apaisado, encima en vertical.
 * Devuelve null si no hay con qué medir.
 */
export function stageRectFor({ w, h, landscape, top, footerTop, card, slot }) {
  if (!(w > 0) || !(h > 0)) return null
  if (slot && slot.right - slot.left >= 2 && slot.bottom - slot.top >= 2) {
    const y0 = clamp01(Math.max(slot.top, top) / h)
    return {
      x0: clamp01(slot.left / w),
      y0,
      x1: clamp01(slot.right / w),
      y1: Math.max(y0, clamp01(slot.bottom / h)),
      tuck: 0,
    }
  }
  if (!card) return null
  return landscape
    ? { x0: 0, y0: top / h, x1: card.left / w, y1: (footerTop + 28) / h, tuck: 0 }
    : { x0: 0, y0: top / h, x1: 1, y1: card.top / h, tuck: 0.2 }
}

/**
 * Dónde se para la remera seleccionada para que entre en el hueco que deja la UI
 * (la ficha a la derecha en apaisado, abajo en vertical). Todo en metros.
 */
export function stagePose(i) {
  const { rect, tanHalf, aspect, distance: d } = i
  const viewH = 2 * d * tanHalf
  const viewW = viewH * aspect
  const top = 0.03 // aire sobre el gancho
  const height = top + i.shirtDrop
  const width = i.shirtWidth + 0.04
  const freeH = (rect.y1 - rect.y0) * viewH
  const freeW = (rect.x1 - rect.x0) * viewW
  const scale = Math.max(0.2, Math.min(1.25, (freeH * 0.9) / height / (1 - rect.tuck), (freeW * 0.92) / width))
  // Si entra entera, centrada en el hueco; si no, pegada arriba y el bajo se esconde
  const fits = height * scale <= freeH * 0.95
  const hookY = fits
    ? i.cameraY + (0.5 - (rect.y0 + rect.y1) / 2) * viewH + (height / 2 - top) * scale
    : i.cameraY + (0.5 - rect.y0) * viewH - freeH * 0.03 - top * scale
  return {
    x: ((rect.x0 + rect.x1) / 2 - 0.5) * viewW,
    y: hookY - i.railY,
    z: i.cameraZ - d,
    scale,
  }
}
