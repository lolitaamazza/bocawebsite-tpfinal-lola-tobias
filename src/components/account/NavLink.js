'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Link de la barra de cuenta: marcado cuando la ruta actual está dentro de `href` */
export function NavLink({ href, children }) {
  const pathname = usePathname()
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="eyebrow rounded-full border border-transparent px-3 py-2 text-claro/65 transition-colors hover:text-claro aria-[current=page]:border-white/15 aria-[current=page]:bg-white/[0.06] aria-[current=page]:text-claro"
    >
      {children}
    </Link>
  )
}
