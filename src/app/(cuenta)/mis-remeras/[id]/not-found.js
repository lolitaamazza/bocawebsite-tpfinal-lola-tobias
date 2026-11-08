import Link from 'next/link'
import { primaryButton } from '@/components/account/PageHead'

export default function RemeraNotFound() {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center">
      <p className="font-display text-3xl uppercase">Esa remera no está</p>
      <p className="mt-2 text-claro/60">Puede que la hayas borrado o que no sea tuya.</p>
      <Link href="/mis-remeras" className={`${primaryButton} mt-6`}>
        Volver a Mis remeras
      </Link>
    </div>
  )
}
