import Link from 'next/link'
import { PageHead, ghostButton, primaryButton } from '@/components/account/PageHead'
import { PersonalRackClient } from '@/components/jerseys/PersonalRackClient'
import { requireUser } from '@/lib/auth'
import { jerseys } from '@/lib/data/jerseys'

export const metadata = { title: 'Mi vestuario 3D', robots: { index: false } }

/** Las remeras del usuario (leídas en el servidor) colgadas en el riel 3D (cliente) */
export default async function MiVestuarioPage() {
  const user = await requireUser('/mis-remeras/vestuario')
  const list = await jerseys.list(user.uid)
  return (
    <>
      <PageHead eyebrow="Mis remeras" title="Mi vestuario" description="Arrastrá el riel. Clic en una remera para editarla.">
        <Link href="/mis-remeras" className={ghostButton}>
          Ver como lista
        </Link>
        <Link href="/mis-remeras/nueva" className={primaryButton}>
          + Nueva remera
        </Link>
      </PageHead>
      <div className="mt-8">
        {list.length ? (
          <PersonalRackClient jerseys={list} />
        ) : (
          <p className="rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center text-claro/60">Todavía no guardaste remeras.</p>
        )}
      </div>
    </>
  )
}
