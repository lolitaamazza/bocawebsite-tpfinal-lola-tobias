import Link from 'next/link'
import { Flash, PageHead, ghostButton, primaryButton } from '@/components/account/PageHead'
import { JerseyCard } from '@/components/jerseys/JerseyCard'
import { requireUser } from '@/lib/auth'
import { jerseys } from '@/lib/data/jerseys'

export const metadata = { title: 'Mis remeras', robots: { index: false } }

const MESSAGES = { creada: 'Remera guardada en tu vestuario.', editada: 'Cambios guardados.', borrada: 'Remera borrada.' }

/** Listado (Server Component): lee de Firestore solo las remeras del usuario de la sesión */
export default async function MisRemerasPage({ searchParams }) {
  const user = await requireUser('/mis-remeras')
  const [{ ok }, list] = await Promise.all([searchParams, jerseys.list(user.uid)])
  return (
    <>
      <PageHead eyebrow={`${list.length} ${list.length === 1 ? 'remera' : 'remeras'}`} title="Mis remeras" description="Las que diseñaste con tu nombre y tu número.">
        {list.length ? (
          <Link href="/mis-remeras/vestuario" className={ghostButton}>
            Verlas colgadas en 3D
          </Link>
        ) : null}
        <Link href="/mis-remeras/nueva" className={primaryButton}>
          + Nueva remera
        </Link>
      </PageHead>
      <Flash ok={ok} messages={MESSAGES} />

      {list.length ? (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((j) => (
            <JerseyCard key={j.id} jersey={j} />
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center">
          <p className="font-display text-3xl uppercase">Tu percha está vacía</p>
          <p className="mx-auto mt-2 max-w-md text-claro/60">Diseñá tu primera remera acá o desde el personalizador del vestuario 3D.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/mis-remeras/nueva" className={primaryButton}>
              Diseñar mi remera
            </Link>
            <Link href="/personaliza" className={ghostButton}>
              Ir al personalizador 3D
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
