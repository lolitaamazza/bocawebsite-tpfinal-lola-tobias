'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Field, SubmitButton, inputClass } from '@/components/ui/form'
import { MAX_NAME, cleanName, cleanNumber } from '@/engine/text'
import { JERSEY_SIZES, NOTE_MAX } from '@/lib/domain/jerseys'
import { JerseyPreview } from './JerseyPreview'

/**
 * Alta y edición de una remera. La previa se actualiza mientras se escribe; la
 * validación definitiva la hace la Server Action y sus errores vuelven por campo.
 */
export function JerseyForm({ action, initial, submitLabel }) {
  const [state, formAction] = useActionState(action, { errors: {}, values: initial })
  const start = state.values ?? initial
  const [name, setName] = useState(start.name)
  const [number, setNumber] = useState(start.number)
  const [size, setSize] = useState(start.size || 'M')
  const [note, setNote] = useState(start.note ?? '')
  const errors = state.errors ?? {}

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start">
      <div className="relative mx-auto aspect-[800/1035] w-full max-w-sm rounded-3xl border border-white/10 bg-[radial-gradient(80%_60%_at_50%_30%,#14275c_0%,#050a18_80%)] p-6 md:sticky md:top-24">
        <JerseyPreview name={name} number={number} />
      </div>

      <form action={formAction} className="grid gap-5" noValidate>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field id="name" label="Nombre" hint={`Hasta ${MAX_NAME} letras, como en la tienda.`} error={errors.name}>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(cleanName(e.target.value))}
              placeholder="TU NOMBRE"
              autoComplete="off"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : 'name-hint'}
              className={`${inputClass} font-dorsal text-lg tracking-[0.08em] uppercase`}
            />
          </Field>
          <Field id="number" label="Número" error={errors.number}>
            <input
              id="number"
              name="number"
              value={number}
              onChange={(e) => setNumber(cleanNumber(e.target.value))}
              inputMode="numeric"
              placeholder="12"
              autoComplete="off"
              aria-invalid={!!errors.number}
              aria-describedby={errors.number ? 'number-error' : undefined}
              className={`${inputClass} text-center font-dorsal text-lg`}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="eyebrow text-[9px] text-claro/55">Talle</legend>
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
            {JERSEY_SIZES.map((s) => (
              <label key={s} className="cursor-pointer">
                <input type="radio" name="size" value={s} checked={size === s} onChange={() => setSize(s)} className="peer sr-only" />
                <span className="grid h-10 place-items-center rounded-lg border border-white/15 font-mono text-xs text-claro/70 transition-colors peer-checked:border-claro peer-checked:bg-claro peer-checked:text-fondo peer-focus-visible:border-oro hover:border-white/40">
                  {s}
                </span>
              </label>
            ))}
          </div>
          {errors.size ? <p className="mt-1 text-xs text-red-300">{errors.size}</p> : null}
        </fieldset>

        <Field id="note" label="Dedicatoria (opcional)" hint={`${note.length}/${NOTE_MAX}`} error={errors.note}>
          <textarea
            id="note"
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            rows={3}
            placeholder="La de la final del 2000, para el viejo…"
            aria-invalid={!!errors.note}
            className={`${inputClass} h-auto py-2 leading-relaxed`}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton>{submitLabel}</SubmitButton>
          <Link href="/mis-remeras" className="eyebrow px-2 text-claro/60 hover:text-claro">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
