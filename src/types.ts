/** Línea del equipo. Mismo orden en el que cuelgan las camisetas. */
export type PosKey = 'ARQ' | 'DEF' | 'MED' | 'DEL'

export interface Player {
  id: string
  dorsal: number
  /** Lo que va estampado en la espalda */
  shirt: string
  nombre: string
  apellido: string
  pos: PosKey
  rol: string
  edad: number
  pais: string
  bandera: string
  procedencia: string
  contrato: number | null
  capitan: boolean
  tm: number
  /** Solo la remera personalizada: número a estampar si difiere del dorsal */
  estampado?: string
}

export interface PlayerStats {
  conv: number
  pj: number
  tit: number
  goles: number
  asist: number
  ta: number
  tr: number
  min: number
}

export interface StatsFile {
  meta: { source: string; competition: string; fetched: string }
  players: Record<string, PlayerStats>
}

/** Qué hay abierto en la ficha: nada, un jugador o el personalizador */
export type Selection = string | 'custom' | null
