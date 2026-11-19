import Link from 'next/link'
import { deleteCarnet } from '@/app/carnet/actions'
import { Flash, PageHead, ghostButton, primaryButton } from '@/components/account/PageHead'
import { CarnetViewer } from '@/components/carnet/CarnetViewer'
import { DeleteButton } from '@/components/ui/form'
import { requireUser } from '@/lib/auth'
import { carnets } from '@/lib/data/carnets'
import { formatFecha, idoloLabel, socioNumber, ubicacionLabel, valuesOf } from '@/lib/domain/carnet'

export const metadata = { title: 'Mi carnet', robots: { index: false } }

const MESSAGES = { borrado: 'Carnet borrado. Podés armar otro cuando quieras.' }

/** Carnet guardado del usuario (Server Component: lee Firestore con el uid de la sesión) */
export default async function MiCarnetPage({ searchParams }) {
  const user = await requireUser('/mi-carnet')
  const [{ ok, error }, carnet] = await Promise.all([searchParams, carnets.get(user.uid)])
  const socio = socioNumber(user.uid)

  if (!carnet) {
    return (
      <>
        <PageHead eyebrow="Mi carnet" title="Mi carnet de hincha" />
        <Flash ok={ok} messages={MESSAGES} />
        <div className="mt-10 rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center">
          <p className="font-display text-3xl uppercase">Todavía no tenés carnet</p>
          <p className="mx-auto mt-2 max-w-md text-claro/60">Se arma en un minuto: tu nombre, desde qué año sos hincha, dónde lo mirás y tu ídolo. Tu número de socio ya está esperando: {socio}.</p>
          <Link href="/carnet" className={`${primaryButton} mt-6`}>
            Diseñar mi carnet
          </Link>
        </div>
      </>
    )
  }

  const values = valuesOf(carnet)
  const rows = [
    ['Nombre', carnet.nombre],
    ['Apodo', carnet.apodo || '—'],
    ['Hincha desde', carnet.desde],
    ['Ubicación', ubicacionLabel(carnet.ubicacion)],
    ['Ídolo', idoloLabel(carnet.idolo)],
    ['Socio N.º', socio],
    ['Alta', formatFecha(carnet.createdAt) ?? '—'],
    ['Última edición', formatFecha(carnet.updatedAt) ?? '—'],
  ]

  return (
    <>
      <PageHead eyebrow={`Mi carnet · Socio N.º ${socio}`} title={carnet.nombre} description="Tu carnet guardado. Dalo vuelta, descargalo o compartilo.">
        <Link href="/carnet" className={ghostButton}>
          Editar
        </Link>
        <DeleteButton action={deleteCarnet} label="Borrar carnet" confirmText="¿Borrar tu carnet de hincha? No se puede deshacer." />
      </PageHead>
      {error === 'borrar' ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
          No pudimos borrar tu carnet. Probá de nuevo en un rato.
        </p>
      ) : null}
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <CarnetViewer values={values} createdAt={carnet.createdAt} />
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 bg-fondo px-4 py-3">
              <dt className="eyebrow self-center text-[9px] text-claro/50">{label}</dt>
              <dd className="min-w-0 truncate text-claro/90">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  )
}
