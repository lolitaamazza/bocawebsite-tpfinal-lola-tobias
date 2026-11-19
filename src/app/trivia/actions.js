'use server'

import { getRandomValues } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { NotFoundError } from '@/lib/data/ownedCollection'
import { RoundError, answerQuestion, finishRound, revealQuestion, scores, startRound as createRound } from '@/lib/data/trivia'
import { ERRORS, NO_ANSWER, SEED_LENGTH, displayNameFor, normalizeSeed, parseCategory, seedFromBytes } from '@/lib/domain/trivia'
import { getCurrentUser } from '@/lib/firebase/session'
import { bank } from './bank'

/**
 * Server Actions de la trivia. Reglas:
 * - El uid sale de la cookie de sesión, nunca del cliente. Sin sesión se juega
 *   igual, pero la ronda no se guarda ni entra al ranking.
 * - Respuestas, semilla e ids de preguntas no viajan al navegador hasta que
 *   corresponde (la respuesta al responder, la semilla al terminar).
 * - Todo vuelve como { ok, ... } o { error }: los errores se muestran en pantalla.
 */

const GENERIC = 'Se cortó la conexión con el vestuario. Probá de nuevo.'

function fail(e) {
  if (e instanceof RoundError) return { error: e.message, code: e.code }
  if (e instanceof NotFoundError) return { error: ERRORS['not-found'], code: 'not-found' }
  console.error('[trivia]', e)
  return { error: GENERIC }
}

async function viewer() {
  const decoded = await getCurrentUser()
  return decoded ? { uid: decoded.uid, name: decoded.name ?? '' } : null
}

const asIndex = (v) => (Number.isInteger(v) ? v : Number.NaN)

/**
 * Arranca una ronda. Con `seed` (link de "jugá la misma ronda") se repiten las
 * preguntas de otro, pero no suma al ranking: esa semilla ya se conoce.
 * @param {{ category?: string, seed?: string, nickname?: string }} input
 */
export async function startRound(input) {
  const category = parseCategory(input?.category)
  if (!category) return { error: ERRORS.category, code: 'category' }
  const chosen = normalizeSeed(input?.seed)
  const seed = chosen || seedFromBytes(getRandomValues(new Uint8Array(SEED_LENGTH)))
  try {
    const user = await viewer()
    const displayName = user ? displayNameFor({ nickname: input?.nickname, tokenName: user.name }) : null
    const round = await createRound({ bank, category, seed, ranked: !chosen, userId: user?.uid ?? null, displayName })
    return { ok: true, ...round, displayName }
  } catch (e) {
    return fail(e)
  }
}

/** Pide la pregunta siguiente: su reloj de 20 s arranca recién ahora */
export async function nextQuestion(roundId, index) {
  try {
    const user = await viewer()
    const question = await revealQuestion({ roundId: String(roundId ?? ''), index: asIndex(index), userId: user?.uid ?? null })
    return { ok: true, question }
  } catch (e) {
    return fail(e)
  }
}

/** Responde la pregunta `index` con la opción `choice` (-1 = se acabó el tiempo) */
export async function answer(roundId, index, choice) {
  try {
    const user = await viewer()
    const pick = choice === null || choice === undefined ? NO_ANSWER : asIndex(choice)
    const feedback = await answerQuestion({ roundId: String(roundId ?? ''), index: asIndex(index), choice: pick, userId: user?.uid ?? null })
    return { ok: true, feedback }
  } catch (e) {
    return fail(e)
  }
}

/** Cierra la ronda: el puntaje se calcula acá con las respuestas guardadas */
export async function finish(roundId) {
  try {
    const user = await viewer()
    const out = await finishRound({ roundId: String(roundId ?? ''), userId: user?.uid ?? null })
    return { ok: true, ...out }
  } catch (e) {
    return fail(e)
  }
}

/** Baja de una partida propia ("Mis partidas"). Otra persona no puede borrarla. */
export async function deleteScore(id) {
  const user = await requireUser('/trivia/mis-partidas')
  await scores.remove(user.uid, String(id ?? ''))
  revalidatePath('/trivia/mis-partidas')
  revalidatePath('/trivia/ranking')
  redirect('/trivia/mis-partidas?ok=borrada')
}
