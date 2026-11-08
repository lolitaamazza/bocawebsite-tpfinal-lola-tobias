/** Reglas del estampado personalizado, compartidas por el formulario y la textura. */

export const MAX_NAME = 10
export const MAX_NUMBER = 2
const ALLOWED = /[^A-ZÁÉÍÓÚÜÑÇ0-9 .'-]/g

/** Mayúsculas y solo los caracteres que la tipografía de la remera sabe estampar */
export const cleanName = (raw: string) => raw.toUpperCase().replace(ALLOWED, '').slice(0, MAX_NAME)

export const cleanNumber = (raw: string) => raw.replace(/\D/g, '').slice(0, MAX_NUMBER)

/** Para buscar sin tildes ni mayúsculas */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Búsqueda del panel: por dorsal si son dígitos, si no por nombre/apellido/estampado */
export function searchPlayers<T extends { dorsal: number; nombre: string; apellido: string; shirt: string }>(
  list: T[],
  query: string,
): T[] {
  const q = fold(query.trim())
  if (!q) return list
  if (/^\d+$/.test(q)) return list.filter((p) => String(p.dorsal).startsWith(q))
  return list.filter((p) => fold(`${p.nombre} ${p.apellido} ${p.shirt}`).includes(q))
}
