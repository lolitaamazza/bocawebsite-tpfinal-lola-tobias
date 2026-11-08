/** Amortiguado exponencial independiente del framerate: llega a `b` con constante `lambda`. */
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt))
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
export const lerp = (a, b, t) => a + (b - a) * t
/** Curva de la intro (cúbica de entrada y salida) */
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
/** PRNG chico y determinístico (mulberry32) para texturas procedurales reproducibles */
export function seeded(seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
