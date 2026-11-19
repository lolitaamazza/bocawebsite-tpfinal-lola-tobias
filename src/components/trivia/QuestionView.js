'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { categoryLabel, formatPoints } from '@/lib/domain/trivia'
import { TimerBar } from './TimerBar'

gsap.registerPlugin(useGSAP)

const LETTERS = ['A', 'B', 'C', 'D']

/** Estado visual de cada opción antes y después de responder */
function optionState(i, { chosen, feedback }) {
  if (!feedback) return chosen === i ? 'pending' : 'idle'
  if (feedback.answerIndex === i) return 'right'
  if (feedback.choice === i) return 'wrong'
  return 'muted'
}

const OPTION_CLASS = {
  idle: 'border-white/15 bg-white/[0.04] hover:border-oro/70 hover:bg-white/[0.07]',
  pending: 'border-oro bg-oro/10 animate-pulse',
  right: 'border-oro bg-oro text-fondo',
  wrong: 'border-red-400/70 bg-red-500/15 text-claro',
  muted: 'border-white/10 bg-transparent text-claro/40',
}

/**
 * Una pregunta: enunciado, foto (si es de camisetas), cuatro opciones y el reloj.
 * Al responder muestra si estuvo bien, la correcta, la ficha y la fuente.
 * Teclado: 1–4 o A–D eligen; Enter pasa a la siguiente.
 */
export function QuestionView({ roundId, question, feedback, chosen, busy, paused, score, streak, onChoose, onTimeout, onNext, error }) {
  const root = useRef(null)
  const heading = useRef(null)
  const nextButton = useRef(null)
  const answered = Boolean(feedback)

  useGSAP(
    () => {
      heading.current?.focus({ preventScroll: true })
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-q-item]', { y: 14, opacity: 0, duration: 0.45, stagger: 0.06, ease: 'power3.out' })
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [question.index] },
  )

  useGSAP(
    () => {
      if (!feedback) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-feedback]', { y: 10, opacity: 0, duration: 0.4, ease: 'power2.out' })
        if (feedback.correct) gsap.fromTo('[data-state="right"]', { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' })
        else gsap.fromTo('[data-state="wrong"]', { x: -6 }, { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.3)' })
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [feedback] },
  )

  // El foco va a "Siguiente" cuando la respuesta ya volvió (antes el botón está deshabilitado)
  const ready = Boolean(feedback) && !busy
  useEffect(() => {
    if (ready) nextButton.current?.focus({ preventScroll: true })
  }, [ready])

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea')) return
      if (!answered) {
        const i = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase())
        if (i >= 0 && i < question.options.length && e.key.length === 1) {
          e.preventDefault()
          onChoose(i)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answered, question.options.length, onChoose])

  const timedOut = feedback?.timedOut
  return (
    <section ref={root} aria-labelledby="pregunta" className="mx-auto max-w-3xl">
      <div data-q-item className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow text-oro">
          Pregunta {question.index + 1}/{question.total} · {categoryLabel(question.category)}
        </p>
        <p className="eyebrow text-claro/60">
          <span className="text-claro">{formatPoints(score)}</span> pts
          {streak >= 2 ? <span className="ml-3 text-oro">Racha {streak}</span> : null}
        </p>
      </div>

      <div data-q-item className="mt-4">
        <TimerBar key={question.index} limitMs={question.limitMs} remainingMs={question.remainingMs} running={!answered && chosen === null && !paused} onTimeout={onTimeout} />
      </div>

      <h1
        id="pregunta"
        ref={heading}
        tabIndex={-1}
        data-q-item
        className="mt-8 font-display text-[clamp(1.9rem,5vw,3.4rem)] leading-[1.02] uppercase outline-none text-balance"
      >
        {question.prompt}
      </h1>

      {question.hasImage ? (
        <figure data-q-item className="mt-6 grid aspect-[4/3] max-h-[42vh] w-full place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(70%_70%_at_50%_40%,#14275c_0%,#050a18_85%)] p-4 sm:aspect-[16/9]">
          {/* eslint-disable-next-line @next/next/no-img-element -- la foto sale de una ruta opaca de la ronda, no de /public */}
          <img
            src={`/trivia/foto/${roundId}/${question.index}`}
            alt="Camiseta del archivo de Boca. La época es la pregunta."
            className="max-h-full w-auto object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)]"
          />
        </figure>
      ) : null}

      <ul className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Opciones">
        {question.options.map((opt, i) => {
          const state = optionState(i, { chosen, feedback })
          return (
            <li key={`${question.index}-${i}`} data-q-item>
              <button
                type="button"
                data-state={state}
                disabled={answered || busy || chosen !== null}
                onClick={() => onChoose(i)}
                aria-describedby={answered ? 'veredicto' : undefined}
                className={`group flex min-h-16 w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left text-lg font-semibold transition-[background-color,border-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro disabled:cursor-default ${OPTION_CLASS[state]}`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border font-mono text-xs ${state === 'right' ? 'border-fondo/40' : 'border-white/20 text-claro/60'}`}
                  aria-hidden="true"
                >
                  {LETTERS[i]}
                </span>
                <span className="flex-1">{opt}</span>
                {state === 'right' ? <span className="eyebrow text-fondo/70">Correcta</span> : null}
                {state === 'wrong' ? <span className="eyebrow text-red-300">Tu respuesta</span> : null}
              </button>
            </li>
          )
        })}
      </ul>

      {error ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {feedback ? (
        <div data-feedback className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <p id="veredicto" role="status" className={`font-display text-3xl uppercase ${feedback.correct ? 'text-oro' : 'text-claro'}`}>
            {feedback.lost
              ? 'Respuesta ya registrada'
              : feedback.correct
                ? `¡Adentro! +${feedback.points}`
                : timedOut
                  ? 'Se acabó el tiempo'
                  : 'No era esa'}
          </p>
          {!feedback.lost && !feedback.correct ? (
            <p className="mt-1 text-claro/80">
              La correcta: <strong className="text-oro">{feedback.answer}</strong>
            </p>
          ) : null}
          {feedback.detail ? <p className="mt-3 max-w-prose text-sm leading-relaxed text-claro/65">{feedback.detail}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {feedback.source ? (
              <a href={feedback.source.url} target="_blank" rel="noopener noreferrer" className="text-claro/70 underline decoration-white/25 underline-offset-4 hover:text-claro hover:decoration-oro">
                Fuente: {feedback.source.label} ↗
              </a>
            ) : null}
            {feedback.link ? (
              <Link href={feedback.link.href} target="_blank" className="text-claro/70 underline decoration-white/25 underline-offset-4 hover:text-claro hover:decoration-oro">
                {feedback.link.label}
              </Link>
            ) : null}
          </div>
          <button
            ref={nextButton}
            type="button"
            onClick={onNext}
            disabled={busy}
            className="eyebrow mt-6 flex h-12 items-center justify-center rounded-full bg-oro px-7 text-[11px] text-fondo shadow-lg shadow-black/40 transition-[filter,opacity] hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Un segundo…' : feedback.last ? 'Ver resultado' : 'Siguiente pregunta'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
