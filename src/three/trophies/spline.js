/**
 * Cúbica monótona (Fritsch–Carlson): pasa por los nudos y nunca se pasa de
 * ellos. La usan las siluetas de los trofeos (radio en función de la altura)
 * y el recorrido de la cámara. Sin three: se prueba en node.
 */

/** Tangentes en cada nudo. `rest`: tangente nula en los extremos (arranca y frena quieta). */
export function monotoneTangents(xs, ys, { rest = false } = {}) {
  const n = xs.length
  const h = []
  const d = []
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i]
    d[i] = (ys[i + 1] - ys[i]) / h[i]
  }
  const m = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const w1 = 2 * h[i] + h[i - 1]
    const w2 = h[i] + 2 * h[i - 1]
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  if (rest || n < 2) return m
  if (n === 2) {
    m[0] = m[1] = d[0]
    return m
  }
  m[0] = endTangent(h[0], h[1], d[0], d[1])
  m[n - 1] = endTangent(h[n - 2], h[n - 3], d[n - 2], d[n - 3])
  return m
}

/** Extremo de tres puntos que conserva la forma (como pchip de MATLAB/SciPy) */
function endTangent(h0, h1, d0, d1) {
  const t = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1)
  if (Math.sign(t) !== Math.sign(d0)) return 0
  if (Math.sign(d0) !== Math.sign(d1) && Math.abs(t) > Math.abs(3 * d0)) return 3 * d0
  return t
}

/** Índice del tramo [xs[k], xs[k+1]] que contiene x (x ya acotado) */
export function segmentOf(xs, x) {
  let lo = 0
  let hi = xs.length - 2
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (xs[mid] <= x) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** Hermite cúbica en el tramo k */
export function hermite(xs, ys, m, k, x) {
  const h = xs[k + 1] - xs[k]
  const u = h > 0 ? (x - xs[k]) / h : 0
  const u2 = u * u
  const u3 = u2 * u
  return (
    (2 * u3 - 3 * u2 + 1) * ys[k] + (u3 - 2 * u2 + u) * h * m[k] + (-2 * u3 + 3 * u2) * ys[k + 1] + (u3 - u2) * h * m[k + 1]
  )
}

/** Interpolador listo para usar: f(x) acotado al rango de los nudos */
export function monotone(xs, ys, options) {
  const m = monotoneTangents(xs, ys, options)
  const x0 = xs[0]
  const x1 = xs[xs.length - 1]
  return (x) => {
    const c = Math.min(x1, Math.max(x0, x))
    return hermite(xs, ys, m, segmentOf(xs, c), c)
  }
}
