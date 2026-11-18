import { TROPHIES, trophyMetrics } from './profiles'

/**
 * Reparte `count` trofeos en un estante: filas de a lo sumo `maxPerRow`, todas
 * centradas en x = 0 y con la misma cantidad (±1, las más llenas atrás). Las
 * filas de atrás se corren `rowGap` hacia el fondo y suben `rowRise` (gradas),
 * y el conjunto queda centrado también en profundidad.
 * Devuelve [{ x, y, z, row, col }] (row 0 = la de adelante).
 */
export function shelfLayout(count, { maxPerRow, spacing, rowGap = 0, rowRise = 0 }) {
  if (!(count > 0)) return []
  const rows = Math.ceil(count / Math.max(1, maxPerRow))
  const base = Math.floor(count / rows)
  const extra = count - base * rows
  const out = []
  for (let row = 0; row < rows; row++) {
    // las filas con uno más van atrás: adelante queda más aire
    const n = base + (row >= rows - extra ? 1 : 0)
    const z = ((rows - 1) / 2 - row) * rowGap
    for (let col = 0; col < n; col++) out.push({ x: (col - (n - 1) / 2) * spacing, y: row * rowRise, z, row, col })
  }
  return out
}

/**
 * Logros → estantes de la vitrina: uno por tipo de trofeo, con tantas copias
 * como títulos. Los totales (p. ej. "22 títulos internacionales", que incluye
 * Libertadores, Intercontinentales y Sudamericanas) no se apilan: se cuentan en
 * el texto. Respeta el orden de los datos (de arriba hacia abajo).
 */
export function trophyRows(logros) {
  return logros
    .filter((l) => !l.total && TROPHIES[l.id] && l.count > 0)
    .map((l) => ({ id: l.id, type: l.id, count: l.count, title: l.title, years: l.years, range: Boolean(l.range) }))
}

/** Medidas del mueble (metros de vitrina) */
export const CABINET = {
  margin: 0.3, // aire a los costados de la fila más ancha
  headroom: 0.2, // aire sobre el trofeo más alto de cada estante
  glass: 0.022, // espesor del vidrio
  base: 0.34, // zócalo bajo el último estante
  top: 0.16, // cornisa con la tira de luz
  minDepth: 0.62,
  depthPad: 0.1,
}

/**
 * Arma el mueble: un estante por fila, apilados de arriba (0) hacia abajo,
 * cada uno tan alto como su trofeo más alto (más las gradas) más aire. El
 * ancho y la profundidad salen del estante que más pide.
 */
export function cabinetLayout(rows, opts = CABINET) {
  const shelves = rows.map((row) => {
    const trophy = TROPHIES[row.type]
    const metrics = trophyMetrics(trophy)
    const positions = shelfLayout(row.count, trophy.layout)
    const tiers = positions.reduce((m, p) => Math.max(m, p.row + 1), 0)
    const rise = (tiers - 1) * (trophy.layout.rowRise ?? 0)
    const halfSpan = positions.reduce((m, p) => Math.max(m, Math.abs(p.x)), 0) + metrics.footprint
    const halfDepth = positions.reduce((m, p) => Math.max(m, Math.abs(p.z)), 0) + metrics.footprint
    const contentHeight = metrics.height + rise
    return { ...row, metrics, positions, tiers, contentHeight, halfSpan, halfDepth, clear: contentHeight + opts.headroom }
  })
  const width = 2 * (Math.max(0, ...shelves.map((s) => s.halfSpan)) + opts.margin)
  const depth = Math.max(opts.minDepth, 2 * (Math.max(0, ...shelves.map((s) => s.halfDepth)) + opts.depthPad))
  // de abajo hacia arriba: el último estante apoya en el zócalo
  let y = opts.base
  for (let i = shelves.length - 1; i >= 0; i--) {
    shelves[i].y = y
    y += shelves[i].clear + opts.glass
  }
  const ceiling = y - opts.glass
  return { width, depth, height: ceiling + opts.top, ceiling, glass: opts.glass, base: opts.base, shelves }
}
