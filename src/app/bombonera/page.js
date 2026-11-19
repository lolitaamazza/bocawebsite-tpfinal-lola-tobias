import { Bombonera } from '@/components/bombonera/Bombonera'
import { UBICACIONES } from '@/three/bombonera/layout'

export const metadata = {
  title: 'La Bombonera en 3D',
  description:
    'Recorré el Estadio Alberto J. Armando, inaugurado el 25 de mayo de 1940 en La Boca, y mirá la cancha desde la platea, la popular o los palcos.',
  alternates: { canonical: '/bombonera' },
}

/** Página pública. El estadio se dibuja en el cliente; acá queda el texto para buscadores y lectores. */
export default function BomboneraPage() {
  return (
    <>
      <p className="sr-only">
        La Bombonera, Estadio Alberto J. Armando, en La Boca. Ubicaciones para mirar la cancha:{' '}
        {UBICACIONES.map((u) => u.label).join(', ')}.
      </p>
      <Bombonera />
    </>
  )
}
