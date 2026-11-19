import { Salon } from '@/components/idolos/Salon'
import { idolos } from '@/data/idolos'
import { formatEtapas } from '@/engine/idolos'

const title = 'Salón de ídolos'
const description =
  'Diez leyendas de Boca Juniors, de Varallo a Tevez: Rattín, Marzolini, Rojitas, Gatti, Maradona, Riquelme, Palermo y Bianchi. Datos con fuente y fotos libres.'

export const metadata = {
  title,
  description,
  alternates: { canonical: '/idolos' },
  openGraph: {
    title: `${title} · Boca Juniors`,
    description,
    images: [{ url: '/idolos/palermo.webp', width: 874, height: 1171, alt: 'Martín Palermo con la camiseta de Boca' }],
  },
}

/** Página pública. El salón anima en el cliente; acá queda el texto para buscadores y lectores sin JS. */
export default function IdolosPage() {
  return (
    <>
      <ol className="sr-only">
        {idolos.map((i) => (
          <li key={i.slug}>
            {i.nombre}
            {i.apodo ? ` («${i.apodo}»)` : ''}, {i.rol}, en Boca {formatEtapas(i.etapas)}. {i.datos.join(' ')}
          </li>
        ))}
      </ol>
      <Salon />
    </>
  )
}
