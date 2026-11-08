import Link from 'next/link'
import { JerseyPreview } from './JerseyPreview'

const fmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Tarjeta de la lista: previa de la espalda, datos y acceso a editar */
export function JerseyCard({ jersey }) {
  return (
    <li>
      <Link
        href={`/mis-remeras/${jersey.id}`}
        className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-colors hover:border-oro/50 focus-visible:border-oro"
      >
        <div className="aspect-[800/1035] bg-[radial-gradient(80%_60%_at_50%_30%,#14275c_0%,#050a18_80%)] p-5 transition-transform duration-500 group-hover:scale-[1.02]">
          <JerseyPreview name={jersey.name} number={jersey.number} />
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-white/10 px-4 py-3">
          <p className="truncate font-dorsal text-lg tracking-[0.06em]">
            {jersey.name} <span className="text-oro">{jersey.number}</span>
          </p>
          <p className="eyebrow shrink-0 text-claro/45">Talle {jersey.size}</p>
        </div>
        {jersey.note ? <p className="line-clamp-2 px-4 pb-3 text-sm text-claro/55">{jersey.note}</p> : null}
        <p className="eyebrow px-4 pb-4 text-[9px] text-claro/35">{jersey.createdAt ? fmt.format(new Date(jersey.createdAt)) : ''}</p>
      </Link>
    </li>
  )
}
