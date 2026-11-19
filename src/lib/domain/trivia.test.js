import { describe, expect, it } from 'vitest'
import { piezas } from '@/app/museo/piezas'
import { site } from '@/config/site'
import { squad, stats } from '@/data'
import { logros } from '@/data/logros'
import { preguntasCuradas } from '@/data/trivia-preguntas'
import {
  BASE_POINTS,
  CATEGORIES,
  DEFAULT_NICK,
  LATENCY_GRACE_MS,
  MAX_TIME_BONUS,
  NO_ANSWER,
  OPTIONS,
  QUESTION_MS,
  ROUND_SIZE,
  ROUND_TTL_MS,
  STREAK_BONUS,
  TOPICS,
  answerStep,
  buildBank,
  buildQuestions,
  cleanNickname,
  compareEntries,
  displayNameFor,
  drawTemplates,
  finishStep,
  formatDuration,
  imageFor,
  materialize,
  maxScore,
  nearbyNumbers,
  nearbyYears,
  newRound,
  normalizeSeed,
  parseCategory,
  publicQuestion,
  rankKey,
  revealStep,
  rngFrom,
  seedFromBytes,
  shareText,
  shuffle,
  summarize,
  timeBonus,
} from './trivia'

const bank = buildBank({ logros, piezas, squad, stats, curated: preguntasCuradas, season: site.season })
const byId = new Map(bank.map((t) => [t.id, t]))
const SEEDS = Array.from({ length: 60 }, (_, i) => `semilla${i}`)
const fullName = (p) => `${p.nombre} ${p.apellido}`
const T0 = 1_800_000_000_000

/* ───────── Azar ───────── */

describe('rng con semilla', () => {
  it('la misma semilla da la misma secuencia y otra semilla, otra', () => {
    const a = rngFrom('x', 'abc')
    const b = rngFrom('x', 'abc')
    const c = rngFrom('x', 'abd')
    const sa = Array.from({ length: 5 }, a)
    expect(Array.from({ length: 5 }, b)).toEqual(sa)
    expect(Array.from({ length: 5 }, c)).not.toEqual(sa)
    for (const v of sa) expect(v >= 0 && v < 1).toBe(true)
  })

  it('shuffle no pierde ni duplica elementos y no muta la lista', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = shuffle(list, rngFrom('s'))
    expect([...out].sort((x, y) => x - y)).toEqual(list)
    expect(list).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('semillas del servidor: 10 caracteres del alfabeto sin ambiguos', () => {
    const seed = seedFromBytes(Uint8Array.from([0, 30, 31, 255, 7, 8, 9, 10, 11, 12, 99]))
    expect(seed).toMatch(/^[a-z2-9]{10}$/)
    expect(seed).not.toMatch(/[ilo01]/)
  })

  it('normalizeSeed limpia lo que llega por URL y rechaza lo inválido', () => {
    expect(normalizeSeed('ABCde-FGhjk')).toBe('abcdefghjk')
    expect(normalizeSeed('ab')).toBe('')
    expect(normalizeSeed('x'.repeat(30))).toBe('')
    expect(normalizeSeed(undefined)).toBe('')
  })

  it('parseCategory solo acepta las categorías del juego', () => {
    for (const c of CATEGORIES) expect(parseCategory(c.key)).toBe(c.key)
    expect(parseCategory('admin')).toBe('')
    expect(parseCategory(undefined)).toBe('')
  })
})

/* ───────── Distractores ───────── */

describe('distractores numéricos y de años', () => {
  it('nearbyNumbers nunca incluye la respuesta ni baja del mínimo', () => {
    for (const n of [0, 1, 2, 6, 36]) {
      const out = nearbyNumbers(n, { min: n === 0 ? 0 : 1 }).map(Number)
      expect(out).not.toContain(n)
      expect(new Set(out).size).toBe(out.length)
      for (const v of out) expect(v).toBeGreaterThanOrEqual(n === 0 ? 0 : 1)
    }
  })

  it('nearbyYears esquiva la respuesta, los excluidos y sus vecinos (±1)', () => {
    const won = [1977, 1978, 2000, 2001, 2003, 2007]
    const out = nearbyYears(2000, { exclude: won, max: 2026 }).map(Number)
    for (const y of out) for (const w of won) expect(Math.abs(y - w)).toBeGreaterThan(1)
    for (const y of out) expect(y).toBeLessThanOrEqual(2026)
  })
})

/* ───────── Banco ───────── */

describe('banco de preguntas', () => {
  it('ids únicos y cada categoría alcanza para una ronda completa', () => {
    expect(byId.size).toBe(bank.length)
    for (const cat of TOPICS) expect(bank.filter((t) => t.category === cat).length).toBeGreaterThanOrEqual(ROUND_SIZE)
  })

  it('toda plantilla tiene fuente con URL y al menos 3 distractores distintos de la respuesta', () => {
    for (const t of bank) {
      expect(t.source?.url, t.id).toMatch(/^https:\/\//)
      expect(t.source?.label, t.id).toBeTruthy()
      const pool = new Set(t.distractors.map(String))
      pool.delete(t.answer)
      expect(pool.size, t.id).toBeGreaterThanOrEqual(OPTIONS - 1)
      expect(t.distractors.map(String), t.id).not.toContain(t.answer)
    }
  })

  it('cada pregunta generada sale de un dato del repo (se recalcula desde la fuente)', () => {
    const logro = (id) => logros.find((l) => l.id === id)
    const player = (d) => squad.find((p) => p.dorsal === d)
    for (const t of bank) {
      const r = t.ref
      switch (t.kind) {
        case 'logro-cantidad':
          expect(t.answer).toBe(String(logro(r.logro).count))
          break
        case 'logro-primera':
          expect(t.answer).toBe(logro(r.logro).years[0])
          break
        case 'logro-ultima':
          expect(t.answer).toBe(logro(r.logro).years.at(-1))
          break
        case 'logro-anio':
          expect(logro(r.logro).years).toContain(t.answer)
          for (const d of t.distractors) expect(logro(r.logro).years, t.id).not.toContain(d)
          break
        case 'pieza-anio': {
          const p = piezas.find((x) => x.id === r.pieza)
          expect(p.verified && p.image).toBeTruthy()
          expect(t.answer).toBe(p.year)
          expect(t.image).toBe(p.image)
          for (const d of t.distractors) expect(piezas.map((x) => x.year)).toContain(d)
          break
        }
        case 'squad-dorsal':
          expect(t.answer).toBe(String(player(r.dorsal).dorsal))
          expect(t.prompt).toContain(fullName(player(r.dorsal)))
          for (const d of t.distractors) expect(squad.map((p) => String(p.dorsal))).toContain(d)
          break
        case 'squad-club':
          expect(t.answer).toBe(player(r.dorsal).procedencia)
          break
        case 'squad-pais':
          expect(t.answer).toBe(player(r.dorsal).pais)
          expect(t.answer).not.toBe('Argentina')
          break
        case 'squad-cantera':
          expect(player(r.dorsal).procedencia).toMatch(/de Boca/)
          for (const d of t.distractors) expect(squad.find((p) => fullName(p) === d).procedencia, d).not.toMatch(/de Boca/)
          break
        case 'squad-capitan':
          expect(player(r.dorsal).capitan).toBe(true)
          expect(t.answer).toBe(fullName(player(r.dorsal)))
          break
        case 'stats-lider': {
          const top = stats.players[String(r.dorsal)][r.stat]
          expect(t.answer).toBe(fullName(player(r.dorsal)))
          for (const p of squad) if (p.dorsal !== r.dorsal) expect(stats.players[String(p.dorsal)][r.stat]).toBeLessThan(top)
          break
        }
        case 'stats-cifra':
          expect(t.answer).toBe(String(stats.players[String(r.dorsal)][r.stat]))
          break
        case 'curada': {
          const c = preguntasCuradas.find((x) => x.id === r.curada)
          expect(t.answer).toBe(c.answer)
          break
        }
        default:
          throw new Error(`Tipo sin verificar: ${t.kind} (${t.id})`)
      }
    }
  })

  it('las curadas: 4 opciones posibles, sin repetidas, con fuente', () => {
    expect(preguntasCuradas.length).toBeGreaterThanOrEqual(15)
    for (const c of preguntasCuradas) {
      expect(c.distractors).toHaveLength(OPTIONS - 1)
      expect(new Set([c.answer, ...c.distractors]).size, c.id).toBe(OPTIONS)
      expect(c.source.url, c.id).toMatch(/^https:\/\//)
      expect(TOPICS).toContain(c.category)
    }
  })

  it('el plantel en la trivia: el que llegó de la reserva no es "de qué club llegó"', () => {
    const club = bank.filter((t) => t.kind === 'squad-club')
    for (const t of club) expect(t.answer).not.toMatch(/reserva|juveniles/i)
  })
})

/* ───────── Ronda determinística ───────── */

describe('rondas', () => {
  it('misma semilla y categoría → mismas preguntas en el mismo orden', () => {
    for (const c of CATEGORIES) {
      const a = buildQuestions(bank, { seed: 'repetible', category: c.key })
      const b = buildQuestions(bank, { seed: 'repetible', category: c.key })
      expect(b).toEqual(a)
    }
    const other = buildQuestions(bank, { seed: 'otra-semilla', category: 'mixta' })
    expect(other.map((q) => q.id)).not.toEqual(buildQuestions(bank, { seed: 'repetible', category: 'mixta' }).map((q) => q.id))
  })

  it('cada ronda: 10 preguntas distintas, 4 opciones únicas, la respuesta adentro', () => {
    for (const seed of SEEDS) {
      for (const c of CATEGORIES) {
        const qs = buildQuestions(bank, { seed, category: c.key })
        expect(qs, `${seed}/${c.key}`).toHaveLength(ROUND_SIZE)
        expect(new Set(qs.map((q) => q.id)).size).toBe(ROUND_SIZE)
        for (const q of qs) {
          expect(q.options).toHaveLength(OPTIONS)
          expect(new Set(q.options).size, q.id).toBe(OPTIONS)
          expect(q.answerIndex).toBeGreaterThanOrEqual(0)
          expect(q.options[q.answerIndex]).toBe(byId.get(q.id).answer)
          // ningún distractor es la respuesta (ni repetido)
          expect(q.options.filter((o) => o === byId.get(q.id).answer)).toHaveLength(1)
          if (c.key !== 'mixta') expect(q.category).toBe(c.key)
        }
      }
    }
  })

  it('la mixta reparte 2 o 3 preguntas de cada categoría', () => {
    for (const seed of SEEDS) {
      const qs = buildQuestions(bank, { seed, category: 'mixta' })
      for (const cat of TOPICS) {
        const n = qs.filter((q) => q.category === cat).length
        expect(n, `${seed}/${cat}`).toBeGreaterThanOrEqual(2)
        expect(n).toBeLessThanOrEqual(3)
      }
    }
  })

  it('dos preguntas que se delatan nunca caen en la misma ronda (topics)', () => {
    for (const seed of SEEDS) {
      for (const c of CATEGORIES) {
        const ts = drawTemplates(bank, { seed, category: c.key })
        const seen = new Set()
        for (const t of ts) {
          for (const topic of t.topics) {
            expect(seen.has(topic), `${seed}/${c.key}: ${topic}`).toBe(false)
            seen.add(topic)
          }
        }
        const ids = ts.map((t) => t.id)
        // ejemplos concretos del problema
        expect(ids.includes('plantel-lider-goles') && ids.includes('plantel-goles-lider')).toBe(false)
        expect(ids.includes('curada-libertadores-1977-rival') && ids.includes('titulos-primera-libertadores')).toBe(false)
        expect(ids.includes('camisetas-anio-1940') && ids.includes('curada-bombonera-anio')).toBe(false)
      }
    }
  })

  it('las opciones dependen de la semilla (la correcta no queda siempre en el mismo lugar)', () => {
    const t = byId.get('curada-bombonera-anio')
    const positions = new Set(SEEDS.map((s) => materialize(t, s).answerIndex))
    expect(positions.size).toBeGreaterThan(1)
  })

  it('una plantilla sin distractores suficientes se rechaza en vez de inventar opciones', () => {
    expect(() => materialize({ id: 'x', answer: 'a', distractors: ['a', 'b', 'b'], category: 'historia' }, 's')).toThrow()
  })
})

/* ───────── Lo que viaja al navegador ───────── */

describe('pregunta pública (anti trampa)', () => {
  const round = newRound({ bank, seed: 'secreta', category: 'camisetas', ranked: true, now: T0 })

  it('no lleva respuesta, fuente, id, semilla ni la ruta de la foto', () => {
    for (const [i, q] of round.questions.entries()) {
      const pub = publicQuestion(q, i, ROUND_SIZE)
      expect(Object.keys(pub).sort()).toEqual(['category', 'hasImage', 'index', 'limitMs', 'options', 'prompt', 'remainingMs', 'total'])
      const json = JSON.stringify(pub)
      expect(json).not.toContain('answerIndex')
      expect(json).not.toContain('secreta')
      expect(json).not.toContain(q.id)
      expect(json).not.toContain('.webp')
      if (q.source) expect(json).not.toContain(q.source.url)
    }
  })

  it('la foto solo se entrega para preguntas ya reveladas', () => {
    expect(imageFor(round, 0)).toBe(round.questions[0].image)
    expect(imageFor(round, 1)).toBeNull()
    expect(imageFor(round, -1)).toBeNull()
    expect(imageFor(round, 99)).toBeNull()
  })
})

/* ───────── Validación de la ronda ───────── */

const play = (round, index, choice, at) => {
  const r = answerStep(round, index, choice, at)
  if (r.error) throw new Error(r.error)
  return r
}

describe('validación de la ronda', () => {
  const fresh = () => newRound({ bank, seed: 'validacion', category: 'historia', ranked: true, userId: 'u1', displayName: 'Tobi', now: T0 })

  it('arranca con la primera pregunta revelada y vence a los 30 minutos', () => {
    const r = fresh()
    expect(r.revealedAt).toEqual([T0])
    expect(r.expiresAt).toBe(T0 + ROUND_TTL_MS)
    expect(r.answers).toEqual([])
  })

  it('responder bien rápido suma base + bono de tiempo', () => {
    const r = fresh()
    const out = play(r, 0, r.questions[0].answerIndex, T0 + 2_000)
    expect(out.feedback.correct).toBe(true)
    expect(out.feedback.points).toBe(BASE_POINTS + timeBonus(2_000))
    expect(out.feedback.answerIndex).toBe(r.questions[0].answerIndex)
    expect(out.feedback.source.url).toMatch(/^https:/)
  })

  it('responder mal devuelve cuál era la correcta y 0 puntos', () => {
    const r = fresh()
    const wrong = (r.questions[0].answerIndex + 1) % OPTIONS
    const out = play(r, 0, wrong, T0 + 1_000)
    expect(out.feedback).toMatchObject({ correct: false, timedOut: false, points: 0, answerIndex: r.questions[0].answerIndex })
  })

  it('rechaza responder dos veces la misma pregunta', () => {
    const r1 = play(fresh(), 0, 0, T0 + 1_000).round
    expect(answerStep(r1, 0, 1, T0 + 2_000).error).toBe('duplicate')
  })

  it('rechaza saltearse preguntas (fuera de orden) y responder sin haberla visto', () => {
    const r = fresh()
    expect(answerStep(r, 2, 0, T0 + 1_000).error).toBe('out-of-order')
    const r1 = play(r, 0, 0, T0 + 1_000).round
    expect(answerStep(r1, 1, 0, T0 + 2_000).error).toBe('not-revealed')
    expect(revealStep(r1, 2, T0 + 2_000).error).toBe('out-of-order')
    expect(revealStep(r1, 0, T0 + 2_000).error).toBe('duplicate')
  })

  it('rechaza índices y opciones inválidas', () => {
    const r = fresh()
    expect(answerStep(r, -1, 0, T0).error).toBe('out-of-order')
    expect(answerStep(r, 1.5, 0, T0).error).toBe('out-of-order')
    expect(answerStep(r, Number.NaN, 0, T0).error).toBe('out-of-order')
    expect(answerStep(r, 0, 4, T0).error).toBe('invalid-choice')
    expect(answerStep(r, 0, 1.2, T0).error).toBe('invalid-choice')
    expect(answerStep(r, 0, '1', T0).error).toBe('invalid-choice')
  })

  it('rechaza todo después de que la ronda venció', () => {
    const r = fresh()
    const late = T0 + ROUND_TTL_MS + 1
    expect(answerStep(r, 0, 0, late).error).toBe('expired')
    expect(revealStep(r, 0, late).error).toBe('expired')
  })

  it('pasado el límite + margen, la correcta cuenta como tiempo cumplido', () => {
    const r = fresh()
    const right = r.questions[0].answerIndex
    const atLimit = play(r, 0, right, T0 + QUESTION_MS + LATENCY_GRACE_MS).feedback
    expect(atLimit).toMatchObject({ correct: true, points: BASE_POINTS })
    const tooLate = play(r, 0, right, T0 + QUESTION_MS + LATENCY_GRACE_MS + 1).feedback
    expect(tooLate).toMatchObject({ correct: false, timedOut: true, points: 0 })
  })

  it('sin respuesta (-1) es tiempo cumplido y suma los 20 s al tiempo total', () => {
    const r = fresh()
    const out = play(r, 0, NO_ANSWER, T0 + 3_000)
    expect(out.feedback.timedOut).toBe(true)
    expect(out.round.answers[0].elapsedMs).toBe(QUESTION_MS)
  })

  it('revelar de nuevo la pregunta actual no reinicia el reloj', () => {
    const r1 = play(fresh(), 0, 0, T0 + 1_000).round
    const shown = revealStep(r1, 1, T0 + 5_000)
    expect(shown.round.revealedAt).toEqual([T0, T0 + 5_000])
    const again = revealStep(shown.round, 1, T0 + 12_000)
    expect(again.round).toBe(shown.round)
    expect(again.question.remainingMs).toBe(QUESTION_MS - 7_000)
  })

  it('una ronda completa: el puntaje del cierre sale de las respuestas guardadas', () => {
    let r = fresh()
    const times = [1_000, 3_000, 5_000, 8_000, 12_000, 2_000, 2_000, 2_000, 19_000, 4_000]
    let clock = T0
    for (let i = 0; i < ROUND_SIZE; i++) {
      if (i > 0) {
        clock += 500
        r = revealStep(r, i, clock).round
      }
      clock += times[i]
      const choice = i === 4 ? (r.questions[i].answerIndex + 1) % OPTIONS : r.questions[i].answerIndex
      r = play(r, i, choice, clock).round
    }
    expect(finishStep({ ...r, answers: r.answers.slice(0, 9) }, clock).error).toBe('incomplete')
    const done = finishStep(r, clock)
    expect(done.result).toMatchObject({ correct: 9, total: 10, ranked: true, seed: 'validacion', category: 'historia' })
    expect(done.result.score).toBe(summarize(r.answers).score)
    expect(done.result.durationMs).toBe(times.reduce((a, b) => a + b, 0))
    expect(done.result.bestStreak).toBe(5)
    // cerrar de nuevo devuelve lo mismo y no habilita más jugadas
    const again = finishStep(done.round, clock + 10)
    expect(again.already).toBe(true)
    expect(again.result).toEqual(done.result)
    expect(answerStep(done.round, 9, 0, clock).error).toBe('finished')
    expect(revealStep(done.round, 9, clock).error).toBe('finished')
  })

  it('el nombre público queda en null en una ronda anónima', () => {
    const anon = newRound({ bank, seed: 'a', category: 'mixta', ranked: true, displayName: 'X', now: T0 })
    expect(anon.userId).toBeNull()
    expect(anon.displayName).toBeNull()
  })
})

/* ───────── Puntaje ───────── */

describe('puntaje', () => {
  it('bono de tiempo: 50 al instante, 25 a la mitad, 0 desde los 20 s', () => {
    expect(timeBonus(0)).toBe(MAX_TIME_BONUS)
    expect(timeBonus(-500)).toBe(MAX_TIME_BONUS)
    expect(timeBonus(QUESTION_MS / 2)).toBe(25)
    expect(timeBonus(QUESTION_MS)).toBe(0)
    expect(timeBonus(QUESTION_MS * 3)).toBe(0)
    expect(timeBonus(undefined)).toBe(MAX_TIME_BONUS)
  })

  it('más rápido nunca suma menos', () => {
    for (let ms = 0; ms < QUESTION_MS; ms += 250) expect(timeBonus(ms)).toBeGreaterThanOrEqual(timeBonus(ms + 250))
  })

  it('la racha paga desde el tercer acierto seguido y se corta con un error', () => {
    const ok = { correct: true, elapsedMs: QUESTION_MS }
    const ko = { correct: false, elapsedMs: 1_000 }
    const s = summarize([ok, ok, ok, ko, ok, ok, ok, ok])
    expect(s.points).toEqual([100, 100, 120, 0, 100, 100, 120, 120])
    expect(s.bestStreak).toBe(4)
    expect(s.streak).toBe(4)
    expect(s.correct).toBe(7)
  })

  it('el puntaje queda siempre entre 0 y el máximo teórico', () => {
    const rng = rngFrom('cotas')
    for (let k = 0; k < 500; k++) {
      const answers = Array.from({ length: ROUND_SIZE }, () => ({ correct: rng() > 0.4, elapsedMs: Math.floor(rng() * 40_000) - 5_000 }))
      const s = summarize(answers)
      expect(s.score).toBeGreaterThanOrEqual(0)
      expect(s.score).toBeLessThanOrEqual(maxScore())
      expect(s.durationMs).toBeLessThanOrEqual(ROUND_SIZE * QUESTION_MS)
      expect(s.durationMs).toBeGreaterThanOrEqual(0)
    }
    const perfect = summarize(Array.from({ length: ROUND_SIZE }, () => ({ correct: true, elapsedMs: 0 })))
    expect(perfect.score).toBe(maxScore())
    expect(maxScore()).toBe(ROUND_SIZE * (BASE_POINTS + MAX_TIME_BONUS) + 8 * STREAK_BONUS)
  })
})

/* ───────── Ranking ───────── */

describe('ranking', () => {
  it('rankKey: más puntos arriba; a igual puntaje, menos tiempo arriba', () => {
    expect(rankKey(1000, 90_000)).toBeGreaterThan(rankKey(999, 0))
    expect(rankKey(1000, 50_000)).toBeGreaterThan(rankKey(1000, 50_001))
    expect(rankKey(maxScore(), 0)).toBeLessThan(Number.MAX_SAFE_INTEGER)
    expect(rankKey(0, 10 ** 9)).toBe(0)
  })

  it('compareEntries ordena por puntaje, tiempo y quién terminó antes', () => {
    const list = [
      { id: 'c', score: 900, durationMs: 60_000, finishedAt: '2026-11-18T10:00:00Z' },
      { id: 'a', score: 1000, durationMs: 80_000, finishedAt: '2026-11-18T12:00:00Z' },
      { id: 'b', score: 1000, durationMs: 70_000, finishedAt: '2026-11-18T13:00:00Z' },
      { id: 'd', score: 1000, durationMs: 70_000, finishedAt: '2026-11-18T11:00:00Z' },
    ]
    expect([...list].sort(compareEntries).map((e) => e.id)).toEqual(['d', 'b', 'a', 'c'])
  })
})

/* ───────── Nombre público y compartir ───────── */

describe('nombre público (nunca el email)', () => {
  it('cleanNickname rechaza emails y limpia caracteres raros', () => {
    expect(cleanNickname('tobi@gmail.com')).toBe('')
    expect(cleanNickname('  El   Tobi  ')).toBe('El Tobi')
    expect(cleanNickname('<script>Román</script>')).toBe('scriptRománscript')
    expect(cleanNickname('x')).toBe('')
    expect(cleanNickname('a'.repeat(40))).toHaveLength(20)
  })

  it('displayNameFor: apodo, si no primer nombre, si no genérico', () => {
    expect(displayNameFor({ nickname: 'Bostero', tokenName: 'Tobías Arraiza' })).toBe('Bostero')
    expect(displayNameFor({ nickname: '', tokenName: 'Tobías Arraiza' })).toBe('Tobías')
    expect(displayNameFor({ nickname: 'yo@mail.com', tokenName: 'yo@mail.com' })).toBe(DEFAULT_NICK)
    expect(displayNameFor({})).toBe(DEFAULT_NICK)
  })
})

describe('compartir', () => {
  const result = { score: 1130, correct: 8, total: 10, bestStreak: 5, marks: [true, true, false, true, true, true, true, true, false, true], category: 'mixta', seed: 'abcdefghjk' }

  it('arma el texto con aciertos, puntos y el link para jugar la misma ronda', () => {
    const text = shareText(result, 'https://ejemplo.test')
    expect(text).toContain('■■□■■■■■□■ 8/10')
    expect(text).toContain('1.130 puntos')
    expect(text).toContain('https://ejemplo.test/trivia?semilla=abcdefghjk&categoria=mixta')
  })

  it('formatDuration en minutos y segundos', () => {
    expect(formatDuration(65_000)).toBe('1:05')
    expect(formatDuration(0)).toBe('0:00')
  })
})
