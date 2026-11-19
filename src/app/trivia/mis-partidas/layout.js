import { requireUser } from '@/lib/auth'

/**
 * Página privada: la sesión se verifica acá, fuera de cualquier Suspense, para que
 * sin cookie válida la respuesta sea un 307 al login y no un redirect en streaming.
 */
export default async function MisPartidasLayout({ children }) {
  await requireUser('/trivia/mis-partidas')
  return children
}
