import { AccountLink } from '@/components/account/AccountLink'
import { SectionHeader } from '@/components/layout/SectionHeader'

/** Carnet de hincha: ruta pública. La cabecera queda fija también en carga y error. */
export default function CarnetLayout({ children }) {
  return (
    <div className="grain relative min-h-dvh bg-[radial-gradient(90%_55%_at_70%_0%,#0d1c47_0%,transparent_70%)]">
      <SectionHeader title="Carnet de" accent="hincha" end={<AccountLink href="/mi-carnet" label="Mi carnet" loginNext="/carnet" />} />
      <main className="relative mx-auto max-w-6xl px-4 pt-8 pb-24 md:px-8 md:pt-12">{children}</main>
    </div>
  )
}
