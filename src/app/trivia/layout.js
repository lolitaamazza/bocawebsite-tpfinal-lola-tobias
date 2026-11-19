import Link from 'next/link'
import { SiteMenu } from '@/components/layout/SiteMenu'
import { TriviaAccount, TriviaNav } from '@/components/trivia/TriviaNav'
import { site } from '@/config/site'

/** Trivia xeneize: área pública (jugar, ranking) con una página privada (Mis partidas) */
export default function TriviaLayout({ children }) {
  return (
    <div className="grain relative min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-fondo/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-8">
          <SiteMenu />
          <Link href="/trivia" className="flex items-center gap-2.5" aria-label="Trivia xeneize, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.crest.src} alt="" width={842} height={1000} className="h-9 w-auto" />
            <span className="font-display text-lg leading-none uppercase">
              Trivia <span className="text-oro">xeneize</span>
            </span>
          </Link>
          <TriviaNav />
          <div className="ml-auto flex items-center gap-3">
            <TriviaAccount />
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-4 pt-8 pb-20 md:px-8 md:pt-12">{children}</main>
    </div>
  )
}
