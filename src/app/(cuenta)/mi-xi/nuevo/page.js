import { PageHead } from '@/components/account/PageHead'
import { LineupForm } from '@/components/lineups/LineupForm'
import { createLineup } from '../actions'

export const metadata = { title: 'Nuevo XI', robots: { index: false } }

export default function NuevoXiPage() {
  return (
    <>
      <PageHead eyebrow="Mi XI ideal" title="Nuevo XI" />
      <div className="mt-8">
        <LineupForm action={createLineup} initial={{ name: '', formation: '4-3-3', slots: [], captain: 0 }} submitLabel="Guardar XI" />
      </div>
    </>
  )
}
