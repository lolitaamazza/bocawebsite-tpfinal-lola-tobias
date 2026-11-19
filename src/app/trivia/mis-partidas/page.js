import Link from 'next/link'
import { Flash, PageHead, ghostButton, primaryButton } from '@/components/account/PageHead'
import { DeleteButton } from '@/components/ui/form'
import { requireUser } from '@/lib/auth'
import { scores } from '@/lib/data/trivia'
import { categoryLabel, formatDuration, formatPoints, formatSeed, replayPath } from '@/lib/domain/trivia'
import { deleteScore } from '../actions'

export const metadata = { title: 'Mis partidas de la trivia', robots: { index: false } }

const MESSAGES = { borrada: 'Partida borrada (y fuera del ranking).' }
const fmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })

/**
 * Privada (Server Component): el uid sale de la cookie de sesión verificada; solo
 * se listan y se pueden borrar las partidas propias.
 */
export default async function MisPartidasPage({ searchParams }) {
  const user = await requireUser('/trivia/mis-partidas')
  const [{ ok }, list] = await Promise.all([searchParams, scores.list(user.uid)])
  const best = list.reduce((m, p) => Math.max(m, p.score), 0)

  return (
    <>
      <PageHead
        eyebrow={`${list.length} ${list.length === 1 ? 'partida' : 'partidas'}${list.length ? ` · mejor puntaje ${formatPoints(best)}` : ''}`}
        title="Mis partidas"
        description="Cada ronda que terminaste con tu cuenta. Si borrás una, sale también del ranking."
      >
        <Link href="/trivia/ranking" className={ghostButton}>
          Ver ranking
        </Link>
        <Link href="/trivia" className={primaryButton}>
          Jugar otra
        </Link>
      </PageHead>
      <Flash ok={ok} messages={MESSAGES} />

      {list.length ? (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {list.map((p) => (
            <li key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-[9px] text-claro/45">
                    {p.createdAt ? fmt.format(new Date(p.createdAt)) : ''} · {categoryLabel(p.category)}
                  </p>
                  <p className="mt-1 font-display text-5xl leading-none text-oro tabular-nums">{formatPoints(p.score)}</p>
                </div>
                <span className={`eyebrow shrink-0 rounded-full border px-3 py-1.5 text-[9px] ${p.ranked ? 'border-oro/40 text-oro' : 'border-white/15 text-claro/50'}`}>
                  {p.ranked ? 'En el ranking' : 'Ronda compartida'}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="eyebrow text-[9px] text-claro/40">Aciertos</dt>
                  <dd className="mt-0.5 font-semibold">
                    {p.correct}/{p.total}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-[9px] text-claro/40">Racha</dt>
                  <dd className="mt-0.5 font-semibold">{p.bestStreak}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-[9px] text-claro/40">Tiempo</dt>
                  <dd className="mt-0.5 font-semibold">{formatDuration(p.durationMs)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-claro/40">
                Como <span className="text-claro/70">{p.displayName}</span> · semilla <span className="font-mono">{formatSeed(p.seed)}</span>
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={replayPath(p.seed, p.category)} className={ghostButton}>
                  Jugar la misma ronda
                </Link>
                <DeleteButton action={deleteScore.bind(null, p.id)} confirmText="¿Borrar esta partida? También sale del ranking." />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center">
          <p className="font-display text-3xl uppercase">Todavía no jugaste</p>
          <p className="mx-auto mt-2 max-w-md text-claro/60">Terminá una ronda con tu cuenta y queda guardada acá.</p>
          <Link href="/trivia" className={`${primaryButton} mt-6`}>
            Jugar la primera
          </Link>
        </div>
      )}
    </>
  )
}
