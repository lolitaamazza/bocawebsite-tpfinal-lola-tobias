'use client'

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Field, inputClass } from '@/components/ui/form'
import { getClientAuth, getGoogleProvider } from '@/lib/firebase/client'

/** Mensajes de Firebase Auth en criollo */
const AUTH_ERRORS = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/invalid-email': 'Ese email no es válido.',
  'auth/email-already-in-use': 'Ya hay una cuenta con ese email. Ingresá.',
  'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.',
  'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
  'auth/operation-not-allowed': 'Este método de ingreso no está habilitado en Firebase.',
  'auth/too-many-requests': 'Demasiados intentos. Probá en un rato.',
}

const message = (err) => AUTH_ERRORS[err?.code] ?? err?.message ?? 'No se pudo ingresar.'

/** Cambia el login de Firebase (cliente) por una cookie de sesión del servidor */
async function persistSession(user) {
  const idToken = await user.getIdToken()
  const res = await fetch('/api/session/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) throw new Error('No se pudo crear la sesión en el servidor.')
}

/** Solo rutas internas: evita que ?next= mande a otro sitio */
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/mis-remeras')

export function LoginForm() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function finish(credential) {
    await persistSession(credential.user)
    router.push(next)
    router.refresh()
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (mode === 'signup' && name.trim().length < 2) return setError('Contanos cómo te llamás.')
    setLoading(true)
    try {
      const auth = getClientAuth()
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name.trim() })
        // El token tiene que traer el nombre nuevo para la sesión del servidor
        await cred.user.getIdToken(true)
        await finish(cred)
      } else await finish(await signInWithEmailAndPassword(auth, email, password))
    } catch (err) {
      setError(message(err))
    } finally {
      setLoading(false)
    }
  }

  async function google() {
    setError('')
    setLoading(true)
    try {
      await finish(await signInWithPopup(getClientAuth(), getGoogleProvider()))
    } catch (err) {
      setError(message(err))
    } finally {
      setLoading(false)
    }
  }

  const tab = (value, label) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => {
        setMode(value)
        setError('')
      }}
      className="eyebrow h-10 rounded-full text-claro/60 transition-colors aria-selected:bg-claro aria-selected:text-fondo"
    >
      {label}
    </button>
  )

  return (
    <section className="w-full max-w-md rounded-2xl border border-white/15 bg-white/[0.05] p-6 shadow-2xl shadow-black/60 backdrop-blur-xl md:p-8" aria-labelledby="login-title">
      <div role="tablist" aria-label="Ingresar o crear cuenta" className="grid grid-cols-2 gap-1 rounded-full border border-white/10 p-1">
        {tab('signin', 'Ingresar')}
        {tab('signup', 'Crear cuenta')}
      </div>
      <h1 id="login-title" className="mt-6 font-display text-4xl leading-none uppercase">
        {mode === 'signup' ? (
          <>
            Sumate al <span className="text-oro">vestuario</span>
          </>
        ) : (
          <>
            Entrá al <span className="text-oro">vestuario</span>
          </>
        )}
      </h1>
      <p className="mt-2 text-sm text-claro/60">Guardá tus remeras personalizadas y armá tu XI ideal.</p>

      <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
        {mode === 'signup' ? (
          <Field id="name" label="Nombre">
            <input id="name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </Field>
        ) : null}
        <Field id="email" label="Email">
          <input id="email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field id="password" label="Contraseña" hint={mode === 'signup' ? 'Mínimo 6 caracteres.' : undefined}>
          <input
            id="password"
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={6}
            required
          />
        </Field>
        {error ? (
          <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/[0.08] px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={loading} className="eyebrow h-11 rounded-full bg-oro text-[11px] text-fondo shadow-lg shadow-black/40 hover:brightness-110 disabled:opacity-60">
          {loading ? 'Un momento…' : mode === 'signup' ? 'Crear cuenta' : 'Ingresar'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-claro/30">
        <span className="h-px flex-1 bg-white/10" />
        <span className="eyebrow text-[9px]">o</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <button
        type="button"
        onClick={google}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-white/15 text-sm font-semibold text-claro hover:border-white/40 disabled:opacity-60"
      >
        <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Seguir con Google
      </button>
    </section>
  )
}
