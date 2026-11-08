import Link from 'next/link'
import { playerByDorsal } from '@/data'
import { Pitch } from './Pitch'

/** Miniatura de un XI guardado: cancha con dorsales y apellido, capitán marcado */
export function LineupCard({ lineup }) {
  return (
    <li>
      <Link href={`/mi-xi/${lineup.id}`} className="group block rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-oro/50">
        <Pitch
          formation={lineup.formation}
          renderSlot={(_, i) => {
            const p = playerByDorsal(lineup.slots[i])
            return p ? (
              <div className="flex flex-col items-center">
                <span className={`grid h-6 w-6 place-items-center rounded-full font-display text-[11px] ${p.dorsal === lineup.captain ? 'bg-oro text-fondo' : 'bg-azul text-claro'}`}>{p.dorsal}</span>
                <span className="mt-0.5 max-w-[9ch] truncate text-[9px] font-semibold text-claro/85 [text-shadow:0_1px_3px_#000]">{p.apellido}</span>
              </div>
            ) : null
          }}
        />
        <div className="flex items-baseline justify-between gap-3 px-1 pt-3">
          <p className="truncate font-semibold">{lineup.name}</p>
          <p className="eyebrow shrink-0 text-oro">{lineup.formation}</p>
        </div>
      </Link>
    </li>
  )
}
