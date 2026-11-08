import squadJson from './squad.json'
import statsJson from './stats.json'
import type { Player, PlayerStats, StatsFile } from '../types'

/** Plantel con dorsal, en el orden en que cuelga (ARQ, DEF, MED, DEL). Ver scripts/fetch_squad.py */
export const squad = squadJson as Player[]

export const stats = statsJson as StatsFile

export const statsFor = (p: Player): PlayerStats | undefined => stats.players[String(p.dorsal)]

export const portraitUrl = (p: Player) => `/jugadores/${p.dorsal}.webp`

export const playerByDorsal = (dorsal: number) => squad.find((p) => p.dorsal === dorsal) ?? null

export const playerById = (id: string) => squad.find((p) => p.id === id) ?? null
