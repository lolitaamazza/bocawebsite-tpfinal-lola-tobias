/**
 * Trivia xeneize: reglas puras (sin Firebase, sin React, sin imports de datos).
 * Las usan las Server Actions, la capa de datos, el smoke y los tests.
 *
 * Flujo de una ronda (todo se decide en el servidor):
 *   1. newRound: arma 10 preguntas con la semilla y las guarda con su respuesta.
 *   2. revealStep: muestra la pregunta siguiente y anota cuándo (arranca su reloj).
 *   3. answerStep: corrige con el reloj del servidor y devuelve la correcta.
 *   4. finishStep: suma el puntaje con las respuestas guardadas.
 * El navegador nunca recibe la respuesta, la fuente, el id ni la semilla de una
 * pregunta antes de contestarla.
 *
 * Documento `trivia_rounds/{roundId}` (solo Admin SDK):
 *   { seed, category, ranked, userId|null, displayName|null, questions[], revealedAt[],
 *     answers[], status, startedAt, expiresAt, finishedAt?, result? }
 * Documento `trivia_scores/{roundId}` (solo usuarios logueados):
 *   { userId, displayName, score, correct, total, durationMs, bestStreak, category,
 *     seed, ranked, rank? (solo las que suman al ranking), createdAt }
 */

export const ROUND_SIZE = 10
export const OPTIONS = 4
export const QUESTION_MS = 20_000
/** Margen para que una respuesta dada en el último segundo llegue por la red */
export const LATENCY_GRACE_MS = 2_000
/** Una ronda abandonada vence: no se aceptan más respuestas */
export const ROUND_TTL_MS = 30 * 60_000
export const BASE_POINTS = 100
export const MAX_TIME_BONUS = 50
export const STREAK_BONUS = 20
/** El bono de racha se cobra desde el tercer acierto seguido */
export const STREAK_FROM = 3
export const NO_ANSWER = -1
export const NICK_MAX = 20
export const DEFAULT_NICK = 'Hincha xeneize'

export const CATEGORIES = [
  { key: 'mixta', label: 'Mixta', hint: 'Un poco de todo' },
  { key: 'titulos', label: 'Títulos', hint: 'Copas, años y finales' },
  { key: 'camisetas', label: 'Camisetas', hint: 'El archivo de indumentaria' },
  { key: 'plantel', label: 'Plantel', hint: 'Dorsales, clubes y números' },
  { key: 'historia', label: 'Historia', hint: 'La Boca, la Bombonera y los ídolos' },
]
const CATEGORY_KEYS = CATEGORIES.map((c) => c.key)
/** Categorías con preguntas propias (la mixta las combina) */
export const TOPICS = CATEGORY_KEYS.filter((k) => k !== 'mixta')

export const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label ?? 'Mixta'
export const parseCategory = (raw) => (CATEGORY_KEYS.includes(String(raw)) ? String(raw) : '')

export const ERRORS = {
  expired: 'La partida venció. Empezá otra.',
  finished: 'Esta partida ya terminó.',
  'out-of-order': 'Esa no es la pregunta que toca.',
  duplicate: 'Esa pregunta ya la respondiste.',
  'not-revealed': 'Todavía no viste esa pregunta.',
  'invalid-choice': 'Esa opción no existe.',
  incomplete: 'Faltan preguntas por responder.',
  'not-found': 'No encontramos esa partida.',
  category: 'Elegí una categoría.',
}

/* ───────── Azar con semilla ───────── */

const SEED_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const SEED_LENGTH = 10

/**
 * Semilla nueva a partir de bytes al azar (crypto en el servidor). 31^10 ≈ 8·10^14
 * combinaciones: no se puede adivinar probando a partir de la primera pregunta.
 */
export function seedFromBytes(bytes) {
  return Array.from(bytes.slice(0, SEED_LENGTH), (b) => SEED_ALPHABET[b % SEED_ALPHABET.length]).join('')
}

/** Semilla que llega por URL: minúsculas y alfanumérica, o '' si no sirve */
export function normalizeSeed(raw) {
  const s = String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return s.length >= 4 && s.length <= 24 ? s : ''
}

/** "abcdefghjk" → "abcde-fghjk" (más fácil de dictar) */
export const formatSeed = (seed) => String(seed).replace(/(.{5})(?=.)/g, '$1-')

/** cyrb128 → 128 bits de estado: no alcanza con probar 2^32 estados para reconstruir una ronda */
function cyrb128(str) {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  h1 ^= h2 ^ h3 ^ h4
  h2 ^= h1
  h3 ^= h1
  h4 ^= h1
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}

/** sfc32: generador chico y rápido, [0, 1) */
function sfc32(a, b, c, d) {
  return () => {
    a |= 0
    b |= 0
    c |= 0
    d |= 0
    const t = (((a + b) | 0) + d) | 0
    d = (d + 1) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
}

/** Generador determinístico: las mismas partes dan siempre la misma secuencia */
export function rngFrom(...parts) {
  const rng = sfc32(...cyrb128(parts.join('|')))
  for (let i = 0; i < 12; i++) rng()
  return rng
}

/** Fisher–Yates sobre una copia */
export function shuffle(list, rng) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ───────── Distractores ───────── */

const uniq = (list) => [...new Set(list)]

/** Números cercanos (1 arriba, 1 abajo, 2…), nunca negativos ni iguales a la respuesta */
export function nearbyNumbers(n, { min = 0, count = 8 } = {}) {
  const out = []
  for (let d = 1; out.length < count && d < 100; d++) {
    if (n - d >= min) out.push(n - d)
    if (out.length < count) out.push(n + d)
  }
  return out.map(String)
}

/**
 * Años cercanos que NO están en `exclude` ni pegados (±1) a la respuesta o a un
 * año excluido: así ninguna opción es "discutible" entre el año de la edición y
 * el del partido (Intercontinental 1977 jugada en 1978, Copa Argentina 2019–20).
 */
export function nearbyYears(year, { exclude = [], min = 1900, max = 2100, count = 8 } = {}) {
  const banned = new Set([year, ...exclude].map(Number).flatMap((y) => [y - 1, y, y + 1]))
  const out = []
  for (let d = 1; out.length < count && d < 80; d++) {
    for (const y of [year - d, year + d]) {
      if (y >= min && y <= max && !banned.has(y) && out.length < count) out.push(y)
    }
  }
  return out.map(String)
}

/** Primer año de un rótulo: "1908–1913" → 1908 */
export const startYear = (label) => Number(String(label).slice(0, 4))

/* ───────── Banco de preguntas ───────── */

const fullName = (p) => `${p.nombre} ${p.apellido}`
const isCantera = (p) => /reserva de boca|juveniles de boca|inferiores/i.test(p.procedencia ?? '')

/** Nombre singular de cada competición del palmarés (para "su primera Copa…") */
const COMPETITIONS = {
  libertadores: { one: 'Copa Libertadores', female: true },
  intercontinental: { one: 'Copa Intercontinental', female: true },
  liga: { one: 'título de Primera División', female: false },
  sudamericana: { one: 'Copa Sudamericana', female: true },
  'copa-argentina': { one: 'Copa Argentina', female: true },
}

const STAT_QUESTIONS = [
  { key: 'goles', prompt: (c) => `¿Quién fue el goleador de Boca en el ${c}?` },
  { key: 'asist', prompt: (c) => `¿Quién dio más asistencias en el ${c}?` },
  { key: 'min', prompt: (c) => `¿Quién jugó más minutos en el ${c}?` },
]

/**
 * Lo que cuenta la ficha de cada pieza al responder (descripción del museo) y
 * que respondería otra pregunta: esas dos nunca caen en la misma ronda.
 * Ej.: la ficha de 1940 dice "estrenó la Bombonera ante San Lorenzo".
 */
const PIEZA_TOPICS = {
  1905: ['fundacion-fecha', 'fundacion-barrio'],
  1908: ['franja', 'colores'],
  1916: ['franja'],
  1940: ['bombonera-anio', 'bombonera-rival'],
  1980: ['diego-1981'],
  2000: ['year-libertadores-2000', 'year-intercontinental-2000'],
  2007: ['year-libertadores-2007', 'last-libertadores', 'count-libertadores'],
  2025: ['fundacion-fecha'],
}

/**
 * Arma todas las plantillas de preguntas a partir de los datos del repo.
 * Cada plantilla trae `ref` (de qué dato sale) para que los tests la verifiquen.
 * `distractors` va ordenado del más parecido al menos parecido.
 *
 * @param {{ logros?: any[], piezas?: any[], squad?: any[], stats?: any, curated?: any[], season?: string }} sources
 */
export function buildBank({ logros = [], piezas = [], squad = [], stats = null, curated = [], season = '' }) {
  const bank = []
  const allYears = [...logros.flatMap((l) => l.years ?? []), ...piezas.map((p) => p.year)].map(startYear).filter(Boolean)
  const maxYear = allYears.length ? Math.max(...allYears) : 2100
  const honours = { label: 'Wikipedia: Boca Juniors (palmarés)', url: 'https://en.wikipedia.org/wiki/Boca_Juniors#Honours' }
  const add = (q) => bank.push({ link: null, detail: null, image: null, topics: [], ...q })

  // Títulos: cantidades, primer y último año, y "¿en cuál de estos años…?"
  for (const l of logros) {
    const few = /^copas/i.test(l.title) ? 'Cuántas' : 'Cuántos'
    const title = /^copas/i.test(l.title) ? l.title : l.title.charAt(0).toLowerCase() + l.title.slice(1)
    add({
      id: `titulos-cantidad-${l.id}`,
      category: 'titulos',
      group: 'titulos-cantidad',
      kind: 'logro-cantidad',
      ref: { logro: l.id },
      topics: [`count-${l.id}`],
      prompt: `¿${few} ${title} ganó Boca?`,
      answer: String(l.count),
      distractors: nearbyNumbers(l.count, { min: 1 }),
      source: honours,
    })
    const comp = COMPETITIONS[l.id]
    if (!comp || l.total || !l.years?.length) continue
    const years = l.years.map(Number)
    const first = years[0]
    const last = years[years.length - 1]
    const art = comp.female ? 'su primera' : 'su primer'
    add({
      id: `titulos-primera-${l.id}`,
      category: 'titulos',
      group: 'titulos-primera',
      kind: 'logro-primera',
      ref: { logro: l.id },
      topics: [`first-${l.id}`, `year-${l.id}-${first}`],
      prompt: `¿En qué año ganó Boca ${art} ${comp.one}?`,
      answer: String(first),
      distractors: nearbyYears(first, { exclude: years, min: 1905, max: maxYear }),
      source: honours,
    })
    if (years.length > 1) {
      add({
        id: `titulos-ultima-${l.id}`,
        category: 'titulos',
        group: 'titulos-ultima',
        kind: 'logro-ultima',
        ref: { logro: l.id },
        topics: [`last-${l.id}`, `year-${l.id}-${last}`],
        prompt: `¿En qué año ganó Boca ${comp.female ? 'su última' : 'su último'} ${comp.one} (hasta hoy)?`,
        answer: String(last),
        distractors: nearbyYears(last, { exclude: years, min: 1905, max: maxYear }),
          source: honours,
      })
    }
    // Con rango (liga) solo se conocen el primero y el último: no hay lista para "¿en cuál…?"
    if (l.range) continue
    for (const y of years) {
      add({
        id: `titulos-anio-${l.id}-${y}`,
        category: 'titulos',
        group: `titulos-anio-${l.id}`,
        kind: 'logro-anio',
        ref: { logro: l.id, year: y },
        topics: [`year-${l.id}-${y}`],
        prompt: `¿En cuál de estos años Boca ganó la ${comp.one}?`,
        answer: String(y),
        distractors: nearbyYears(y, { exclude: years, min: 1905, max: maxYear }),
          source: honours,
      })
    }
  }

  // Camisetas: la foto de la pieza del archivo y su época (solo piezas verificadas con foto)
  const shown = piezas.filter((p) => p.verified && p.image)
  for (const p of shown) {
    const others = uniq(shown.filter((o) => o.year !== p.year).map((o) => o.year))
    others.sort((a, b) => Math.abs(startYear(a) - startYear(p.year)) - Math.abs(startYear(b) - startYear(p.year)) || startYear(a) - startYear(b))
    add({
      id: `camisetas-anio-${p.id}`,
      category: 'camisetas',
      group: 'camisetas-anio',
      kind: 'pieza-anio',
      ref: { pieza: p.id },
      topics: PIEZA_TOPICS[p.id] ?? [],
      prompt: '¿De qué época es esta camiseta del archivo?',
      answer: p.year,
      distractors: others,
      image: p.image,
      detail: `«${p.title}» · ${p.season}. ${p.description}`,
      source: { label: 'Boca Juniors: archivo de indumentaria', url: p.imageSource },
      link: { label: 'Verla en el museo', href: '/museo' },
    })
  }

  // Plantel: dorsales, procedencia, país, cantera, capitán
  const plantel = { label: `Plantel ${season} · Transfermarkt`, url: 'https://www.transfermarkt.es/ca-boca-juniors/kader/verein/189' }
  const ficha = (p) => ({ label: `Ficha de ${fullName(p)}`, href: `/dorsal/${p.dorsal}` })
  const externos = squad.filter((p) => p.procedencia && !isCantera(p))
  const clubes = uniq(externos.map((p) => p.procedencia))
  const paises = uniq(squad.map((p) => p.pais).filter(Boolean))
  for (const p of squad) {
    const dorsales = squad.filter((o) => o.dorsal !== p.dorsal).map((o) => o.dorsal)
    dorsales.sort((a, b) => Math.abs(a - p.dorsal) - Math.abs(b - p.dorsal) || a - b)
    add({
      id: `plantel-dorsal-${p.dorsal}`,
      category: 'plantel',
      group: 'plantel-dorsal',
      kind: 'squad-dorsal',
      ref: { dorsal: p.dorsal },
      prompt: `¿Qué número usa ${fullName(p)}?`,
      answer: String(p.dorsal),
      distractors: dorsales.map(String),
      source: plantel,
      link: ficha(p),
    })
    if (!isCantera(p) && p.procedencia) {
      add({
        id: `plantel-club-${p.dorsal}`,
        category: 'plantel',
        group: 'plantel-club',
        kind: 'squad-club',
        ref: { dorsal: p.dorsal },
        prompt: `¿De qué club llegó ${fullName(p)}?`,
        answer: p.procedencia,
        distractors: clubes.filter((c) => c !== p.procedencia),
        spread: true,
        source: plantel,
        link: ficha(p),
      })
    }
    if (p.pais && p.pais !== 'Argentina') {
      add({
        id: `plantel-pais-${p.dorsal}`,
        category: 'plantel',
        group: 'plantel-pais',
        kind: 'squad-pais',
        ref: { dorsal: p.dorsal },
        prompt: `¿De qué país es ${fullName(p)}?`,
        answer: p.pais,
        distractors: paises.filter((c) => c !== p.pais),
        spread: true,
        source: plantel,
        link: ficha(p),
      })
    }
    if (isCantera(p) && externos.length >= OPTIONS - 1) {
      add({
        id: `plantel-cantera-${p.dorsal}`,
        category: 'plantel',
        group: 'plantel-cantera',
        kind: 'squad-cantera',
        ref: { dorsal: p.dorsal },
        prompt: '¿Cuál de estos jugadores del plantel salió de las inferiores de Boca?',
        answer: fullName(p),
        distractors: externos.map(fullName),
        spread: true,
        source: plantel,
        link: ficha(p),
      })
    }
  }
  const captains = squad.filter((p) => p.capitan)
  if (captains.length === 1) {
    const cap = captains[0]
    const veteranos = squad.filter((p) => p !== cap).sort((a, b) => (b.edad ?? 0) - (a.edad ?? 0))
    add({
      id: 'plantel-capitan',
      category: 'plantel',
      group: 'plantel-capitan',
      kind: 'squad-capitan',
      ref: { dorsal: cap.dorsal },
      prompt: `¿Quién es el capitán del plantel ${season}?`.replace(/\s+\?/, '?'),
      answer: fullName(cap),
      distractors: veteranos.map(fullName),
      source: plantel,
      link: ficha(cap),
    })
  }

  // Estadísticas: líderes del torneo (solo si el líder es único)
  if (stats?.players && squad.length) {
    const competition = stats.meta?.competition ?? 'torneo'
    const source = { label: `${stats.meta?.source ?? 'Transfermarkt'}: ${competition}`, url: 'https://www.transfermarkt.es/ca-boca-juniors/leistungsdaten/verein/189' }
    const rows = squad.map((p) => ({ p, s: stats.players[String(p.dorsal)] })).filter((r) => r.s)
    for (const { key, prompt } of STAT_QUESTIONS) {
      const sorted = [...rows].sort((a, b) => b.s[key] - a.s[key])
      const [leader, second] = sorted
      if (!leader || !second || leader.s[key] <= second.s[key] || sorted.length < OPTIONS) continue
      add({
        id: `plantel-lider-${key}`,
        category: 'plantel',
        group: 'plantel-lider',
        kind: 'stats-lider',
        ref: { stat: key, dorsal: leader.p.dorsal },
        topics: [`lider-${key}`],
        prompt: prompt(competition),
        answer: fullName(leader.p),
        distractors: sorted.slice(1).map((r) => fullName(r.p)),
        detail: `${fullName(leader.p)}: ${leader.s[key]} ${key === 'goles' ? 'goles' : key === 'asist' ? 'asistencias' : 'minutos'}.`,
        source,
        link: ficha(leader.p),
      })
      if (key === 'goles') {
        add({
          id: 'plantel-goles-lider',
          category: 'plantel',
          group: 'plantel-lider-cifra',
          kind: 'stats-cifra',
          ref: { stat: key, dorsal: leader.p.dorsal },
          topics: [`lider-${key}`],
          prompt: `¿Cuántos goles hizo ${fullName(leader.p)} en el ${competition}?`,
          answer: String(leader.s[key]),
          distractors: nearbyNumbers(leader.s[key], { min: 0 }),
          source,
          link: ficha(leader.p),
        })
      }
    }
  }

  // Curadas (historia y finales), con su fuente
  for (const c of curated) {
    add({
      ...c,
      id: `curada-${c.id}`,
      kind: 'curada',
      ref: { curada: c.id },
      group: `curada-${c.group ?? c.id}`,
      topics: [...(c.topics ?? [])],
      distractors: [...c.distractors],
      spread: true,
    })
  }

  return bank
}

/* ───────── Ronda ───────── */

/**
 * Elige plantillas sin repetir "tipo" mientras se pueda: primero una por grupo,
 * después hasta dos, después lo que quede. Dos plantillas que comparten un
 * `topic` nunca van juntas (la respuesta de una delataría la otra).
 */
function pickByGroup(shuffled, size, usedTopics = new Set()) {
  const chosen = []
  const used = new Map()
  for (const cap of [1, 2, Infinity]) {
    for (const q of shuffled) {
      if (chosen.length >= size) break
      if (chosen.includes(q) || (used.get(q.group) ?? 0) >= cap) continue
      if (q.topics.some((t) => usedTopics.has(t))) continue
      chosen.push(q)
      used.set(q.group, (used.get(q.group) ?? 0) + 1)
      for (const t of q.topics) usedTopics.add(t)
    }
  }
  return chosen
}

/**
 * Las plantillas de una ronda. Misma semilla + categoría = mismas preguntas.
 * La mixta reparte entre las cuatro categorías (2 o 3 de cada una).
 */
export function drawTemplates(bank, { seed, category, size = ROUND_SIZE }) {
  const rng = rngFrom('ronda', seed, category)
  if (category !== 'mixta') return pickByGroup(shuffle(bank.filter((q) => q.category === category), rng), size)

  const order = shuffle(TOPICS, rng)
  const quota = (i) => Math.floor(size / order.length) + (i < size % order.length ? 1 : 0)
  const usedTopics = new Set()
  const lanes = order.map((cat, i) => pickByGroup(shuffle(bank.filter((q) => q.category === cat), rng), quota(i), usedTopics))
  const out = []
  for (let i = 0; out.length < size && i < size; i++) for (const lane of lanes) if (lane[i] && out.length < size) out.push(lane[i])
  return out
}

/**
 * Una plantilla con sus 4 opciones mezcladas. Los distractores salen de los más
 * parecidos (o de todos si `spread`), siempre distintos entre sí y de la respuesta.
 */
export function materialize(template, seed) {
  const rng = rngFrom('pregunta', seed, template.id)
  const pool = uniq(template.distractors.map(String)).filter((d) => d !== template.answer)
  if (pool.length < OPTIONS - 1) throw new Error(`La pregunta ${template.id} no tiene suficientes distractores`)
  const window = template.spread ? pool.length : Math.min(pool.length, 6)
  const distractors = shuffle(pool.slice(0, window), rng).slice(0, OPTIONS - 1)
  const options = shuffle([template.answer, ...distractors], rng)
  return {
    id: template.id,
    category: template.category,
    prompt: template.prompt,
    options,
    answerIndex: options.indexOf(template.answer),
    image: template.image ?? null,
    detail: template.detail ?? null,
    source: template.source ?? null,
    link: template.link ?? null,
  }
}

/** Las preguntas completas de una ronda (con respuesta: quedan en el servidor) */
export function buildQuestions(bank, { seed, category, size = ROUND_SIZE }) {
  return drawTemplates(bank, { seed, category, size }).map((t) => materialize(t, seed))
}

/** Estado inicial de una ronda, ya con la primera pregunta revelada */
export function newRound({ bank, seed, category, ranked, userId = null, displayName = null, now }) {
  const questions = buildQuestions(bank, { seed, category })
  if (questions.length < ROUND_SIZE) throw new Error(`No hay suficientes preguntas de ${category}`)
  return {
    seed,
    category,
    ranked: Boolean(ranked),
    userId,
    displayName: userId ? displayName : null,
    questions,
    revealedAt: [now],
    answers: [],
    status: 'playing',
    startedAt: now,
    expiresAt: now + ROUND_TTL_MS,
  }
}

/** Lo único que viaja al navegador de una pregunta sin responder */
export function publicQuestion(question, index, total, remainingMs = QUESTION_MS) {
  return {
    index,
    total,
    category: question.category,
    prompt: question.prompt,
    options: [...question.options],
    hasImage: Boolean(question.image),
    limitMs: QUESTION_MS,
    remainingMs: Math.max(0, Math.min(QUESTION_MS, remainingMs)),
  }
}

const isIndex = (round, index) => Number.isInteger(index) && index >= 0 && index < round.questions.length

function closed(round, now) {
  if (round.status === 'finished') return 'finished'
  if (now > round.expiresAt) return 'expired'
  return null
}

/**
 * Revela la pregunta `index`. Solo la que sigue a la última respondida, y una
 * sola vez: pedirla de nuevo devuelve el tiempo que le queda, no reinicia el reloj.
 */
export function revealStep(round, index, now) {
  const error = closed(round, now)
  if (error) return { error }
  if (!isIndex(round, index)) return { error: 'out-of-order' }
  if (index < round.answers.length) return { error: 'duplicate' }
  if (index > round.answers.length) return { error: 'out-of-order' }
  const total = round.questions.length
  if (index < round.revealedAt.length) {
    const left = QUESTION_MS - (now - round.revealedAt[index])
    return { round, question: publicQuestion(round.questions[index], index, total, left) }
  }
  return { round: { ...round, revealedAt: [...round.revealedAt, now] }, question: publicQuestion(round.questions[index], index, total) }
}

/**
 * Corrige la respuesta `choice` a la pregunta `index` con el reloj del servidor.
 * NO_ANSWER (-1) es "se acabó el tiempo". Pasado el límite + margen, cuenta como
 * tiempo cumplido aunque la opción sea la correcta.
 */
export function answerStep(round, index, choice, now) {
  const error = closed(round, now)
  if (error) return { error }
  if (!isIndex(round, index)) return { error: 'out-of-order' }
  if (index < round.answers.length) return { error: 'duplicate' }
  if (index > round.answers.length) return { error: 'out-of-order' }
  if (index >= round.revealedAt.length) return { error: 'not-revealed' }
  const q = round.questions[index]
  const valid = choice === NO_ANSWER || (Number.isInteger(choice) && choice >= 0 && choice < q.options.length)
  if (!valid) return { error: 'invalid-choice' }

  const elapsed = Math.max(0, now - round.revealedAt[index])
  const timedOut = choice === NO_ANSWER || elapsed > QUESTION_MS + LATENCY_GRACE_MS
  const correct = !timedOut && choice === q.answerIndex
  const answer = { choice, correct, timedOut, elapsedMs: timedOut ? QUESTION_MS : Math.min(elapsed, QUESTION_MS) }
  const answers = [...round.answers, answer]
  const summary = summarize(answers)
  return {
    round: { ...round, answers },
    feedback: {
      index,
      correct,
      timedOut,
      choice,
      answerIndex: q.answerIndex,
      answer: q.options[q.answerIndex],
      points: summary.points[index],
      score: summary.score,
      streak: summary.streak,
      correctCount: summary.correct,
      detail: q.detail,
      source: q.source,
      link: q.link,
      last: index === round.questions.length - 1,
    },
  }
}

/** Cierra la ronda: el puntaje sale de las respuestas guardadas. Repetir devuelve lo mismo. */
export function finishStep(round, now) {
  if (round.status === 'finished') return { round, result: round.result, already: true }
  if (round.answers.length < round.questions.length) return { error: 'incomplete' }
  const s = summarize(round.answers)
  const result = {
    score: s.score,
    correct: s.correct,
    total: round.questions.length,
    durationMs: s.durationMs,
    bestStreak: s.bestStreak,
    marks: s.marks,
    category: round.category,
    seed: round.seed,
    ranked: round.ranked,
  }
  return { round: { ...round, status: 'finished', finishedAt: now, result }, result, already: false }
}

/** La foto de una pregunta, solo si ya se reveló (la URL del archivo delata el año) */
export function imageFor(round, index) {
  if (!isIndex(round, index) || index >= round.revealedAt.length) return null
  return round.questions[index].image ?? null
}

/* ───────── Puntaje ───────── */

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

/** 50 puntos si respondés al instante, 0 al llegar a los 20 s */
export function timeBonus(elapsedMs) {
  const ms = clamp(Number(elapsedMs) || 0, 0, QUESTION_MS)
  return Math.round((MAX_TIME_BONUS * (QUESTION_MS - ms)) / QUESTION_MS)
}

/** Puntaje, aciertos, rachas y tiempo total de una lista de respuestas */
export function summarize(answers) {
  let score = 0
  let correct = 0
  let streak = 0
  let bestStreak = 0
  let durationMs = 0
  const points = []
  for (const a of answers) {
    durationMs += clamp(Number(a.elapsedMs) || 0, 0, QUESTION_MS)
    if (a.correct) {
      streak++
      correct++
      const p = BASE_POINTS + timeBonus(a.elapsedMs) + (streak >= STREAK_FROM ? STREAK_BONUS : 0)
      score += p
      points.push(p)
    } else {
      streak = 0
      points.push(0)
    }
    bestStreak = Math.max(bestStreak, streak)
  }
  return { score, correct, streak, bestStreak, durationMs, points, marks: answers.map((a) => Boolean(a.correct)) }
}

/** Techo teórico: todas bien, al instante */
export const maxScore = (n = ROUND_SIZE) => n * (BASE_POINTS + MAX_TIME_BONUS) + Math.max(0, n - STREAK_FROM + 1) * STREAK_BONUS

/* ───────── Ranking ───────── */

const DURATION_SLOTS = 10_000_000

/**
 * Un solo número para ordenar en Firestore (índice simple, sin índice compuesto):
 * más puntos primero y, a igual puntaje, menos tiempo primero.
 */
export function rankKey(score, durationMs) {
  return Math.max(0, Math.floor(score)) * DURATION_SLOTS + (DURATION_SLOTS - 1 - clamp(Math.floor(durationMs), 0, DURATION_SLOTS - 1))
}

/** Orden del ranking: puntaje ↓, tiempo ↑, el que terminó antes ↑ */
export function compareEntries(a, b) {
  return b.score - a.score || a.durationMs - b.durationMs || String(a.finishedAt ?? '').localeCompare(String(b.finishedAt ?? '')) || String(a.id).localeCompare(String(b.id))
}

/* ───────── Nombre público ───────── */

/** Apodo para el ranking: letras, números y poca puntuación. Nunca un email. */
export function cleanNickname(raw) {
  const s = String(raw ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s || s.includes('@')) return ''
  const cleaned = s
    .replace(/[^\p{L}\p{N} .'_-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICK_MAX)
    .trim()
  return cleaned.length >= 2 ? cleaned : ''
}

export const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] ?? ''

/** El apodo elegido, si no el primer nombre de la cuenta, si no uno genérico */
export function displayNameFor({ nickname, tokenName }) {
  return cleanNickname(nickname) || cleanNickname(firstName(tokenName)) || DEFAULT_NICK
}

/* ───────── Compartir ───────── */

export const replayPath = (seed, category) => `/trivia?semilla=${encodeURIComponent(seed)}&categoria=${encodeURIComponent(category)}`

export const formatPoints = (n) => Number(n).toLocaleString('es-AR')

/** "1:05" */
export function formatDuration(ms) {
  const total = Math.round(Math.max(0, ms) / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Texto para compartir el resultado (sin emojis: cuadrados llenos = aciertos) */
export function shareText(result, origin = '') {
  const marks = result.marks.map((m) => (m ? '■' : '□')).join('')
  return [
    `Trivia xeneize · ${categoryLabel(result.category)}`,
    `${marks} ${result.correct}/${result.total}`,
    `${formatPoints(result.score)} puntos · mejor racha ${result.bestStreak}`,
    `Jugá la misma ronda: ${origin}${replayPath(result.seed, result.category)}`,
  ].join('\n')
}
