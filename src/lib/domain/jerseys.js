import { site } from '../../config/site.js'
import { MAX_NAME, cleanName, cleanNumber } from '../../engine/text.js'

/**
 * "Mis remeras": una remera personalizada guardada por un hincha.
 * Validación pura (sin Firebase ni React): la usan el formulario, la Server
 * Action y los tests, así las reglas viven en un solo lugar.
 *
 * Documento en Firestore (colección `jerseys`):
 *   { userId, name, number, size, note, createdAt, updatedAt }
 */

export const JERSEY_SIZES = site.store.sizes
export const NOTE_MAX = 140

/**
 * @param {{ name?: unknown, number?: unknown, size?: unknown, note?: unknown }} input
 * @returns {{ data: { name: string, number: string, size: string, note: string } | null, errors: Record<string, string>, values: Record<string, string> }}
 */
export function parseJersey(input) {
  const values = {
    name: cleanName(String(input.name ?? '')).trim(),
    number: cleanNumber(String(input.number ?? '')),
    size: String(input.size ?? ''),
    note: String(input.note ?? '').trim(),
  }
  const errors = {}
  if (!values.name) errors.name = 'Poné un nombre para estampar.'
  else if (values.name.length > MAX_NAME) errors.name = `Hasta ${MAX_NAME} letras.`
  if (!values.number) errors.number = 'Elegí un número.'
  else if (Number(values.number) < 1 || Number(values.number) > 99) errors.number = 'Del 1 al 99.'
  if (!JERSEY_SIZES.includes(values.size)) errors.size = 'Elegí un talle.'
  if (values.note.length > NOTE_MAX) errors.note = `Hasta ${NOTE_MAX} caracteres.`
  // El número se guarda sin ceros adelante: "07" y "7" son la misma remera
  const data = Object.keys(errors).length ? null : { ...values, number: String(Number(values.number)) }
  return { data, errors, values }
}

/** Una remera guardada como "jugador" del riel 3D (el vestuario personal reutiliza la escena) */
export function jerseyAsPlayer(jersey, index) {
  return {
    id: jersey.id,
    dorsal: Number(jersey.number),
    shirt: jersey.name,
    nombre: jersey.name,
    apellido: '',
    pos: 'DEL',
    rol: `Talle ${jersey.size}`,
    edad: 0,
    pais: '',
    bandera: '',
    procedencia: jersey.note || 'Mi remera',
    contrato: null,
    capitan: false,
    tm: -1 - index,
  }
}
