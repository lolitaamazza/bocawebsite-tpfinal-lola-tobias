'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from '@/context/SessionContext'

const LINKS = [
  { href: '/trivia', label: 'Jugar' },
  { href: '/trivia/ranking', label: 'Ranking' },
  { href: '/trivia/mis-partidas', label: 'Mis partidas', private: true },
]

/** Pestañas de la trivia (coincidencia exacta: /trivia no queda marcada en /trivia/ranking) */
export function TriviaNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Secciones de la trivia" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          prefetch={l.private ? false : undefined}
          aria-current={pathname === l.href ? 'page' : undefined}
          className="eyebrow shrink-0 rounded-full border border-transparent px-3 py-2 text-claro/65 transition-colors hover:text-claro aria-[current=page]:border-white/15 aria-[current=page]:bg-white/[0.06] aria-[current=page]:text-claro"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

/** "Ingresar" (vuelve a la trivia) o el nombre de la cuenta */
export function TriviaAccount() {
  const user = useSession()
  if (!user)
    return (
      <Link
        href="/login?next=/trivia"
        className="eyebrow grid h-10 shrink-0 place-items-center rounded-full border border-white/15 px-4 text-[10px] text-claro/80 transition-colors hover:border-white/50 hover:text-claro"
      >
        Ingresar
      </Link>
    )
  return (
    <Link
      href="/trivia/mis-partidas"
      prefetch={false}
      title={`Mis partidas · ${user.name}`}
      className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-oro/50 pr-3 pl-1 text-claro transition-colors hover:border-oro"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-oro font-display text-sm text-fondo uppercase">{user.name.slice(0, 1)}</span>
      <span className="hidden max-w-[14ch] truncate text-sm sm:inline">{user.name}</span>
    </Link>
  )
}
