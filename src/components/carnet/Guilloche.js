import { CARD, guillochePaths } from './cardArt'

// Versión liviana del guilloche del carnet (menos puntos): decora el hero
const { rings, rosette } = guillochePaths({ quality: 0.4 })

/** Guilloche en SVG (Server Component, sin JS): mismo dibujo que el fondo del carnet */
export function Guilloche({ className = '' }) {
  return (
    <svg viewBox={`0 0 ${CARD.w} ${CARD.h}`} className={className} fill="none" stroke="currentColor" strokeWidth={0.7} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d={rings} />
      <path d={rosette} opacity={0.7} />
    </svg>
  )
}
