'use client'

import { useFormStatus } from 'react-dom'

/** Campo con rótulo, ayuda y error, todos asociados al control para lectores de pantalla */
export function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow text-[9px] text-claro/55">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-claro/40">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const inputClass =
  'h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 outline-none placeholder:text-claro/30 focus:border-oro aria-[invalid=true]:border-red-400/70'

/** Botón de envío que se deshabilita mientras la Server Action trabaja */
export function SubmitButton({ children, pendingLabel = 'Guardando…', className = '' }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`eyebrow flex h-11 items-center justify-center rounded-full bg-oro px-6 text-[11px] text-fondo shadow-lg shadow-black/40 transition-[filter,opacity] hover:brightness-110 disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  )
}

/** Borrar con confirmación: el form llama a la Server Action solo si el usuario acepta */
export function DeleteButton({ action, label = 'Borrar', confirmText }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault()
      }}
    >
      <DeleteSubmit label={label} />
    </form>
  )
}

function DeleteSubmit({ label }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="eyebrow h-11 rounded-full border border-red-400/40 px-5 text-red-300 hover:bg-red-500/10 disabled:opacity-50">
      {pending ? 'Borrando…' : label}
    </button>
  )
}
