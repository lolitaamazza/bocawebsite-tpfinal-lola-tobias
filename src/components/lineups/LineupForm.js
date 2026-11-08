'use client'

import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'
import { Field, SubmitButton, inputClass } from '@/components/ui/form'
import { positions } from '@/config/site'
import { squad } from '@/data'
import { FORMATIONS, FORMATION_KEYS, NAME_MAX } from '@/lib/domain/lineups'
import { Pitch } from './Pitch'

const byDorsal = new Map(squad.map((p) => [p.dorsal, p]))

/**
 * Formulario del XI: esquema, un jugador por puesto (el arco solo admite arqueros)
 * y capitán entre los elegidos. Un jugador elegido en un puesto desaparece de los
 * demás selectores, así no se puede repetir sin querer.
 */
export function LineupForm({ action, initial, submitLabel }) {
  const [state, formAction] = useActionState(action, { errors: {}, values: initial })
  const start = state.values ?? initial
  const [name, setName] = useState(start.name)
  const [formation, setFormation] = useState(start.formation || '4-3-3')
  const [slots, setSlots] = useState(() => Array.from({ length: 11 }, (_, i) => start.slots?.[i] || 0))
  const [captain, setCaptain] = useState(start.captain || 0)
  const errors = state.errors ?? {}
  const slotErrors = errors.slots ?? {}

  const chosen = useMemo(() => new Set(slots.filter(Boolean)), [slots])
  const filled = slots.filter(Boolean).length

  const setSlot = (i, dorsal) => {
    setSlots((prev) => prev.map((d, k) => (k === i ? dorsal : d)))
    // Si el capitán sale del equipo, se limpia
    if (slots[i] === captain && dorsal !== captain) setCaptain(0)
  }

  const optionsFor = (i) => {
    const keeper = i === 0
    return positions
      .filter((g) => (keeper ? g.key === 'ARQ' : g.key !== 'ARQ'))
      .map((g) => ({
        label: g.label,
        players: squad.filter((p) => p.pos === g.key && (p.dorsal === slots[i] || !chosen.has(p.dorsal))),
      }))
  }

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" noValidate>
      <div>
        <Pitch
          formation={formation}
          renderSlot={(slot, i) => {
            const p = byDorsal.get(slots[i])
            const err = slotErrors[i]
            return (
              <label className="flex w-[clamp(4.5rem,15vw,6.5rem)] flex-col items-center gap-1">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full border-2 font-display text-sm shadow-lg shadow-black/50 ${
                    err ? 'border-red-400 bg-red-500/30' : p ? (p.dorsal === captain ? 'border-oro bg-oro text-fondo' : 'border-oro/70 bg-azul') : 'border-dashed border-white/40 bg-black/30 text-claro/50'
                  }`}
                >
                  {p ? p.dorsal : slot.role === 'ARQ' ? 'ARQ' : '+'}
                </span>
                <select
                  name={`slot-${i}`}
                  value={slots[i] || ''}
                  onChange={(e) => setSlot(i, Number(e.target.value) || 0)}
                  aria-label={`Puesto ${i + 1} (${slot.role === 'ARQ' ? 'arquero' : slot.role})`}
                  aria-invalid={!!err}
                  className="w-full truncate rounded-md border border-white/20 bg-fondo/85 px-1 py-1 text-center text-[11px] font-semibold outline-none focus:border-oro"
                >
                  <option value="">{slot.role === 'ARQ' ? 'Arquero' : 'Elegir'}</option>
                  {optionsFor(i).map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.players.map((pl) => (
                        <option key={pl.id} value={pl.dorsal}>
                          {pl.dorsal} {pl.apellido}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {err ? <span className="rounded bg-black/70 px-1 text-[9px] text-red-200">{err}</span> : null}
              </label>
            )
          }}
        />
        <p className="eyebrow mt-3 text-claro/45">{filled}/11 elegidos</p>
      </div>

      <div className="grid content-start gap-5">
        <Field id="name" label="Nombre del equipo" hint={`Hasta ${NAME_MAX} caracteres.`} error={errors.name}>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
            placeholder="El de la Bombonera llena"
            aria-invalid={!!errors.name}
            className={inputClass}
          />
        </Field>

        <fieldset>
          <legend className="eyebrow text-[9px] text-claro/55">Esquema</legend>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {FORMATION_KEYS.map((f) => (
              <label key={f} className="cursor-pointer">
                <input type="radio" name="formation" value={f} checked={formation === f} onChange={() => setFormation(f)} className="peer sr-only" />
                <span className="grid h-10 place-items-center rounded-lg border border-white/15 font-mono text-xs text-claro/70 transition-colors peer-checked:border-claro peer-checked:bg-claro peer-checked:text-fondo peer-focus-visible:border-oro hover:border-white/40">
                  {f}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-claro/40">Cambiar el esquema mantiene a los jugadores en el mismo orden de puestos.</p>
          {errors.formation ? <p className="mt-1 text-xs text-red-300">{errors.formation}</p> : null}
        </fieldset>

        <Field id="captain" label="Capitán" error={errors.captain}>
          <select id="captain" name="captain" value={captain || ''} onChange={(e) => setCaptain(Number(e.target.value) || 0)} aria-invalid={!!errors.captain} className={inputClass}>
            <option value="">Elegí entre los titulares</option>
            {slots
              .filter(Boolean)
              .map((d) => byDorsal.get(d))
              .filter(Boolean)
              .map((p) => (
                <option key={p.id} value={p.dorsal}>
                  {p.dorsal} · {p.nombre} {p.apellido}
                </option>
              ))}
          </select>
        </Field>

        {Object.keys(slotErrors).length ? (
          <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/[0.08] px-3 py-2 text-sm text-red-200">
            Revisá los puestos marcados en rojo.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton>{submitLabel}</SubmitButton>
          <Link href="/mi-xi" className="eyebrow px-2 text-claro/60 hover:text-claro">
            Cancelar
          </Link>
        </div>
        <p className="text-xs text-claro/40">Esquema actual: {FORMATIONS[formation].length} puestos, el primero es el arco.</p>
      </div>
    </form>
  )
}
