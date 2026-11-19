import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { questionImage } from '@/lib/data/trivia'
import { getCurrentUser } from '@/lib/firebase/session'

/**
 * Foto de una pregunta de camisetas por una ruta opaca (/trivia/foto/{ronda}/{n}).
 * El archivo real se llama como su año (/museo/1940.webp): mandar esa URL al
 * navegador sería mandar la respuesta. Solo se sirve si la pregunta ya se reveló
 * y la ronda es de quien la pide (o anónima).
 */
const TYPES = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }

const notFound = () => new Response('No encontrada', { status: 404, headers: { 'cache-control': 'no-store' } })

export async function GET(request, { params }) {
  const { ronda, n } = await params
  const index = /^\d{1,2}$/.test(n) ? Number(n) : -1
  const viewer = await getCurrentUser()
  const src = await questionImage({ roundId: ronda, index, userId: viewer?.uid ?? null }).catch(() => null)
  // Solo archivos propios de /public, sin escaparse de la carpeta
  if (!src || !src.startsWith('/') || src.includes('..')) return notFound()
  const type = TYPES[path.extname(src).toLowerCase()]
  if (!type) return notFound()

  const headers = { 'content-type': type, 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff' }
  try {
    const bytes = await readFile(path.join(process.cwd(), 'public', src))
    return new Response(bytes, { headers })
  } catch {
    // En el deploy /public puede no estar en el disco de la función: se pide al CDN propio
    const res = await fetch(new URL(src, request.url)).catch(() => null)
    if (!res?.ok) return notFound()
    return new Response(res.body, { headers })
  }
}
