/**
 * Dónde se para la remera seleccionada para que entre en el hueco que deja la UI
 * (la ficha a la derecha en apaisado, abajo en vertical). Todo en metros.
 */

/** Rectángulo libre de la pantalla, en fracciones del viewport (0..1) */
export interface StageRect {
  x0: number
  y0: number
  x1: number
  y1: number
  /** Fracción del bajo que se permite esconder detrás de la ficha (vertical) */
  tuck: number
}

export interface StageInput {
  rect: StageRect
  /** tan(fov/2) vertical de la cámara */
  tanHalf: number
  aspect: number
  cameraY: number
  cameraZ: number
  /** Distancia de la cámara a la que se para la remera */
  distance: number
  /** Ancho de la remera con sus mangas, a escala 1 */
  shirtWidth: number
  /** Cuánto cuelga (positivo) por debajo del gancho, a escala 1 */
  shirtDrop: number
  /** Altura del gancho en el mundo */
  railY: number
}

export interface StagePose {
  x: number
  y: number
  z: number
  scale: number
}

export function stagePose(i: StageInput): StagePose {
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
