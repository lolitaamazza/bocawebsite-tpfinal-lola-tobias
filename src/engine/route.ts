import type { Player, Selection } from '../types'

/**
 * Rutas compartibles, igual que el original:
 *   /                     el vestuario
 *   /dorsal/5/            ficha del jugador con el 5
 *   /personaliza/?nombre=TOBI&dorsal=10
 */

export interface CustomParams {
  nombre: string
  dorsal: string
}

export function selectionToPath(sel: Selection, players: Player[], custom?: CustomParams): string {
  if (sel === 'custom') {
    const q = new URLSearchParams()
    if (custom?.nombre) q.set('nombre', custom.nombre)
    if (custom?.dorsal) q.set('dorsal', custom.dorsal)
    const qs = q.toString()
    return `/personaliza/${qs ? `?${qs}` : ''}`
  }
  if (sel) {
    const p = players.find((p) => p.id === sel)
    if (p) return `/dorsal/${p.dorsal}/`
  }
  return '/'
}

export function pathToSelection(pathname: string, players: Player[]): Selection {
  if (/^\/personaliza\/?$/.test(pathname)) return 'custom'
  const m = pathname.match(/^\/dorsal\/(\d+)\/?$/)
  if (m) return players.find((p) => p.dorsal === Number(m[1]))?.id ?? null
  return null
}

export function customFromSearch(search: string): CustomParams {
  const q = new URLSearchParams(search)
  return { nombre: q.get('nombre') ?? '', dorsal: q.get('dorsal') ?? '' }
}
