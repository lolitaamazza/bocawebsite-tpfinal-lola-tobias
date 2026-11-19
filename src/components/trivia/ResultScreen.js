'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { categoryLabel, formatDuration, formatPoints, formatSeed, maxScore, shareText } from '@/lib/domain/trivia'

gsap.registerPlugin(useGSAP)

/** Comparte con la hoja nativa si hay; si no, copia el texto */
async function share(text) {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Trivia xeneize', text })
      return 'Compartido.'
    }
    await navigator.clipboard.writeText(text)
    return 'Copiado. Pegalo donde quieras.'
  } catch (e) {
    return e?.name === 'AbortError' ? '' : 'No se pudo compartir. Copiá el texto de abajo.'
  }
}

/** Resultado final (calculado en el servidor), compartir y volver a jugar */
export function ResultScreen({ result, saved, displayName, onPlayAgain }) {
  const root = useRef(null)
  const scoreRef = useRef(null)
  const [status, setStatus] = useState('')
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const text = shareText(result, origin)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const counter = { n: 0 }
        gsap.to(counter, {
          n: result.score,
          duration: 1.2,
          ease: 'power2.out',
          onUpdate: () => {
            if (scoreRef.current) scoreRef.current.textContent = formatPoints(Math.round(counter.n))
          },
        })
        gsap.from('[data-mark]', { scale: 0, duration: 0.35, stagger: 0.05, ease: 'back.out(2.5)', delay: 0.2 })
        gsap.from('[data-result]', { y: 16, opacity: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out' })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  const verdict = result.correct === result.total ? 'Perfecto. Sos de la casa.' : result.correct >= 7 ? 'Bostero de ley.' : result.correct >= 4 ? 'Vas bien, falta Bombonera.' : 'A repasar el museo.'

  return (
    <section ref={root} aria-labelledby="resultado" className="mx-auto max-w-3xl">
      <p data-result className="eyebrow text-oro">
        Resultado · {categoryLabel(result.category)}
      </p>
      <h1 id="resultado" data-result className="mt-2 font-display text-[clamp(2.6rem,7vw,4.5rem)] leading-none uppercase">
        {verdict}
      </h1>

      <div data-result className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-6">
        <p>
          <span ref={scoreRef} className="block font-display text-[clamp(4.5rem,16vw,9rem)] leading-[0.85] text-oro tabular-nums">
            {formatPoints(result.score)}
          </span>
          <span className="eyebrow mt-2 block text-claro/50">puntos de {formatPoints(maxScore(result.total))} posibles</span>
        </p>
        <dl className="grid grid-cols-3 gap-6">
          {[
            ['Aciertos', `${result.correct}/${result.total}`],
            ['Mejor racha', result.bestStreak],
            ['Tiempo', formatDuration(result.durationMs)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="eyebrow text-[9px] text-claro/45">{k}</dt>
              <dd className="mt-1 font-display text-3xl">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ol data-result className="mt-8 flex flex-wrap gap-1.5" aria-label="Pregunta por pregunta">
        {result.marks.map((ok, i) => (
          <li
            key={i}
            data-mark
            className={`grid h-9 w-9 place-items-center rounded-lg font-mono text-xs ${ok ? 'bg-oro text-fondo' : 'border border-white/20 text-claro/40'}`}
            title={`Pregunta ${i + 1}: ${ok ? 'bien' : 'mal'}`}
          >
            <span className="sr-only">
              Pregunta {i + 1}: {ok ? 'bien' : 'mal'}
            </span>
            <span aria-hidden="true">{i + 1}</span>
          </li>
        ))}
      </ol>

      <div data-result className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-claro/70">
        {saved && result.ranked ? (
          <p>
            Guardada como <strong className="text-claro">{displayName}</strong> en{' '}
            <Link href="/trivia/mis-partidas" prefetch={false} className="text-oro underline underline-offset-4">
              Mis partidas
            </Link>{' '}
            y en el{' '}
            <Link href="/trivia/ranking" className="text-oro underline underline-offset-4">
              ranking
            </Link>
            .
          </p>
        ) : saved ? (
          <p>
            Guardada en{' '}
            <Link href="/trivia/mis-partidas" prefetch={false} className="text-oro underline underline-offset-4">
              Mis partidas
            </Link>
            . Las rondas con semilla compartida no suman al ranking.
          </p>
        ) : (
          <p>
            Jugaste sin cuenta: esta partida no se guardó.{' '}
            <Link href="/login?next=/trivia" className="text-oro underline underline-offset-4">
              Ingresá
            </Link>{' '}
            para entrar al ranking.
          </p>
        )}
        <p className="mt-2 text-claro/45">
          Semilla <span className="font-mono text-claro/70">{formatSeed(result.seed)}</span>: con el link de abajo cualquiera juega exactamente esta ronda.
        </p>
      </div>

      <div data-result className="mt-6">
        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-claro/80">{text}</pre>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="eyebrow flex h-12 items-center rounded-full bg-oro px-7 text-[11px] text-fondo shadow-lg shadow-black/40 hover:brightness-110"
          >
            Jugar otra ronda
          </button>
          <button
            type="button"
            onClick={async () => setStatus(await share(text))}
            className="eyebrow flex h-12 items-center rounded-full border border-white/15 px-6 text-[11px] text-claro/85 hover:border-white/40 hover:text-claro"
          >
            Compartir resultado
          </button>
          <Link href="/trivia/ranking" className="eyebrow flex h-12 items-center rounded-full px-4 text-[11px] text-claro/60 hover:text-claro">
            Ver ranking →
          </Link>
        </div>
        <p role="status" className="mt-3 min-h-5 text-sm text-oro">
          {status}
        </p>
      </div>
    </section>
  )
}
