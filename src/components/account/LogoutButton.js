'use client'

import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getClientAuth } from '@/lib/firebase/client'

/** Cierra la sesión en Firebase (cliente) y borra la cookie del servidor */
export function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function logout() {
    setBusy(true)
    try {
      await signOut(getClientAuth())
    } catch {
      /* si el cliente no tenía sesión igual se borra la cookie */
    }
    await fetch('/api/session/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }
  return (
    <button type="button" onClick={logout} disabled={busy} className="eyebrow rounded-full border border-white/15 px-3 py-2 text-claro/70 hover:border-white/40 hover:text-claro disabled:opacity-50">
      {busy ? 'Saliendo…' : 'Salir'}
    </button>
  )
}
