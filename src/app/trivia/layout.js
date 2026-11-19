import { SectionHeader } from '@/components/layout/SectionHeader'
import { TriviaAccount, TriviaNav } from '@/components/trivia/TriviaNav'

/** Trivia xeneize: área pública (jugar, ranking) con una página privada (Mis partidas) */
export default function TriviaLayout({ children }) {
  return (
    <div className="grain relative min-h-dvh overflow-x-clip">
      <SectionHeader title="Trivia" accent="xeneize" href="/trivia" label="Trivia xeneize, inicio" end={<TriviaAccount />}>
        <TriviaNav />
      </SectionHeader>
      <main className="relative mx-auto max-w-6xl px-4 pt-8 pb-20 md:px-8 md:pt-12">{children}</main>
    </div>
  )
}
