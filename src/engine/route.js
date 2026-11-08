export function selectionToPath(sel, players, custom) {
  if (sel === 'custom') {
    const q = new URLSearchParams()
    if (custom?.nombre) q.set('nombre', custom.nombre)
    if (custom?.dorsal) q.set('dorsal', custom.dorsal)
    const qs = q.toString()
    return `/personaliza${qs ? `?${qs}` : ''}`
  }
  if (sel) {
    const p = players.find((p) => p.id === sel)
    if (p) return `/dorsal/${p.dorsal}`
  }
  return '/'
}
export function pathToSelection(pathname, players) {
  if (/^\/personaliza\/?$/.test(pathname)) return 'custom'
  const m = pathname.match(/^\/dorsal\/(\d+)\/?$/)
  if (m) return players.find((p) => p.dorsal === Number(m[1]))?.id ?? null
  return null
}
export function customFromSearch(search) {
  const q = new URLSearchParams(search)
  return { nombre: q.get('nombre') ?? '', dorsal: q.get('dorsal') ?? '' }
}
