/**
 * Lógica pura del Journey: el contador de año que rueda cifra por cifra y la
 * navegación por la columna de años (que incluye años sin hito).
 */

/** "2007" → [2, 0, 0, 7]. Cada cifra es la posición de su rodillo (0–9). */
export const yearDigits = (year) => String(year).padStart(4, '0').slice(-4).split('').map(Number)

/** Desplazamiento de cada rodillo en % de su alto: la cifra d queda a -d×10 % */
export const rollOffsets = (year) => yearDigits(year).map((d) => -d * 10)

/**
 * Índice del hito que corresponde a un año de la columna: el mismo año si tiene
 * hito; si no, el siguiente con hito; si no hay siguiente, el último.
 */
export function hitoIndexForYear(hitos, year) {
  const y = Number(year)
  const exact = hitos.findIndex((h) => Number(h.year) === y)
  if (exact >= 0) return exact
  const next = hitos.findIndex((h) => Number(h.year) > y)
  return next >= 0 ? next : hitos.length - 1
}
