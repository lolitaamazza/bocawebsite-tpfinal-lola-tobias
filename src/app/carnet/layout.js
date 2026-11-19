import Link from 'next/link'
import { AccountLink } from '@/components/account/AccountLink'
import { SiteMenu } from '@/components/layout/SiteMenu'
import { site } from '@/config/site'

/** Carnet de hincha: ruta pública. La cabecera queda fija también en carga y error. */
export default function CarnetLayout({ children }) {
  return (
    <div className="grain relative min-h-dvh bg-[radial-gradient(90%_55%_at_70%_0%,#0d1c47_0%,transparent_70%)]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-fondo/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-8">
          <SiteMenu />
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Volver al vestuario">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.crest.src} alt="" width={842} height={1000} className="h-9 w-auto" />
            <span className="truncate font-display text-lg leading-none uppercase">
              Carnet de <span className="text-oro">hincha</span>
            </span>
          </Link>
          <div className="ml-auto">
            <AccountLink href="/mi-carnet" label="Mi carnet" loginNext="/carnet" />
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-4 pt-8 pb-24 md:px-8 md:pt-12">{children}</main>
    </div>
  )
}
