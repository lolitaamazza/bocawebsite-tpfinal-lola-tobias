import squadJson from './squad.json'
import statsJson from './stats.json'
/** Plantel con dorsal, en el orden en que cuelga (ARQ, DEF, MED, DEL). Ver scripts/fetch_squad.py */
export const squad = squadJson
export const stats = statsJson
export const statsFor = (p) => stats.players[String(p.dorsal)]
export const portraitUrl = (p) => `/jugadores/${p.dorsal}.webp`
export const playerByDorsal = (dorsal) => squad.find((p) => p.dorsal === dorsal) ?? null
export const playerById = (id) => squad.find((p) => p.id === id) ?? null
