import { FORMATIONS } from '@/lib/domain/lineups'

/**
 * Cancha vertical (arco propio abajo) con un puesto por jugador. Sirve para la
 * miniatura de la lista y para el formulario: cada puesto se renderiza con
 * `renderSlot(slot, index)`.
 */
export function Pitch({ formation, renderSlot, className = '' }) {
  const slots = FORMATIONS[formation] ?? FORMATIONS['4-3-3']
  return (
    <div className={`relative aspect-[68/90] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b2a1a] ${className}`}>
      {/* franjas de césped */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.035)_0_10%,transparent_10%_20%)]" />
      {/* líneas */}
      <svg viewBox="0 0 68 90" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <g fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.35">
          <rect x="2" y="2" width="64" height="86" />
          <line x1="2" y1="45" x2="66" y2="45" />
          <circle cx="34" cy="45" r="7.5" />
          <rect x="18" y="2" width="32" height="13" />
          <rect x="26" y="2" width="16" height="5" />
          <rect x="18" y="75" width="32" height="13" />
          <rect x="26" y="83" width="16" height="5" />
        </g>
      </svg>
      {slots.map((slot, i) => (
        <div key={`${formation}-${i}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
          {renderSlot(slot, i)}
        </div>
      ))}
    </div>
  )
}
