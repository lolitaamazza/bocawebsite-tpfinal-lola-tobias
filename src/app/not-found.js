import Link from 'next/link'

export const metadata = { title: 'Página no encontrada' }

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-fondo px-6 text-center">
      <div>
        <p className="eyebrow text-oro">Error 404</p>
        <h1 className="mt-2 font-display text-5xl uppercase">Fuera de juego</h1>
        <p className="mt-3 text-claro/60">Esta percha está vacía.</p>
        <Link href="/" className="eyebrow mt-6 inline-flex h-10 items-center rounded-full bg-oro px-5 text-fondo">
          Volver al vestuario
        </Link>
      </div>
    </main>
  )
}
