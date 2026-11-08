/**
 * "Mi XI ideal": una formación armada con jugadores del plantel.
 * Validación pura, compartida por formulario, Server Action y tests.
 *
 * Documento en Firestore (colección `lineups`):
 *   { userId, name, formation, slots: number[11] (dorsales), captain: number, createdAt, updatedAt }
 * `slots[i]` es el dorsal que ocupa el puesto i de la formación (el 0 siempre es el arco).
 */

/** Puestos de cada esquema, con coordenadas en % de la cancha (x: izq→der, y: arco propio abajo) */
const line = (role, y, xs) => xs.map((x) => ({ role, x, y }))
export const FORMATIONS = {
  '4-3-3': [{ role: 'ARQ', x: 50, y: 90 }, ...line('DEF', 70, [14, 38, 62, 86]), ...line('MED', 47, [25, 50, 75]), ...line('DEL', 20, [18, 50, 82])],
  '4-4-2': [{ role: 'ARQ', x: 50, y: 90 }, ...line('DEF', 70, [14, 38, 62, 86]), ...line('MED', 46, [14, 38, 62, 86]), ...line('DEL', 20, [35, 65])],
  '4-2-3-1': [
    { role: 'ARQ', x: 50, y: 90 },
    ...line('DEF', 71, [14, 38, 62, 86]),
    ...line('MED', 54, [35, 65]),
    ...line('MED', 35, [18, 50, 82]),
    ...line('DEL', 15, [50]),
  ],
  '3-5-2': [{ role: 'ARQ', x: 50, y: 90 }, ...line('DEF', 70, [25, 50, 75]), ...line('MED', 46, [10, 30, 50, 70, 90]), ...line('DEL', 20, [35, 65])],
}
export const FORMATION_KEYS = Object.keys(FORMATIONS)
export const NAME_MIN = 2
export const NAME_MAX = 40

/**
 * @param {{ name?: unknown, formation?: unknown, slots?: unknown[], captain?: unknown }} input
 * @param {{ dorsal: number, pos: string }[]} squad
 */
export function parseLineup(input, squad) {
  const formation = FORMATIONS[String(input.formation)] ? String(input.formation) : ''
  const slots = Array.from({ length: 11 }, (_, i) => {
    const v = Number((input.slots ?? [])[i])
    return Number.isInteger(v) && v > 0 ? v : 0
  })
  const values = {
    name: String(input.name ?? '').trim(),
    formation,
    slots,
    captain: Number(input.captain) || 0,
  }
  const errors = {}
  if (values.name.length < NAME_MIN) errors.name = 'Ponele un nombre a tu formación.'
  else if (values.name.length > NAME_MAX) errors.name = `Hasta ${NAME_MAX} caracteres.`
  if (!formation) errors.formation = 'Elegí un esquema.'

  const byDorsal = new Map(squad.map((p) => [p.dorsal, p]))
  const slotErrors = {}
  const seen = new Set()
  slots.forEach((d, i) => {
    if (!d) return void (slotErrors[i] = 'Falta elegir.')
    const p = byDorsal.get(d)
    if (!p) return void (slotErrors[i] = 'No está en el plantel.')
    if (seen.has(d)) slotErrors[i] = 'Repetido.'
    seen.add(d)
    if (i === 0 && p.pos !== 'ARQ') slotErrors[i] = 'Al arco va un arquero.'
    if (i > 0 && p.pos === 'ARQ') slotErrors[i] = 'Los arqueros van al arco.'
  })
  if (Object.keys(slotErrors).length) errors.slots = slotErrors
  if (!values.captain) errors.captain = 'Elegí un capitán.'
  else if (!slots.includes(values.captain)) errors.captain = 'El capitán tiene que estar en el equipo.'

  const data = Object.keys(errors).length ? null : values
  return { data, errors, values }
}

/** Saca los datos del FormData del formulario del XI */
export function lineupFromForm(formData) {
  return {
    name: formData.get('name'),
    formation: formData.get('formation'),
    slots: Array.from({ length: 11 }, (_, i) => formData.get(`slot-${i}`)),
    captain: formData.get('captain'),
  }
}
