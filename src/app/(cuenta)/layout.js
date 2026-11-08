import Link from 'next/link'
import { LogoutButton } from '@/components/account/LogoutButton'
import { NavLink } from '@/components/account/NavLink'
import { site } from '@/config/site'
import { requireUser } from '@/lib/auth'

/**
 * Área privada (Mis remeras, Mi XI). Doble control: el proxy corta sin cookie y
 * acá se verifica la cookie con Firebase Admin antes de renderizar nada.
 */
export default async function CuentaLayout({ children }) {
  const user = await requireUser()
  return (
    <div className="grain relative min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-fondo/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Volver al vestuario">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.crest.src} alt="" width={842} height={1000} className="h-9 w-auto" />
            <span className="font-display text-lg leading-none uppercase">
              Mi <span className="text-oro">vestuario</span>
            </span>
          </Link>
          <nav aria-label="Secciones de tu cuenta" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
            <NavLink href="/">Vestuario</NavLink>
            <NavLink href="/mis-remeras">Mis remeras</NavLink>
            <NavLink href="/mi-xi">Mi XI</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-[16ch] truncate text-sm text-claro/60 sm:block" title={user.email ?? ''}>
              {user.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-4 pt-8 pb-20 md:px-8 md:pt-12">{children}</main>
    </div>
  )
}
