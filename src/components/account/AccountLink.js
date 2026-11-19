'use client'

import Link from 'next/link'
import { useSession } from '@/context/SessionContext'

/** Acceso a la cuenta, con regreso a la sección desde la que se ingresa. */
export function AccountLink({ href = '/mis-remeras', label = 'Mi vestuario', loginNext = href }) {
  const user = useSession()
  if (!user)
    return (
      <Link
        href={{ pathname: '/login', query: { next: loginNext } }}
        className="pointer-events-auto eyebrow grid h-10 shrink-0 place-items-center rounded-full border border-white/15 px-4 text-[10px] text-claro/80 transition-colors hover:border-white/50 hover:text-claro md:h-[30px] md:px-3"
      >
        Ingresar
      </Link>
    )
  return (
    <Link
      href={href}
      title={`${label} · ${user.name}`}
      aria-label={`${label} (${user.name})`}
      className="pointer-events-auto flex h-10 shrink-0 items-center gap-2 rounded-full border border-oro/50 pr-3 pl-1 text-claro transition-colors hover:border-oro md:h-[30px]"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-oro font-display text-sm text-fondo uppercase md:h-6 md:w-6 md:text-xs">{user.name.slice(0, 1)}</span>
      <span className="eyebrow hidden text-[10px] sm:inline">{label}</span>
    </Link>
  )
}
