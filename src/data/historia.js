import { piezas } from '@/app/museo/piezas'
import fotos from './historia-fotos.json'

/**
 * Sección Historia: cada camiseta del museo (datos de Lola en app/museo/piezas.js)
 * con su foto real de época (Wikimedia Commons, ver scripts/fetch_historia.py).
 * Una pieza sin foto de producto se muestra solo con la foto de ambiente.
 */
export const historia = piezas.map((p, i) => ({
  ...p,
  index: i + 1,
  foto: fotos[p.id] ?? null,
}))

export const fotosHistoria = fotos

/** "1905" → "1905", "1908–1913" → "1908" (para el número gigante del panel) */
export const anioCorto = (year) => String(year).slice(0, 4)
