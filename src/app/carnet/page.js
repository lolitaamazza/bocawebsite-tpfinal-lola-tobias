import { CarnetEditor } from '@/components/carnet/CarnetEditor'
import { Guilloche } from '@/components/carnet/Guilloche'
import { carnets } from '@/lib/data/carnets'
import { CARNET_DEFAULTS, currentYear, draftFromSearchParams, valuesOf } from '@/lib/domain/carnet'
import { getSessionUser } from '@/lib/firebase/session'
import { saveCarnet } from './actions'

export const metadata = {
  title: 'Carnet de hincha',
  description: 'Armá tu carnet de hincha virtual de Boca: nombre, apodo, desde qué año, dónde lo mirás y tu ídolo. Descargalo en PNG o guardalo en tu cuenta. Tributo no oficial.',
  alternates: { canonical: '/carnet' },
}

/**
 * Editor público. Sin sesión se diseña y se descarga; con sesión se lee el carnet
 * guardado (Firestore, en el servidor) y se guarda con una Server Action.
 * Si el login volvió con un borrador en la URL, ese borrador manda.
 */
export default async function CarnetPage({ searchParams }) {
  const [user, sp] = await Promise.all([getSessionUser(), searchParams])
  let saved = null
  let loadError = false
  if (user) {
    try {
      saved = await carnets.get(user.uid)
    } catch (e) {
      // El editor funciona igual: se avisa y se puede seguir diseñando y descargando
      console.error('[carnet] no se pudo leer:', e)
      loadError = true
    }
  }
  const savedValues = valuesOf(saved)
  const initial = { ...CARNET_DEFAULTS, ...(savedValues ?? {}), ...(draftFromSearchParams(sp) ?? {}) }

  return (
    <>
      <section className="relative isolate pb-10 md:pb-14">
        <Guilloche className="pointer-events-none absolute -top-16 right-[-10%] -z-10 h-[150%] w-[75%] text-oro opacity-[0.13] md:right-0 md:w-[60%]" />
        <p className="eyebrow text-oro">Carnet virtual · Tributo no oficial</p>
        <h1 className="mt-3 font-display text-[clamp(3rem,9vw,6.5rem)] leading-[0.88] uppercase">
          Tu carnet
          <br />
          de <span className="text-oro">hincha</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-claro/70">
          Tu nombre, desde qué año sos de Boca, dónde lo mirás y tu ídolo. Se arma en vivo:{' '}
          <span className="font-serif text-xl text-claro italic">descargalo en PNG o guardalo en tu cuenta.</span>
        </p>
      </section>

      {loadError ? (
        <p role="alert" className="mb-8 rounded-xl border border-red-400/30 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
          No pudimos traer tu carnet guardado. Podés seguir diseñando y descargarlo; para guardarlo, probá de nuevo en un rato.
        </p>
      ) : null}

      <CarnetEditor
        action={saveCarnet}
        initial={initial}
        saved={saved ? { values: savedValues, createdAt: saved.createdAt, updatedAt: saved.updatedAt } : null}
        maxYear={currentYear()}
        today={new Date().toISOString()}
      />
    </>
  )
}
