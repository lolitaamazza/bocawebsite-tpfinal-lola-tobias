/**
 * Collage editorial de "Historia en la piel": dónde cae cada foto, cada hito y
 * cada etiqueta de camiseta. Todo sale del índice (sin Math.random), así el
 * servidor y el navegador dibujan lo mismo y el diseño no cambia entre visitas.
 */

/** Altura del hito, en zigzag: nunca dos seguidos a la misma altura */
export const SLOTS = ['bottom', 'top', 'middle', 'bottom', 'middle', 'top']

/** Límites de rotación (grados) */
export const PHOTO_TILT = 3
export const STICKER_TILT = 6

/** Proporción de la foto: ni tan angosta ni tan apaisada (el resto lo recorta object-cover) */
export const ASPECT_MIN = 0.72
export const ASPECT_MAX = 1.7

/** Ancho máximo de una foto en pantallas angostas (vw) */
export const PHOTO_MAX_VW = 80

/** Generador pseudoaleatorio con semilla (mulberry32): mismo índice, mismos números */
export function rng(seed) {
  let a = (seed + 0x6d2b79f5) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const r2 = (n) => Math.round(n * 100) / 100
const between = (rand, min, max) => min + rand() * (max - min)
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

/**
 * Borde rasgado: un polígono que recorre el rectángulo en sentido horario con
 * puntos intermedios que se meten hacia adentro hasta `jitter` %. Nunca sale
 * del 0–100, así el recorte no deja ver fuera de la foto.
 */
export function tornClip(seed, { jitter = 2.2, steps = 5 } = {}) {
  const rand = rng(seed * 7919 + 13)
  const j = () => r2(rand() * jitter)
  const pts = []
  for (let k = 0; k < steps; k++) pts.push([r2((100 / steps) * k), j()])
  for (let k = 0; k < steps; k++) pts.push([r2(100 - j()), r2((100 / steps) * k)])
  for (let k = 0; k < steps; k++) pts.push([r2(100 - (100 / steps) * k), r2(100 - j())])
  for (let k = 0; k < steps; k++) pts.push([j(), r2(100 - (100 / steps) * k)])
  return `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(', ')})`
}

/** Geometría de cada altura: arriba del hito va la foto o al revés, siempre pisándose un poco */
const GEOMETRY = {
  // hito arriba, foto abajo
  top: { photoTop: [40, 46], photoH: [38, 44], text: { anchor: 'top', at: 13 } },
  // foto arriba, hito al medio pisando el borde inferior de la foto
  middle: { photoTop: [9, 14], photoH: [38, 44], text: { anchor: 'top', at: 38 } },
  // foto arriba, hito abajo apoyado sobre la línea de tiempo
  bottom: { photoTop: [9, 13], photoH: [44, 50], text: { anchor: 'bottom', at: 12 } },
}

/**
 * Disposición de la pieza `index` (0..total-1).
 * `aspect` es ancho/alto de la foto original.
 */
export function collageLayout(index, total, aspect = 1.4) {
  const rand = rng(index + 1)
  const slot = SLOTS[index % SLOTS.length]
  const g = GEOMETRY[slot]
  const photoAspect = r2(clamp(Number(aspect) || 1.4, ASPECT_MIN, ASPECT_MAX))
  const photoH = r2(between(rand, ...g.photoH))
  const sign = index % 2 === 0 ? -1 : 1
  return {
    slot,
    // la más reciente en color, como la foto final de la referencia
    color: index === total - 1,
    photo: {
      top: r2(between(rand, ...g.photoTop)),
      height: photoH,
      aspect: photoAspect,
      // ancho en CSS: alto × proporción, con tope en pantallas angostas
      width: `min(${r2(photoH * photoAspect)}dvh, ${PHOTO_MAX_VW}vw)`,
      offset: r2(between(rand, 0, 3)),
      rotate: r2(sign * between(rand, 0.6, PHOTO_TILT)),
      // paralaje: cada foto a su velocidad, y un giro chico mientras pasa
      speed: r2(between(rand, 0.6, 1.4)),
      spin: r2(sign * between(rand, 0.5, 1.5)),
      clip: tornClip(index + 1),
    },
    text: {
      ...g.text,
      // dónde empieza el hito sobre la foto (fracción del ancho de la foto)
      over: r2(between(rand, 0.45, 0.62)),
    },
    sticker: {
      // en la esquina que el hito no tapa: 'top' = arriba a la izquierda,
      // 'bottom' = abajo a la derecha (el hito quedó arriba, sobre la foto)
      corner: slot === 'top' ? 'bottom' : 'top',
      rotate: r2(-sign * between(rand, 2, STICKER_TILT)),
      speed: r2(between(rand, 1.5, 2)),
    },
  }
}
