import Link from 'next/link'
import { connection } from 'next/server'
import { PageHead, primaryButton } from '@/components/account/PageHead'
import { leaderboard } from '@/lib/data/trivia'
import { categoryLabel, formatDuration, formatPoints } from '@/lib/domain/trivia'
import { getCurrentUser } from '@/lib/firebase/session'

export const metadata = {
  title: 'Ranking de la trivia',
  description: 'Los 20 mejores puntajes de la Trivia xeneize. A igual puntaje, gana quien respondió más rápido.',
  alternates: { canonical: '/trivia/ranking' },
}

const TOP = 20
const fmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' })

/**
 * Ranking público (Server Component): lee con Admin SDK las 20 mejores partidas.
 * Solo viajan nombre público, puntaje y tiempos; nunca uid, email ni semilla.
 */
export default async function RankingPage() {
  await connection()
  const viewer = await getCurrentUser()
  const list = await leaderboard({ limit: TOP, viewerId: viewer?.uid ?? null })

  return (
    <>
      <PageHead eyebrow={`Top ${TOP} · a igual puntaje, gana el más rápido`} title="Ranking" description="Solo cuentan las rondas con cuenta y semilla nueva. Las rondas compartidas se juegan, pero no suman acá.">
        <Link href="/trivia" className={primaryButton}>
          Jugar una ronda
        </Link>
      </PageHead>

      {list.length ? (
        <ol className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          <li aria-hidden="true" className="eyebrow hidden grid-cols-[3rem_1fr_6rem_5rem_5rem_7rem] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-[9px] text-claro/45 md:grid">
            <span>#</span>
            <span>Hincha</span>
            <span className="text-right">Puntos</span>
            <span className="text-right">Aciertos</span>
            <span className="text-right">Tiempo</span>
            <span className="text-right">Categoría</span>
          </li>
          {list.map((e, i) => (
            <li
              key={e.id}
              className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-white/[0.06] px-4 py-3 last:border-b-0 md:grid-cols-[3rem_1fr_6rem_5rem_5rem_7rem] ${e.mine ? 'bg-oro/[0.08]' : ''}`}
            >
              <span className={`font-display text-2xl ${i < 3 ? 'text-oro' : 'text-claro/50'}`}>{i + 1}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {e.displayName}
                  {e.mine ? <span className="eyebrow ml-2 text-[9px] text-oro">Vos</span> : null}
                </span>
                <span className="eyebrow block text-[9px] text-claro/40 md:hidden">
                  {e.correct}/{e.total} · {formatDuration(e.durationMs)} · {categoryLabel(e.category)}
                </span>
                <span className="eyebrow hidden text-[9px] text-claro/35 md:block">{e.finishedAt ? fmt.format(new Date(e.finishedAt)) : ''}</span>
              </span>
              <span className="text-right font-display text-2xl tabular-nums">{formatPoints(e.score)}</span>
              <span className="hidden text-right font-mono text-sm text-claro/70 md:block">
                {e.correct}/{e.total}
              </span>
              <span className="hidden text-right font-mono text-sm text-claro/70 md:block">{formatDuration(e.durationMs)}</span>
              <span className="hidden text-right text-sm text-claro/60 md:block">{categoryLabel(e.category)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-10 rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center">
          <p className="font-display text-3xl uppercase">Ranking vacío</p>
          <p className="mx-auto mt-2 max-w-md text-claro/60">Nadie jugó todavía con cuenta. El primer puesto está libre.</p>
          <Link href="/trivia" className={`${primaryButton} mt-6`}>
            Estrenar el ranking
          </Link>
        </div>
      )}
    </>
  )
}
