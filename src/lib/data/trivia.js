import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getDb } from '../firebase/firestore.js'
import {
  ERRORS,
  answerStep,
  compareEntries,
  finishStep,
  imageFor,
  newRound,
  rankKey,
  revealStep,
} from '../domain/trivia.js'
import { NotFoundError, ownedCollection } from './ownedCollection.js'

/**
 * Persistencia de la trivia. Solo servidor (Admin SDK); las reglas de Firestore
 * cierran `trivia_rounds` y `trivia_scores` al navegador (regla comodín: nada).
 * Cada paso de una ronda corre en una transacción: dos clics rápidos o un
 * reintento de red no pueden responder dos veces la misma pregunta.
 */

export const ROUNDS = 'trivia_rounds'
export const SCORES = 'trivia_scores'
/** Campo para una política TTL de Firestore: las rondas abandonadas se borran solas */
const ROUND_DOC_TTL_MS = 24 * 60 * 60_000

export class RoundError extends Error {
  constructor(code) {
    super(ERRORS[code] ?? 'No se pudo completar la jugada.')
    this.name = 'RoundError'
    this.code = code
  }
}

const iso = (ts) => ts?.toDate?.().toISOString() ?? null
const rounds = () => getDb().collection(ROUNDS)
const scoresCol = () => getDb().collection(SCORES)

/** Partidas guardadas de cada usuario ("Mis partidas"): listar y borrar las propias */
export const scores = ownedCollection(SCORES, (d) => ({
  displayName: String(d.displayName ?? ''),
  score: Number(d.score ?? 0),
  correct: Number(d.correct ?? 0),
  total: Number(d.total ?? 0),
  durationMs: Number(d.durationMs ?? 0),
  bestStreak: Number(d.bestStreak ?? 0),
  category: String(d.category ?? 'mixta'),
  seed: String(d.seed ?? ''),
  ranked: Boolean(d.ranked),
}))

const validId = (id) => typeof id === 'string' && /^[A-Za-z0-9]{10,40}$/.test(id)

/** Una ronda con dueño solo la juega su dueño; una anónima, quien tenga el id */
function assertPlayer(data, userId) {
  if (data.userId && data.userId !== userId) throw new NotFoundError()
}

/**
 * Lee la ronda dentro de una transacción, aplica un paso puro del dominio y
 * guarda solo los campos que cambió.
 */
async function step(roundId, userId, apply) {
  if (!validId(roundId)) throw new NotFoundError()
  const db = getDb()
  return db.runTransaction(async (tx) => {
    const ref = rounds().doc(roundId)
    const snap = await tx.get(ref)
    if (!snap.exists) throw new NotFoundError()
    const round = snap.data()
    assertPlayer(round, userId)
    const out = apply(round, tx)
    if (out.error) throw new RoundError(out.error)
    if (out.patch && Object.keys(out.patch).length) tx.update(ref, out.patch)
    return out
  })
}

/**
 * Crea la ronda con la primera pregunta ya revelada (un solo viaje para empezar).
 * Devuelve solo lo público: ni respuestas, ni ids de preguntas, ni la semilla.
 */
export async function startRound({ bank, category, seed, ranked, userId = null, displayName = null, now = Date.now() }) {
  const round = newRound({ bank, seed, category, ranked, userId, displayName, now })
  const ref = rounds().doc()
  await ref.set({ ...round, expireAt: Timestamp.fromMillis(now + ROUND_DOC_TTL_MS), createdAt: FieldValue.serverTimestamp() })
  const first = revealStep(round, 0, now)
  return { roundId: ref.id, total: round.questions.length, category, ranked: round.ranked, saved: Boolean(userId), expiresAt: round.expiresAt, question: first.question }
}

/** Revela la pregunta `index` (arranca su reloj en el servidor) */
export async function revealQuestion({ roundId, index, userId = null, now }) {
  const out = await step(roundId, userId, (round) => {
    const at = now ?? Date.now()
    const r = revealStep(round, index, at)
    if (r.error) return r
    return { question: r.question, patch: r.round === round ? null : { revealedAt: r.round.revealedAt } }
  })
  return out.question
}

/** Corrige con el reloj del servidor y devuelve la correcta, la fuente y el puntaje parcial */
export async function answerQuestion({ roundId, index, choice, userId = null, now }) {
  const out = await step(roundId, userId, (round) => {
    const r = answerStep(round, index, choice, now ?? Date.now())
    if (r.error) return r
    return { feedback: r.feedback, patch: { answers: r.round.answers } }
  })
  return out.feedback
}

/**
 * Cierra la ronda y, si es de un usuario, guarda la partida con el mismo id que
 * la ronda: repetir el cierre no duplica la partida. Solo las que suman al
 * ranking llevan `rank` (las demás no aparecen en la consulta ordenada por rank).
 */
export async function finishRound({ roundId, userId = null, now }) {
  const out = await step(roundId, userId, (round, tx) => {
    const at = now ?? Date.now()
    const r = finishStep(round, at)
    if (r.error) return r
    if (r.already) return { result: r.result, saved: Boolean(round.userId), displayName: round.displayName ?? null }
    if (round.userId) {
      const res = r.result
      tx.set(scoresCol().doc(roundId), {
        userId: round.userId,
        displayName: round.displayName,
        score: res.score,
        correct: res.correct,
        total: res.total,
        durationMs: res.durationMs,
        bestStreak: res.bestStreak,
        category: res.category,
        seed: res.seed,
        ranked: res.ranked,
        ...(res.ranked ? { rank: rankKey(res.score, res.durationMs) } : {}),
        createdAt: Timestamp.fromMillis(at),
        updatedAt: Timestamp.fromMillis(at),
      })
    }
    return {
      result: r.result,
      saved: Boolean(round.userId),
      displayName: round.displayName ?? null,
      patch: { status: 'finished', finishedAt: at, result: r.result },
    }
  })
  return { result: out.result, saved: out.saved, displayName: out.displayName }
}

/** La foto de una pregunta ya revelada (o null). La ruta de la foto no viaja nunca al navegador. */
export async function questionImage({ roundId, index, userId = null }) {
  if (!validId(roundId)) return null
  const snap = await rounds().doc(roundId).get()
  if (!snap.exists) return null
  const round = snap.data()
  if (round.userId && round.userId !== userId) return null
  return imageFor(round, index)
}

/**
 * Ranking público: las `limit` mejores partidas que suman al ranking. Un solo
 * campo ordenable (`rank` = puntaje y, a igual puntaje, menos tiempo), así que
 * alcanza con el índice simple automático de Firestore.
 * Devuelve solo lo que se muestra: nunca el uid ni la semilla.
 */
export async function leaderboard({ limit = 20, viewerId = null } = {}) {
  const snap = await scoresCol().orderBy('rank', 'desc').limit(limit).get()
  return snap.docs
    .map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        displayName: String(d.displayName ?? ''),
        score: Number(d.score ?? 0),
        correct: Number(d.correct ?? 0),
        total: Number(d.total ?? 0),
        durationMs: Number(d.durationMs ?? 0),
        category: String(d.category ?? 'mixta'),
        finishedAt: iso(d.createdAt),
        mine: Boolean(viewerId) && d.userId === viewerId,
      }
    })
    .sort(compareEntries)
}

/** Solo para el smoke: borra una ronda de prueba */
export async function deleteRound(roundId) {
  if (validId(roundId)) await rounds().doc(roundId).delete()
}

/** Solo para el smoke: lee una ronda tal cual está guardada */
export async function readRound(roundId) {
  const snap = await rounds().doc(roundId).get()
  return snap.exists ? snap.data() : null
}

export { NotFoundError }
