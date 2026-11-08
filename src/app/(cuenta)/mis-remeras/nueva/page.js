import { PageHead } from '@/components/account/PageHead'
import { JerseyForm } from '@/components/jerseys/JerseyForm'
import { createJersey } from '../actions'

export const metadata = { title: 'Nueva remera', robots: { index: false } }

export default async function NuevaRemeraPage({ searchParams }) {
  // Se puede llegar con nombre y número precargados (desde una ficha o el personalizador)
  const { nombre = '', dorsal = '' } = await searchParams
  return (
    <>
      <PageHead eyebrow="Mis remeras" title="Nueva remera" />
      <div className="mt-8">
        <JerseyForm action={createJersey} initial={{ name: String(nombre), number: String(dorsal), size: 'M', note: '' }} submitLabel="Guardar remera" />
      </div>
    </>
  )
}
