import { redirect } from 'next/navigation'
import { getSessionUser } from './firebase/session.js'

/**
 * Usuario de la sesión o, si no hay, al login (volviendo después a `next`).
 * La usan las páginas privadas y todas las Server Actions: nunca se confía en
 * un uid que venga del cliente.
 */
export async function requireUser(next = '/mis-remeras') {
  const user = await getSessionUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`)
  return user
}
