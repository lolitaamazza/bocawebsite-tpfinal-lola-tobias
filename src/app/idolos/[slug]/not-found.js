import Link from 'next/link'

/** Slug que no está en el salón */
export default function IdoloNotFound() {
  return (
    <main className="paper-grunge grid min-h-dvh place-items-center px-6 text-center text-claro">
      <div>
        <p className="eyebrow text-oro">Error 404</p>
        <h1 className="print-ink mt-1 pt-[0.14em] font-display text-5xl uppercase">Ese nombre no está en el salón</h1>
        <p className="mt-3 text-claro/60">Todavía. Mientras tanto, conocé a los que sí.</p>
        <Link
          href="/idolos"
          className="eyebrow mt-6 inline-flex h-10 items-center rounded-full bg-oro px-5 text-fondo"
        >
          Ir al salón de ídolos
        </Link>
      </div>
    </main>
  )
}
