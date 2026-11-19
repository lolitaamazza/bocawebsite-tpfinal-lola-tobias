import { FLAT, HX, HZ, OUTER, PITCH, TIERS, bandOutline } from '@/three/bombonera/layout'

/**
 * Plano de la Bombonera visto desde arriba, dibujado con las mismas medidas que
 * la maqueta 3D. Es la versión sin WebGL: marca la ubicación elegida.
 */
const PAD = 4
const X0 = -(HX + OUTER + PAD)
const Z0 = -(HZ + FLAT.back + PAD)
const W = 2 * (HX + OUTER + PAD)
const H = HZ + OUTER + PAD - Z0
const TIER_FILL = { baja: '#2b4fc4', media: '#d9a63c', alta: '#1d3c8f' }
const path = (pts) => `M${pts.map(([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`).join('L')}Z`
const BANDS = TIERS.map((t) => ({ id: t.id, d: path(bandOutline(t.d0, t.dEnd)) }))
const SHELL = path(bandOutline(TIERS.at(-1).dEnd, OUTER))

export function Plano({ spots, activeId, onSelect }) {
  const L = PITCH.length / 2
  const Wd = PITCH.width / 2
  return (
    <svg
      viewBox={`${X0} ${Z0} ${W} ${H}`}
      role="img"
      aria-label="Plano de la Bombonera visto desde arriba: tres lados de tribunas curvas en tres bandejas y, arriba, el lado recto de los palcos."
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={SHELL} fill="#0f1422" />
      {BANDS.map((b) => (
        <path key={b.id} d={b.d} fill={TIER_FILL[b.id]} fillOpacity={0.75} stroke="#03060e" strokeWidth={0.4} />
      ))}
      {/* lado recto: platea y palcos */}
      <rect x={-HX} y={-HZ - FLAT.platea.dEnd} width={2 * HX} height={FLAT.platea.dEnd} fill="#2b4fc4" fillOpacity={0.7} />
      <rect x={-HX - OUTER} y={-HZ - FLAT.back} width={2 * (HX + OUTER)} height={FLAT.back - FLAT.platea.dEnd} fill="#d9a63c" fillOpacity={0.55} />
      <text x={0} y={-HZ - FLAT.back + 5.5} textAnchor="middle" fontSize={4} fill="#03060e" className="font-mono uppercase">
        Palcos · lado recto
      </text>
      {/* cancha */}
      <rect x={-HX} y={-HZ} width={2 * HX} height={2 * HZ} fill="#24552a" />
      <g fill="none" stroke="#f1ede3" strokeOpacity={0.85} strokeWidth={0.35}>
        <rect x={-L} y={-Wd} width={PITCH.length} height={PITCH.width} fill="#2f6a33" />
        <line x1={0} y1={-Wd} x2={0} y2={Wd} />
        <circle cx={0} cy={0} r={PITCH.circle} />
        {[-1, 1].map((s) => (
          <g key={s}>
            <rect x={s < 0 ? -L : L - PITCH.penaltyDepth} y={-PITCH.penaltyWidth / 2} width={PITCH.penaltyDepth} height={PITCH.penaltyWidth} />
            <rect x={s < 0 ? -L : L - PITCH.goalAreaDepth} y={-PITCH.goalAreaWidth / 2} width={PITCH.goalAreaDepth} height={PITCH.goalAreaWidth} />
          </g>
        ))}
      </g>
      <text x={-HX - OUTER / 2} y={2} textAnchor="middle" fontSize={3.6} fill="#f1ede3" className="font-mono uppercase" transform={`rotate(-90 ${-HX - OUTER / 2} 2)`}>
        Casa Amarilla
      </text>
      {spots.map((s, i) => {
        const on = s.id === activeId
        return (
          <g
            key={s.id}
            onClick={() => onSelect?.(s)}
            className="cursor-pointer"
            aria-hidden="true"
          >
            <circle cx={s.seat.x} cy={s.seat.z} r={on ? 4.6 : 3.6} fill={on ? '#f0c057' : '#03060e'} stroke="#f0c057" strokeWidth={0.8} />
            <text x={s.seat.x} y={s.seat.z + 1.4} textAnchor="middle" fontSize={4} fontWeight={700} fill={on ? '#03060e' : '#f0c057'}>
              {i + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
