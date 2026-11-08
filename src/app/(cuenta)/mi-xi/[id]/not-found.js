import Link from 'next/link'
import { primaryButton } from '@/components/account/PageHead'

export default function XiNotFound() {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center">
      <p className="font-display text-3xl uppercase">Ese XI no está</p>
      <p className="mt-2 text-claro/60">Puede que lo hayas borrado o que no sea tuyo.</p>
      <Link href="/mi-xi" className={`${primaryButton} mt-6`}>
        Volver a Mi XI
      </Link>
    </div>
  )
}
