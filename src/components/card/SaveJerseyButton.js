'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { saveFromCustomizer } from '@/app/(cuenta)/mis-remeras/actions'
import { useSession } from '@/context/SessionContext'
import { selectionToPath } from '@/engine/route'
import { useVestuario } from '@/store/vestuario'
import { squad } from '@/data'
import { Icon } from '../ui/Icon'

const primary =
  'flex h-11 w-full items-center justify-center gap-2 rounded-full bg-oro font-mono text-[11px] font-semibold tracking-[0.16em] text-fondo uppercase shadow-lg shadow-black/40 transition-[filter,transform,opacity] hover:brightness-110 active:scale-[0.98] disabled:opacity-40'

/**
 * Guarda la remera del personalizador en "Mis remeras" (Server Action).
 * Sin sesión, lleva al login y vuelve al personalizador con el diseño intacto.
 */
export function SaveJerseyButton({ custom }) {
  const user = useSession()
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(null)
  const ready = !!custom.name.trim() && !!custom.number

  if (!user) {
    const back = selectionToPath('custom', squad, { nombre: custom.name.trim(), dorsal: custom.number })
    return (
      <Link href={`/login?next=${encodeURIComponent(back)}`} className={primary}>
        <Icon name="pencil" className="h-4 w-4" />
        Ingresá para guardarla
      </Link>
    )
  }

  if (saved) {
    return (
      <Link href={`/mis-remeras/${saved}`} className={`${primary} bg-claro`}>
        Guardada · ver en Mis remeras
      </Link>
    )
  }

  const save = () =>
    start(async () => {
      const res = await saveFromCustomizer({ name: custom.name, number: custom.number, size: custom.size, note: '' })
      if (res.ok) {
        setSaved(res.id)
        useVestuario.getState().showToast('Guardada en Mis remeras')
      } else useVestuario.getState().showToast(Object.values(res.errors)[0] ?? 'No se pudo guardar')
    })

  return (
    <button type="button" onClick={save} disabled={!ready || pending} className={primary}>
      <Icon name="pencil" className="h-4 w-4" />
      {pending ? 'Guardando…' : 'Guardar en Mis remeras'}
    </button>
  )
}
