'use client'

import Link from 'next/link'
import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { ghostButton, primaryButton } from '@/components/account/PageHead'
import { Field, SubmitButton, inputClass } from '@/components/ui/form'
import { useSession } from '@/context/SessionContext'
import {
  APODO_MAX,
  CARNET_FIELDS,
  DESDE_MIN,
  IDOLOS,
  NOMBRE_MAX,
  UBICACIONES,
  cardModel,
  carnetFileName,
  formatFecha,
  loginHref,
  parseCarnet,
  sameCarnet,
  typeApodo,
  typeDesde,
  typeNombre,
} from '@/lib/domain/carnet'
import { CarnetPanel } from './CarnetPanel'

const PHOTO_MAX = 15 * 1024 * 1024

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" />
    </svg>
  )
}

/**
 * Editor del carnet: el formulario a la derecha y el carnet en vivo a la izquierda.
 * Valida mientras escribís (después del primer intento) con la misma función que la
 * Server Action, que vuelve a validar todo en el servidor.
 * La foto queda en el navegador: el input no tiene `name`, así que no viaja en el form.
 */
export function CarnetEditor({ action, initial, saved, maxYear, today }) {
  const user = useSession()
  const [state, formAction] = useActionState(action, { ok: false, errors: {}, values: null })
  const [values, setValues] = useState(initial)
  const [attempted, setAttempted] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoError, setPhotoError] = useState('')
  const form = useRef(null)
  const fileInput = useRef(null)

  // Libera la foto anterior (es una URL local del navegador)
  useEffect(() => {
    const url = photo?.url
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [photo?.url])

  const live = parseCarnet(values, { year: maxYear })
  // Un error del servidor se muestra mientras el campo siga como se mandó
  const serverErrors = Object.fromEntries(Object.entries(state.errors ?? {}).filter(([k]) => state.values?.[k] === live.values[k]))
  const errors = { ...serverErrors, ...(attempted ? live.errors : {}) }

  const exists = Boolean(saved) || state.ok
  const baseline = state.ok ? state.values : saved?.values
  const dirty = exists && !sameCarnet(values, baseline)
  const model = useMemo(() => cardModel(values, { uid: user?.uid, createdAt: saved?.createdAt, today }), [values, user?.uid, saved?.createdAt, today])

  const set = (key, clean) => (e) => {
    const raw = e.target.value
    // Durante una composición (tildes con tecla muerta, IME) no se toca el texto
    const composing = e.nativeEvent?.isComposing
    setValues((v) => ({ ...v, [key]: clean && !composing ? clean(raw) : raw }))
  }
  const endCompose = (key, clean) => (e) => {
    const raw = e.currentTarget.value
    setValues((v) => ({ ...v, [key]: clean(raw) }))
  }

  function focusFirst(errs) {
    const first = CARNET_FIELDS.find((k) => errs[k])
    if (!first) return
    const el = form.current?.querySelector(`[name="${first}"]:checked`) ?? form.current?.querySelector(`[name="${first}"]`)
    el?.focus()
  }

  function onSubmit(e) {
    setAttempted(true)
    if (!live.data) {
      e.preventDefault()
      focusFirst(live.errors)
    }
  }

  function beforeExport() {
    setAttempted(true)
    if (live.data) return true
    focusFirst(live.errors)
    return false
  }

  function pickPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setPhotoError('Elegí una imagen (JPG, PNG o WebP).')
    if (file.size > PHOTO_MAX) return setPhotoError('Esa foto pesa más de 15 MB.')
    setPhotoError('')
    setPhoto({ url: URL.createObjectURL(file), name: file.name })
  }

  function removePhoto() {
    setPhoto(null)
    setPhotoError('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const describe = (id, hint) => (errors[id] ? `${id}-error` : hint ? `${id}-hint` : undefined)

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <CarnetPanel
          model={model}
          photoUrl={photo?.url ?? null}
          fileName={carnetFileName(values.nombre)}
          shareText="Mi carnet de hincha de Boca"
          beforeExport={beforeExport}
        />
      </div>

      <div>
        <Status user={user} exists={exists} dirty={dirty} state={state} saved={saved} socio={model.socio} />

        {/* La acción reinicia el formulario: conservamos los campos de `values`, incluido el select. */}
        <form
          ref={form}
          action={formAction}
          onSubmit={onSubmit}
          onReset={(event) => event.preventDefault()}
          className="mt-6 grid gap-5"
          noValidate
        >
          <Field id="nombre" label="Nombre y apellido" hint={`De 2 a ${NOMBRE_MAX} caracteres.`} error={errors.nombre}>
            <input
              id="nombre"
              name="nombre"
              value={values.nombre}
              onChange={set('nombre', typeNombre)}
              onCompositionEnd={endCompose('nombre', typeNombre)}
              placeholder="Juan Román"
              autoComplete="name"
              aria-invalid={!!errors.nombre}
              aria-describedby={describe('nombre', true)}
              className={`${inputClass} font-display text-xl tracking-wide uppercase placeholder:normal-case`}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <Field id="apodo" label="Apodo (opcional)" hint={`Hasta ${APODO_MAX}.`} error={errors.apodo}>
              <input
                id="apodo"
                name="apodo"
                value={values.apodo}
                onChange={set('apodo', typeApodo)}
                onCompositionEnd={endCompose('apodo', typeApodo)}
                placeholder="El Toto"
                autoComplete="off"
                aria-invalid={!!errors.apodo}
                aria-describedby={describe('apodo', true)}
                className={`${inputClass} font-serif text-lg italic`}
              />
            </Field>
            <Field id="desde" label="Hincha desde" hint={`${DESDE_MIN}–${maxYear}`} error={errors.desde}>
              <input
                id="desde"
                name="desde"
                value={values.desde}
                onChange={set('desde', typeDesde)}
                inputMode="numeric"
                placeholder="1981"
                autoComplete="off"
                aria-invalid={!!errors.desde}
                aria-describedby={describe('desde', true)}
                className={`${inputClass} text-center font-dorsal text-lg tracking-[0.12em]`}
              />
            </Field>
          </div>

          <fieldset aria-describedby={errors.ubicacion ? 'ubicacion-error' : undefined}>
            <legend className="eyebrow text-[9px] text-claro/55">¿Desde dónde lo mirás?</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {UBICACIONES.map((u) => (
                <label key={u.key} className="cursor-pointer">
                  <input type="radio" name="ubicacion" value={u.key} checked={values.ubicacion === u.key} onChange={set('ubicacion')} className="peer sr-only" />
                  <span className="grid min-h-11 place-items-center rounded-lg border border-white/15 px-2 text-center text-xs font-semibold text-claro/70 transition-colors peer-checked:border-oro peer-checked:bg-oro peer-checked:text-fondo peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-oro hover:border-white/40">
                    {u.label}
                  </span>
                </label>
              ))}
            </div>
            {errors.ubicacion ? (
              <p id="ubicacion-error" role="alert" className="mt-1 text-xs text-red-300">
                {errors.ubicacion}
              </p>
            ) : null}
          </fieldset>

          <Field id="idolo" label="Tu ídolo" error={errors.idolo}>
            <div className="relative">
              <select
                id="idolo"
                name="idolo"
                value={values.idolo}
                onChange={set('idolo')}
                aria-invalid={!!errors.idolo}
                aria-describedby={describe('idolo')}
                className={`${inputClass} appearance-none pr-10 [color-scheme:dark]`}
              >
                {IDOLOS.map((i) => (
                  <option key={i.key} value={i.key} className="bg-noche">
                    {i.label}
                  </option>
                ))}
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-oro">
                ▾
              </span>
            </div>
          </Field>

          <div>
            <p className="eyebrow text-[9px] text-claro/55" id="foto-label">
              Foto (opcional)
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <label className={`${ghostButton} cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-oro`}>
                {/* Sin `name`: la foto nunca entra al FormData de la Server Action */}
                <input ref={fileInput} type="file" accept="image/*" onChange={pickPhoto} className="sr-only" aria-labelledby="foto-label" aria-describedby="foto-hint" />
                {photo ? 'Cambiar foto' : 'Elegir foto'}
              </label>
              {photo ? (
                <button type="button" onClick={removePhoto} className="eyebrow px-2 text-claro/60 hover:text-claro">
                  Quitar
                </button>
              ) : null}
              {photo ? <span className="max-w-[16ch] truncate text-xs text-claro/50">{photo.name}</span> : null}
            </div>
            {photoError ? (
              <p role="alert" className="mt-1 text-xs text-red-300">
                {photoError}
              </p>
            ) : null}
            <p id="foto-hint" className="mt-1.5 flex gap-1.5 text-xs text-claro/50">
              <LockIcon />
              Tu foto no sale de tu dispositivo: no se sube ni se guarda. Solo aparece en la vista previa y en el PNG.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
            {user ? (
              <SubmitButton>{exists ? 'Guardar cambios' : 'Guardar mi carnet'}</SubmitButton>
            ) : (
              <Link href={loginHref(values)} className={primaryButton}>
                Ingresá para guardarlo
              </Link>
            )}
            {exists ? (
              <Link href="/mi-carnet" className="eyebrow px-2 text-claro/60 hover:text-claro">
                Ver Mi carnet
              </Link>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}

/** Estado del guardado: invitado, sin guardar, guardado, con cambios, éxito o error */
function Status({ user, exists, dirty, state, saved, socio }) {
  if (state.message) {
    return (
      <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
        {state.message}
      </p>
    )
  }
  if (state.ok && !dirty) {
    return (
      <p role="status" className="rounded-xl border border-oro/30 bg-oro/[0.08] px-4 py-3 text-sm text-oro">
        {state.created ? `Carnet guardado. Ya sos el socio N.º ${socio} del vestuario.` : 'Cambios guardados.'}{' '}
        <Link href="/mi-carnet" className="underline underline-offset-4">
          Ver Mi carnet
        </Link>
      </p>
    )
  }
  const pill = 'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs'
  if (!user) {
    return (
      <p className={`${pill} border-white/15 text-claro/65`}>
        <span className="size-1.5 rounded-full bg-claro/40" aria-hidden="true" />
        Sin cuenta podés diseñarlo y descargarlo. Para guardarlo, ingresá.
      </p>
    )
  }
  if (!exists) {
    return (
      <p className={`${pill} border-white/15 text-claro/65`}>
        <span className="size-1.5 rounded-full bg-claro/40" aria-hidden="true" />
        Todavía no guardaste tu carnet.
      </p>
    )
  }
  if (dirty) {
    return (
      <p className={`${pill} border-oro/40 text-oro`}>
        <span className="size-1.5 rounded-full bg-oro" aria-hidden="true" />
        Tenés cambios sin guardar.
      </p>
    )
  }
  return (
    <p className={`${pill} border-white/15 text-claro/70`}>
      <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
      Guardado{saved?.updatedAt ? ` · última edición ${formatFecha(saved.updatedAt)}` : ''}
    </p>
  )
}
