import { notFound } from 'next/navigation'
import { PageHead } from '@/components/account/PageHead'
import { JerseyForm } from '@/components/jerseys/JerseyForm'
import { DeleteButton } from '@/components/ui/form'
import { requireUser } from '@/lib/auth'
import { jerseys } from '@/lib/data/jerseys'
import { deleteJersey, updateJersey } from '../actions'

async function load(params) {
  const { id } = await params
  const user = await requireUser(`/mis-remeras/${id}`)
  // Si el id es de otro usuario, get() devuelve null igual que si no existiera
  return jerseys.get(user.uid, id)
}

export async function generateMetadata({ params }) {
  const j = await load(params)
  return { title: j ? `${j.name} ${j.number}` : 'Remera', robots: { index: false } }
}

/** Edición y baja de una remera (ruta dinámica) */
export default async function RemeraPage({ params }) {
  const jersey = await load(params)
  if (!jersey) notFound()
  return (
    <>
      <PageHead eyebrow="Editar remera" title={`${jersey.name} ${jersey.number}`}>
        <DeleteButton action={deleteJersey.bind(null, jersey.id)} label="Borrar remera" confirmText={`¿Borrar la remera ${jersey.name} ${jersey.number}? No se puede deshacer.`} />
      </PageHead>
      <div className="mt-8">
        <JerseyForm action={updateJersey.bind(null, jersey.id)} initial={jersey} submitLabel="Guardar cambios" />
      </div>
    </>
  )
}
