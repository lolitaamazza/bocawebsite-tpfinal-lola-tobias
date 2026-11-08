import { notFound } from 'next/navigation'
import { PageHead } from '@/components/account/PageHead'
import { LineupForm } from '@/components/lineups/LineupForm'
import { DeleteButton } from '@/components/ui/form'
import { requireUser } from '@/lib/auth'
import { lineups } from '@/lib/data/lineups'
import { deleteLineup, updateLineup } from '../actions'

async function load(params) {
  const { id } = await params
  const user = await requireUser(`/mi-xi/${id}`)
  return lineups.get(user.uid, id)
}

export async function generateMetadata({ params }) {
  const l = await load(params)
  return { title: l ? l.name : 'Mi XI', robots: { index: false } }
}

export default async function XiPage({ params }) {
  const lineup = await load(params)
  if (!lineup) notFound()
  return (
    <>
      <PageHead eyebrow={`Mi XI · ${lineup.formation}`} title={lineup.name}>
        <DeleteButton action={deleteLineup.bind(null, lineup.id)} label="Borrar XI" confirmText={`¿Borrar "${lineup.name}"? No se puede deshacer.`} />
      </PageHead>
      <div className="mt-8">
        <LineupForm action={updateLineup.bind(null, lineup.id)} initial={lineup} submitLabel="Guardar cambios" />
      </div>
    </>
  )
}
