import Link from 'next/link'
import { Flash, PageHead, primaryButton } from '@/components/account/PageHead'
import { LineupCard } from '@/components/lineups/LineupCard'
import { requireUser } from '@/lib/auth'
import { lineups } from '@/lib/data/lineups'

export const metadata = { title: 'Mi XI ideal', robots: { index: false } }

const MESSAGES = { creado: 'Formación guardada.', editado: 'Cambios guardados.', borrado: 'Formación borrada.' }

export default async function MiXiPage({ searchParams }) {
  const user = await requireUser('/mi-xi')
  const [{ ok }, list] = await Promise.all([searchParams, lineups.list(user.uid)])
  return (
    <>
      <PageHead eyebrow={`${list.length} ${list.length === 1 ? 'formación' : 'formaciones'}`} title="Mi XI ideal" description="Armá el equipo que pondrías vos, con el plantel 2026.">
        <Link href="/mi-xi/nuevo" className={primaryButton}>
          + Nuevo XI
        </Link>
      </PageHead>
      <Flash ok={ok} messages={MESSAGES} />
      {list.length ? (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((l) => (
            <LineupCard key={l.id} lineup={l} />
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center">
          <p className="font-display text-3xl uppercase">Todavía no armaste ningún XI</p>
          <p className="mx-auto mt-2 max-w-md text-claro/60">Elegí esquema, once jugadores y capitán.</p>
          <Link href="/mi-xi/nuevo" className={`${primaryButton} mt-6`}>
            Armar mi XI
          </Link>
        </div>
      )}
    </>
  )
}
