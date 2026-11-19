'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { inputClass } from '@/components/ui/form'
import { site } from '@/config/site'
import { useSession } from '@/context/SessionContext'
import {
  BASE_POINTS,
  CATEGORIES,
  MAX_TIME_BONUS,
  NICK_MAX,
  QUESTION_MS,
  ROUND_SIZE,
  STREAK_BONUS,
  STREAK_FROM,
  cleanNickname,
  firstName,
  formatSeed,
} from '@/lib/domain/trivia'

gsap.registerPlugin(useGSAP)

/** Primer nombre de la cuenta, salvo que el "nombre" sea el comienzo del email (no se muestra) */
function suggestedNickname(user) {
  if (!user) return ''
  if (user.email && user.name === user.email.split('@')[0]) return ''
  return cleanNickname(firstName(user.name))
}

/** Pantalla de inicio: categoría, apodo para el ranking y reglas */
export function StartScreen({ category, onCategory, seed, onClearSeed, counts, busy, error, onStart }) {
  const user = useSession()
  const [nickname, setNickname] = useState(() => suggestedNickname(user))
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-intro]', { y: 18, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  const submit = (e) => {
    e.preventDefault()
    onStart({ category, nickname })
  }

  return (
    <div ref={root} className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <div>
        <p data-intro className="eyebrow text-oro">
          Trivia xeneize · {ROUND_SIZE} preguntas
        </p>
        <h1 data-intro className="mt-3 font-display text-[clamp(3rem,9vw,6.5rem)] leading-[0.92] uppercase">
          ¿Cuánto sabés
          <br />
          de <span className="text-oro">Boca</span>?
        </h1>
        <p data-intro className="mt-5 max-w-lg text-lg text-claro/70">
          Títulos, camisetas del archivo, el plantel {site.season} y la historia del club. {QUESTION_MS / 1000} segundos por pregunta. Cada
          respuesta trae su fuente.
        </p>
        <dl data-intro className="mt-8 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-center">
          {[
            [`+${BASE_POINTS}`, 'por acierto'],
            [`+${MAX_TIME_BONUS}`, 'si sos rápido'],
            [`+${STREAK_BONUS}`, `racha de ${STREAK_FROM}+`],
          ].map(([n, label]) => (
            <div key={label} className="bg-fondo px-3 py-4">
              <dt className="sr-only">{label}</dt>
              <dd className="font-display text-3xl text-oro">{n}</dd>
              <dd className="eyebrow mt-1 text-[9px] text-claro/50">{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <form data-intro onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-7">
        {seed ? (
          <div className="mb-6 rounded-2xl border border-oro/30 bg-oro/[0.07] p-4">
            <p className="eyebrow text-oro">Ronda compartida</p>
            <p className="mt-1 text-sm text-claro/75">
              Semilla <span className="font-mono text-claro">{formatSeed(seed)}</span>: vas a jugar las mismas preguntas que quien te pasó el link. Esta ronda no
              suma al ranking.
            </p>
            <button type="button" onClick={onClearSeed} className="eyebrow mt-3 text-[10px] text-claro/60 underline underline-offset-4 hover:text-claro">
              Mejor una ronda nueva
            </button>
          </div>
        ) : null}

        <fieldset>
          <legend className="eyebrow text-[9px] text-claro/55">Categoría</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <label
                key={c.key}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors has-[:checked]:border-oro has-[:checked]:bg-oro/[0.08] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-oro ${c.key === 'mixta' ? 'sm:col-span-2' : ''} border-white/15 hover:border-white/35`}
              >
                <input type="radio" name="categoria" value={c.key} checked={category === c.key} onChange={() => onCategory(c.key)} className="sr-only" />
                <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-white/40" aria-hidden="true">
                  <span className={`h-2 w-2 rounded-full ${category === c.key ? 'bg-oro' : 'bg-transparent'}`} />
                </span>
                <span>
                  <span className="block font-semibold">{c.label}</span>
                  <span className="block text-sm text-claro/55">
                    {c.hint}
                    {counts?.[c.key] ? <span className="text-claro/35"> · {counts[c.key]} preguntas</span> : null}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {user ? (
          <div className="mt-6">
            <label htmlFor="apodo" className="eyebrow text-[9px] text-claro/55">
              Tu nombre en el ranking
            </label>
            <input
              id="apodo"
              name="apodo"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={NICK_MAX}
              autoComplete="nickname"
              placeholder="Tu apodo"
              aria-describedby="apodo-ayuda"
              className={`${inputClass} mt-1.5`}
            />
            <p id="apodo-ayuda" className="mt-1 text-xs text-claro/40">
              Primer nombre o apodo, hasta {NICK_MAX} letras. Tu email nunca se muestra.
            </p>
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-white/10 px-4 py-3 text-sm text-claro/60">
            Jugás sin cuenta: la partida no se guarda ni entra al ranking.{' '}
            <Link href="/login?next=/trivia" className="text-oro underline underline-offset-4">
              Ingresar
            </Link>
          </p>
        )}

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="eyebrow mt-6 flex h-12 w-full items-center justify-center rounded-full bg-oro px-6 text-[11px] text-fondo shadow-lg shadow-black/40 transition-[filter,opacity] hover:brightness-110 disabled:opacity-60"
        >
          {busy ? 'Armando la ronda…' : 'Arrancar'}
        </button>
      </form>
    </div>
  )
}
