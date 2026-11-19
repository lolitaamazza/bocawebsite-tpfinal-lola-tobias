#!/usr/bin/env node
// Smoke de la trivia contra el Firestore real, con el mismo código que usan las
// Server Actions (banco de preguntas, capa de datos y reglas del dominio).
// Prueba: ronda anónima y con cuenta, anti trampa (fuera de orden, doble
// respuesta, sin revelar, de otro usuario, fuera de tiempo, vencida), cierre
// idempotente, ranking, ronda compartida fuera del ranking, determinismo por
// semilla, foto opaca y baja de partidas. Limpia todo lo que crea.
// Uso: node --env-file=.env.local scripts/smoke-trivia.mjs
import { registerHooks } from 'node:module'

// Los datos del repo importan JSON sin atributo (como en Next): se lo agrega acá
registerHooks({
  load(url, context, next) {
    if (url.endsWith('.json')) return next(url, { ...context, importAttributes: { ...context.importAttributes, type: 'json' } })
    return next(url, context)
  },
})

const { bank } = await import('../src/app/trivia/bank.js')
const T = await import('../src/lib/data/trivia.js')
const D = await import('../src/lib/domain/trivia.js')
const { NotFoundError } = await import('../src/lib/data/ownedCollection.js')

const stamp = Date.now()
const A = `smoke-trivia-a-${stamp}`
const B = `smoke-trivia-b-${stamp}`
const createdRounds = []
const createdScores = []
let failed = 0

function check(label, ok) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed++
}
async function rejects(label, code, fn) {
  try {
    await fn()
    check(`${label} (no lo rechazó)`, false)
  } catch (e) {
    const got = e instanceof NotFoundError ? 'not-found' : e.code
    check(label, got === code)
    if (got !== code) console.log(`   esperaba ${code}, llegó ${got ?? e.message}`)
  }
}
async function start(opts) {
  const r = await T.startRound({ bank, ...opts })
  createdRounds.push(r.roundId)
  return r
}
const wrongOf = (q) => (q.answerIndex + 1) % q.options.length

/** Juega una ronda entera con el reloj controlado: `plan[i]` = { ok, ms } */
async function playAll(roundId, userId, plan, t0) {
  let t = t0
  const stored = await T.readRound(roundId)
  for (let i = 0; i < stored.questions.length; i++) {
    if (i > 0) {
      t += 400
      await T.revealQuestion({ roundId, index: i, userId, now: t })
    }
    t += plan[i]?.ms ?? 1_500
    const q = stored.questions[i]
    await T.answerQuestion({ roundId, index: i, choice: plan[i]?.ok === false ? wrongOf(q) : q.answerIndex, userId, now: t })
  }
  return t
}

try {
  console.log('\nRonda anónima')
  const anonSeed = `smokeanon${stamp}`
  const anon = await start({ category: 'historia', seed: anonSeed, ranked: true })
  check('arranca con la pregunta 1 de 10 y 4 opciones', anon.question.index === 0 && anon.total === 10 && anon.question.options.length === 4)
  const payload = JSON.stringify(anon)
  check('al navegador no viajan respuesta, fuente, id ni semilla', !/answerIndex|source|curada-|smokeanon/.test(payload))
  const anonStored = await T.readRound(anon.roundId)
  check('la ronda guardada tiene las respuestas (solo servidor)', anonStored.questions.every((q) => Number.isInteger(q.answerIndex)))
  check('anónima: sin dueño ni nombre público', anonStored.userId === null && anonStored.displayName === null && anon.saved === false)
  const tA = await playAll(anon.roundId, null, [], Date.now())
  const anonDone = await T.finishRound({ roundId: anon.roundId, userId: null, now: tA })
  check('anónima: se puede terminar pero no se guarda', anonDone.saved === false && anonDone.result.correct === 10)

  console.log('\nRonda con cuenta (rankeada)')
  const t0 = Date.now()
  const mine = await start({ category: 'mixta', seed: `smokeuser${stamp}`, ranked: true, userId: A, displayName: D.displayNameFor({ nickname: 'Smoke', tokenName: 'smoke@test.com' }), now: t0 })
  const ms = await T.readRound(mine.roundId)
  check('mixta: 10 preguntas de las 4 categorías', new Set(ms.questions.map((q) => q.category)).size === 4)
  await rejects('rechaza responder fuera de orden', 'out-of-order', () => T.answerQuestion({ roundId: mine.roundId, index: 2, choice: 0, userId: A, now: t0 + 500 }))
  await rejects('otro usuario no puede jugar mi ronda', 'not-found', () => T.answerQuestion({ roundId: mine.roundId, index: 0, choice: 0, userId: B, now: t0 + 500 }))
  await rejects('sin sesión tampoco', 'not-found', () => T.answerQuestion({ roundId: mine.roundId, index: 0, choice: 0, userId: null, now: t0 + 500 }))
  await rejects('rechaza una opción que no existe', 'invalid-choice', () => T.answerQuestion({ roundId: mine.roundId, index: 0, choice: 7, userId: A, now: t0 + 500 }))
  const f0 = await T.answerQuestion({ roundId: mine.roundId, index: 0, choice: ms.questions[0].answerIndex, userId: A, now: t0 + 1_000 })
  check('corrige con el reloj del servidor: 1 s → 100 + 48', f0.correct && f0.points === 148 && f0.answerIndex === ms.questions[0].answerIndex)
  check('la devolución trae la fuente', /^https:/.test(f0.source?.url ?? ''))
  await rejects('rechaza responder dos veces', 'duplicate', () => T.answerQuestion({ roundId: mine.roundId, index: 0, choice: 1, userId: A, now: t0 + 1_200 }))
  await rejects('rechaza responder sin haber visto la pregunta', 'not-revealed', () => T.answerQuestion({ roundId: mine.roundId, index: 1, choice: 0, userId: A, now: t0 + 1_300 }))
  const q1 = await T.revealQuestion({ roundId: mine.roundId, index: 1, userId: A, now: t0 + 2_000 })
  const q1again = await T.revealQuestion({ roundId: mine.roundId, index: 1, userId: A, now: t0 + 8_000 })
  check('pedir de nuevo la pregunta no reinicia el reloj', q1.remainingMs === D.QUESTION_MS && q1again.remainingMs === D.QUESTION_MS - 6_000)
  const late = t0 + 2_000 + D.QUESTION_MS + D.LATENCY_GRACE_MS + 1_000
  const f1 = await T.answerQuestion({ roundId: mine.roundId, index: 1, choice: ms.questions[1].answerIndex, userId: A, now: late })
  check('la correcta fuera de tiempo cuenta como tiempo cumplido (0 pts)', f1.timedOut && !f1.correct && f1.points === 0)
  let t = late
  for (let i = 2; i < 10; i++) {
    t += 300
    await T.revealQuestion({ roundId: mine.roundId, index: i, userId: A, now: t })
    t += 2_000
    await T.answerQuestion({ roundId: mine.roundId, index: i, choice: i === 5 ? wrongOf(ms.questions[i]) : ms.questions[i].answerIndex, userId: A, now: t })
  }
  await rejects('otro usuario no puede cerrar mi ronda', 'not-found', () => T.finishRound({ roundId: mine.roundId, userId: B, now: t }))
  const done = await T.finishRound({ roundId: mine.roundId, userId: A, now: t })
  createdScores.push(mine.roundId)
  const after = await T.readRound(mine.roundId)
  const expected = D.summarize(after.answers)
  check('el puntaje sale de las respuestas guardadas', done.result.score === expected.score && done.result.correct === 8 && done.saved)
  check('nombre público: el apodo, nunca el email', done.displayName === 'Smoke')
  const again = await T.finishRound({ roundId: mine.roundId, userId: A, now: t + 5_000 })
  check('cerrar dos veces devuelve lo mismo', JSON.stringify(again.result) === JSON.stringify(done.result))
  const list = await T.scores.list(A)
  check('Mis partidas: una sola partida guardada para la ronda', list.filter((p) => p.id === mine.roundId).length === 1 && list.length === 1)
  check('la partida guardada tiene puntaje, tiempo y categoría', list[0].score === done.result.score && list[0].durationMs === expected.durationMs && list[0].category === 'mixta')
  await rejects('después de cerrar no se aceptan respuestas', 'finished', () => T.answerQuestion({ roundId: mine.roundId, index: 9, choice: 0, userId: A, now: t + 1 }))
  const board = await T.leaderboard({ limit: 20, viewerId: A })
  const entry = board.find((e) => e.id === mine.roundId)
  const cutoff = board.length === 20 ? board[19].score : -1
  check('aparece en el ranking (o el top 20 ya está lleno de mejores)', Boolean(entry) || cutoff > done.result.score)
  if (entry) check('el ranking la marca como "mía" y no expone uid ni semilla', entry.mine && !('userId' in entry) && !('seed' in entry))
  check('el ranking está ordenado por puntaje y tiempo', board.every((e, i) => i === 0 || D.compareEntries(board[i - 1], e) <= 0))

  console.log('\nRonda compartida (semilla elegida)')
  const shared = await start({ category: 'plantel', seed: `smokeshared${stamp}`, ranked: false, userId: A, displayName: 'Smoke' })
  const tS = await playAll(shared.roundId, A, [], Date.now())
  const sharedDone = await T.finishRound({ roundId: shared.roundId, userId: A, now: tS })
  createdScores.push(shared.roundId)
  const board2 = await T.leaderboard({ limit: 50, viewerId: A })
  check('se guarda en Mis partidas pero no entra al ranking', sharedDone.saved && !sharedDone.result.ranked && !board2.some((e) => e.id === shared.roundId))
  const twin = await start({ category: 'plantel', seed: `smokeshared${stamp}`, ranked: false })
  const [s1, s2] = await Promise.all([T.readRound(shared.roundId), T.readRound(twin.roundId)])
  check('misma semilla y categoría → mismas preguntas y mismo orden de opciones', JSON.stringify(s1.questions) === JSON.stringify(s2.questions))

  console.log('\nVencimiento y foto')
  const tE = Date.now()
  const old = await start({ category: 'camisetas', seed: `smokeold${stamp}`, ranked: true, userId: A, displayName: 'Smoke', now: tE })
  const oldStored = await T.readRound(old.roundId)
  const img = await T.questionImage({ roundId: old.roundId, index: 0, userId: A })
  check('la foto de la pregunta revelada sale por la ruta opaca', typeof img === 'string' && img === oldStored.questions[0].image)
  check('la foto de una pregunta sin revelar no sale', (await T.questionImage({ roundId: old.roundId, index: 1, userId: A })) === null)
  check('la foto de una ronda ajena no sale', (await T.questionImage({ roundId: old.roundId, index: 0, userId: B })) === null)
  await rejects('rechaza responder con la ronda vencida', 'expired', () =>
    T.answerQuestion({ roundId: old.roundId, index: 0, choice: 0, userId: A, now: oldStored.expiresAt + 1 }),
  )

  console.log('\nBaja de partidas')
  await rejects('otro usuario no puede borrar mi partida', 'not-found', () => T.scores.remove(B, mine.roundId))
  await T.scores.remove(A, mine.roundId)
  createdScores.splice(createdScores.indexOf(mine.roundId), 1)
  check('baja: ya no está en Mis partidas', (await T.scores.get(A, mine.roundId)) === null)
  check('baja: ya no está en el ranking', !(await T.leaderboard({ limit: 50 })).some((e) => e.id === mine.roundId))
} catch (e) {
  console.error('\nError inesperado:', e.message)
  failed++
} finally {
  for (const id of createdScores) await T.scores.remove(A, id).catch(() => {})
  for (const id of createdRounds) await T.deleteRound(id).catch(() => {})
  const leftovers = (await T.scores.list(A)).length + (await T.scores.list(B)).length
  const roundsLeft = (await Promise.all(createdRounds.map((id) => T.readRound(id)))).filter(Boolean).length
  check(`limpieza: ${createdRounds.length} rondas y las partidas de prueba borradas`, leftovers === 0 && roundsLeft === 0)
}

console.log(failed ? `\n${failed} chequeo(s) fallaron` : '\nTrivia OK contra Firestore')
process.exit(failed ? 1 : 0)
