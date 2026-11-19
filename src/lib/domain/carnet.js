/**
 * "Carnet de hincha": el carnet virtual que arma cada hincha en /carnet.
 * Validación pura (sin Firebase ni React): la usan el editor, la Server Action,
 * el smoke y los tests, así las reglas viven en un solo lugar.
 *
 * Documento en Firestore (colección `carnets`, uno por usuario, id = uid):
 *   { userId, nombre, apodo, desde: number, ubicacion, idolo, createdAt, updatedAt }
 * El número de socio NO se guarda: se deriva del uid (siempre el mismo).
 * La foto tampoco: vive solo en el navegador (vista previa y PNG).
 */

export const NOMBRE_MIN = 2
export const NOMBRE_MAX = 40
export const APODO_MAX = 24
/** Boca se fundó el 3 de abril de 1905 */
export const DESDE_MIN = 1905
export const TIME_ZONE = 'America/Argentina/Buenos_Aires'
export const CARNET_FIELDS = ['nombre', 'apodo', 'desde', 'ubicacion', 'idolo']

export const UBICACIONES = [
  { key: 'platea-baja', label: 'Platea baja' },
  { key: 'platea-alta', label: 'Platea alta' },
  { key: 'popular', label: 'Popular / La 12' },
  { key: 'palcos', label: 'Palcos' },
  { key: 'cabecera', label: 'Cabecera' },
  { key: 'casa', label: 'Desde casa' },
]

export const IDOLOS = [
  { key: 'maradona', label: 'Diego Maradona' },
  { key: 'riquelme', label: 'Juan Román Riquelme' },
  { key: 'palermo', label: 'Martín Palermo' },
  { key: 'tevez', label: 'Carlos Tevez' },
  { key: 'rattin', label: 'Antonio Rattín' },
  { key: 'roma', label: 'Antonio Roma' },
  { key: 'gatti', label: 'Hugo Gatti' },
  { key: 'benedetto', label: 'Darío Benedetto' },
  { key: 'guillermo', label: 'Guillermo Barros Schelotto' },
  { key: 'bianchi', label: 'Carlos Bianchi' },
]

/** Frases del dorso: propias, sin atribuir a nadie */
export const FRASES = [
  'Azul y oro, de La Boca al mundo.',
  'Donde juega Boca, ahí estoy.',
  'La mitad más uno, y yo adentro.',
  'De Brandsen 805 al corazón.',
  'Hincha de cuna, socio de corazón.',
  'La Bombonera no tiembla: late.',
]

export const CARNET_DEFAULTS = { nombre: '', apodo: '', desde: '', ubicacion: 'popular', idolo: 'riquelme' }
export const SOCIO_PREVIEW = 'PREVIEW'

// Solo strings (o números finitos). Un File, un objeto o un array cuentan como vacío:
// así un FormData armado a mano no cuela "[object File]" como nombre.
const str = (v) => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '')
const len = (s) => Array.from(s).length
const cap = (s, max) => Array.from(s).slice(0, max).join('')

// Lo que queda afuera de cada campo (letras de cualquier idioma, tildes, espacio y . ' ’ -)
const FUERA_NOMBRE = /[^\p{L}\p{M} .'’-]/gu
const FUERA_APODO = /[^\p{L}\p{M}0-9 .'’-]/gu

function clean(raw, fuera) {
  return str(raw)
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(fuera, '')
    .replace(/ {2,}/g, ' ')
    .replace(/^ /, '')
}

/** Mientras se escribe: limpia y corta, pero deja el espacio del final para seguir tipeando */
export const typeNombre = (raw) => cap(clean(raw, FUERA_NOMBRE), NOMBRE_MAX)
export const typeApodo = (raw) => cap(clean(raw, FUERA_APODO), APODO_MAX)
export const typeDesde = (raw) => str(raw).replace(/\D/g, '').slice(0, 4)

const findKey = (list, key) => list.find((o) => o.key === key)
export const ubicacionLabel = (key) => findKey(UBICACIONES, key)?.label ?? '—'
export const idoloLabel = (key) => findKey(IDOLOS, key)?.label ?? '—'

/** Año actual en Argentina, sin depender de la zona horaria del servidor */
export function currentYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric' }).format(now))
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ year?: number }} [options] tope de "hincha desde" (por defecto, el año actual)
 * @returns {{ data: { nombre: string, apodo: string, desde: number, ubicacion: string, idolo: string } | null, errors: Record<string, string>, values: Record<string, string> }}
 */
export function parseCarnet(input, { year = currentYear() } = {}) {
  const src = input ?? {}
  const values = {
    nombre: clean(src.nombre, FUERA_NOMBRE).trim(),
    apodo: clean(src.apodo, FUERA_APODO).trim(),
    desde: str(src.desde).trim(),
    ubicacion: str(src.ubicacion),
    idolo: str(src.idolo),
  }
  const errors = {}

  const letras = (values.nombre.match(/\p{L}/gu) ?? []).length
  if (!values.nombre) errors.nombre = 'Poné tu nombre.'
  else if (letras < NOMBRE_MIN) errors.nombre = `Tiene que tener al menos ${NOMBRE_MIN} letras.`
  else if (len(values.nombre) > NOMBRE_MAX) errors.nombre = `Hasta ${NOMBRE_MAX} caracteres.`

  if (len(values.apodo) > APODO_MAX) errors.apodo = `Hasta ${APODO_MAX} caracteres.`
  else if (values.apodo && !/[\p{L}0-9]/u.test(values.apodo)) errors.apodo = 'Usá letras o números.'

  if (!values.desde) errors.desde = 'Contanos desde qué año sos hincha.'
  else if (!/^\d{4}$/.test(values.desde)) errors.desde = 'Poné un año de cuatro cifras.'
  else if (Number(values.desde) < DESDE_MIN || Number(values.desde) > year) errors.desde = `Entre ${DESDE_MIN} y ${year}.`

  if (!findKey(UBICACIONES, values.ubicacion)) errors.ubicacion = 'Elegí desde dónde lo mirás.'
  if (!findKey(IDOLOS, values.idolo)) errors.idolo = 'Elegí tu ídolo.'

  const data = Object.keys(errors).length ? null : { ...values, desde: Number(values.desde) }
  return { data, errors, values }
}

/** Saca del FormData solo los campos del carnet (la foto no tiene `name`: nunca viaja) */
export function carnetFromForm(formData) {
  return Object.fromEntries(CARNET_FIELDS.map((k) => [k, formData.get(k)]))
}

/** Carnet guardado → valores del editor (todo string) */
export function valuesOf(carnet) {
  if (!carnet) return null
  return {
    nombre: str(carnet.nombre),
    apodo: str(carnet.apodo),
    desde: carnet.desde ? String(carnet.desde) : '',
    ubicacion: str(carnet.ubicacion),
    idolo: str(carnet.idolo),
  }
}

/** ¿Dos borradores dicen lo mismo una vez limpios? (para "cambios sin guardar") */
export function sameCarnet(a, b) {
  if (!a || !b) return false
  const x = parseCarnet(a).values
  const y = parseCarnet(b).values
  return CARNET_FIELDS.every((k) => x[k] === y[k])
}

// ───────── Borrador en la URL (vuelve intacto después del login) ─────────

/** Valores no vacíos del borrador como query string */
export function draftQuery(values) {
  const v = values ?? {}
  const entries = CARNET_FIELDS.map((k) => [k, str(v[k]).trim()]).filter(([, x]) => x)
  return new URLSearchParams(entries).toString()
}

export function carnetPath(values) {
  const q = draftQuery(values)
  return q ? `/carnet?${q}` : '/carnet'
}

/** Link al login que vuelve al editor con el diseño cargado */
export const loginHref = (values) => `/login?next=${encodeURIComponent(carnetPath(values))}`

/**
 * Lee el borrador de los searchParams de la página. Solo campos conocidos, limpios y
 * sin validar (es una precarga); las opciones inválidas se ignoran. null si no hay nada.
 */
export function draftFromSearchParams(sp) {
  if (!sp || typeof sp !== 'object') return null
  const get = (k) => {
    const v = Object.hasOwn(sp, k) ? sp[k] : undefined
    return Array.isArray(v) ? str(v[0]) : str(v)
  }
  const draft = {}
  const nombre = typeNombre(get('nombre')).trim()
  const apodo = typeApodo(get('apodo')).trim()
  const desde = typeDesde(get('desde'))
  if (nombre) draft.nombre = nombre
  if (apodo) draft.apodo = apodo
  if (desde) draft.desde = desde
  if (findKey(UBICACIONES, get('ubicacion'))) draft.ubicacion = get('ubicacion')
  if (findKey(IDOLOS, get('idolo'))) draft.idolo = get('idolo')
  return Object.keys(draft).length ? draft : null
}

// ───────── Número de socio, frase, fechas ─────────

/** cyrb53 (bryc, dominio público): hash de 53 bits, rápido y estable */
export function cyrb53(text, seed = 0) {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/** Dígito verificador de Luhn para una tira de dígitos */
export function luhnDigit(digits) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return String((10 - (sum % 10)) % 10)
}

export function luhnValid(number) {
  const digits = String(number).replace(/\D/g, '')
  return digits.length > 1 && luhnDigit(digits.slice(0, -1)) === digits.at(-1)
}

/**
 * Número de socio del carnet: 9 dígitos derivados del uid + verificador ("048 210 937-5").
 * Es decorativo: no es único garantizado ni sirve como credencial. Sin uid, "PREVIEW".
 */
export function socioNumber(uid) {
  if (typeof uid !== 'string' || !uid) return SOCIO_PREVIEW
  const digits = String(cyrb53(uid) % 1e9).padStart(9, '0')
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}-${luhnDigit(digits)}`
}

export const fraseFor = (seed) => FRASES[cyrb53(String(seed ?? '')) % FRASES.length]

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

/** "18 NOV 2026" en hora argentina; null si la fecha no sirve */
export function formatFecha(value) {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  )
  return `${parts.day.padStart(2, '0')} ${MESES[Number(parts.month) - 1]} ${parts.year}`
}

const upper = (s) => s.toLocaleUpperCase('es-AR')

/** Iniciales para la foto vacía: primera y última palabra ("Juan Román Riquelme" → "JR") */
export function initials(nombre) {
  const words = str(nombre).trim().split(/\s+/).filter((w) => /\p{L}/u.test(w))
  if (!words.length) return '?'
  const first = (w) => Array.from(w).find((c) => /\p{L}/u.test(c))
  return upper(words.length === 1 ? first(words[0]) : first(words[0]) + first(words.at(-1)))
}

/** "carnet-boca-juan-roman.png": sin tildes ni símbolos, con respaldo si queda vacío */
export function carnetFileName(nombre) {
  const slug = str(nombre)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
  return `carnet-boca-${slug || 'hincha'}.png`
}

/**
 * Lo que dibuja el carnet a partir del borrador (válido o no: la vista previa se
 * actualiza mientras se escribe). `createdAt` es el alta guardada; si no hay, `today`.
 */
export function cardModel(values, { uid = null, createdAt = null, today = null } = {}) {
  const v = { ...CARNET_DEFAULTS, ...(values ?? {}) }
  const nombre = clean(v.nombre, FUERA_NOMBRE).trim()
  const apodo = clean(v.apodo, FUERA_APODO).trim()
  const desde = /^\d{4}$/.test(str(v.desde).trim()) ? str(v.desde).trim() : ''
  const socio = socioNumber(uid)
  const model = {
    nombre: nombre ? upper(nombre) : 'TU NOMBRE',
    nombreVacio: !nombre,
    // La firma del dorso va como la escribió (sin pasar a mayúsculas)
    firma: nombre,
    apodo,
    desde: desde || '····',
    ubicacion: upper(ubicacionLabel(v.ubicacion)),
    idolo: upper(idoloLabel(v.idolo)),
    socio,
    socioDesde: formatFecha(createdAt) ?? formatFecha(today) ?? '—',
    frase: fraseFor(socio),
    iniciales: initials(nombre),
    // El patrón del dorso cambia con el nombre (se ve generarse mientras escribís)
    seed: `${socio}|${upper(nombre)}`,
  }
  model.ariaFront = `Frente del carnet de hincha: ${model.nombre}${apodo ? `, «${apodo}»` : ''}, socio número ${socio}, hincha desde ${desde || 'sin año'}.`
  model.ariaBack = `Dorso del carnet: socio desde ${model.socioDesde}, ubicación ${ubicacionLabel(v.ubicacion)}, ídolo ${idoloLabel(v.idolo)}. «${model.frase}» Patrón decorativo, no es un QR. Tributo no oficial, sin validez como credencial.`
  return model
}
