import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LoginForm } from '@/components/account/LoginForm'
import { site } from '@/config/site'
import { getSessionUser } from '@/lib/firebase/session'

export const metadata = {
  title: 'Ingresar',
  description: 'Entrá con tu cuenta para guardar tus remeras personalizadas y armar tu XI ideal de Boca.',
  robots: { index: false },
}

export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams
  if (await getSessionUser()) redirect(typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/mis-remeras')
  return (
    <main className="grain relative grid min-h-dvh place-items-center bg-[radial-gradient(90%_70%_at_50%_0%,#0d1c47_0%,transparent_70%)] px-4 py-10">
      <div className="flex w-full flex-col items-center">
        <Link href="/" className="mb-8 flex items-center gap-3" aria-label="Volver al vestuario">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={site.crest.src} alt="" width={842} height={1000} className="h-12 w-auto" />
          <span className="font-display text-2xl uppercase">
            Boca <span className="text-oro">Juniors</span>
          </span>
        </Link>
        <Suspense>
          <LoginForm />
        </Suspense>
        <Link href="/" className="eyebrow mt-6 text-claro/50 hover:text-claro">
          ← Volver al vestuario
        </Link>
      </div>
    </main>
  )
}
