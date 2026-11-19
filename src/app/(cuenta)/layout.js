import { LogoutButton } from '@/components/account/LogoutButton'
import { NavLink } from '@/components/account/NavLink'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { requireUser } from '@/lib/auth'

/**
 * Área privada (Mis remeras, Mi XI). Doble control: el proxy corta sin cookie y
 * acá se verifica la cookie con Firebase Admin antes de renderizar nada.
 */
export default async function CuentaLayout({ children }) {
  const user = await requireUser()
  return (
    <div className="grain relative min-h-dvh">
      <SectionHeader
        title="Mi"
        accent="vestuario"
        end={
          <>
            <span className="hidden max-w-[16ch] truncate text-sm text-claro/60 sm:block" title={user.email ?? ''}>
              {user.name}
            </span>
            <LogoutButton />
          </>
        }
      >
        <nav aria-label="Secciones de tu cuenta" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
          <NavLink href="/">Vestuario</NavLink>
          <NavLink href="/mis-remeras">Mis remeras</NavLink>
          <NavLink href="/mi-xi">Mi XI</NavLink>
          <NavLink href="/mi-carnet">Mi carnet</NavLink>
        </nav>
      </SectionHeader>
      <main className="relative mx-auto max-w-6xl px-4 pt-8 pb-20 md:px-8 md:pt-12">{children}</main>
    </div>
  )
}
