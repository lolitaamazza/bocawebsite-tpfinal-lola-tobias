/**
 * Lógica pura del Salón de ídolos: cómo se escriben los años en Boca, las
 * iniciales de la tarjeta tipográfica y los vecinos de cada ídolo.
 */

/** [[1996, 2002], [2007, 2014]] → "1996–2002 · 2007–2014"; un solo año queda solo: "2007" */
export const formatEtapas = (etapas) =>
  etapas.map(([desde, hasta]) => (desde === hasta ? String(desde) : `${desde}–${hasta}`)).join(' · ')

/** Temporadas en Boca contando ambos extremos de cada etapa: [[1997, 2000], [2004, 2011]] → 12 */
export const temporadas = (etapas) => etapas.reduce((n, [desde, hasta]) => n + hasta - desde + 1, 0)

/** "Juan Román Riquelme" → "JR"; "Ángel Clemente Rojas" → "ÁC". Dos letras como máximo. */
export const iniciales = (nombre) =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0].toLocaleUpperCase('es-AR'))
    .join('')

/** Apellido para el índice: la última palabra del nombre ("Diego Armando Maradona" → "Maradona") */
export const apellido = (nombre) => nombre.trim().split(/\s+/).at(-1)

/** Anterior y siguiente en el salón (sin dar la vuelta): null en los extremos o si el slug no existe */
export function vecinos(lista, slug) {
  const i = lista.findIndex((x) => x.slug === slug)
  if (i < 0) return { prev: null, next: null }
  return { prev: lista[i - 1] ?? null, next: lista[i + 1] ?? null }
}

/** Número de dos cifras para el índice y los capítulos: 3 → "03" */
export const numero = (n) => String(n).padStart(2, '0')
