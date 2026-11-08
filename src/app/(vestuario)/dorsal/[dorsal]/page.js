import { notFound } from 'next/navigation'
import { site } from '@/config/site'
import { playerByDorsal, squad, statsFor } from '@/data'

/** Una página por dorsal, generada en el build */
export function generateStaticParams() {
  return squad.map((p) => ({ dorsal: String(p.dorsal) }))
}

export const dynamicParams = false

async function playerFrom(params) {
  const { dorsal } = await params
  return /^\d+$/.test(dorsal) ? playerByDorsal(Number(dorsal)) : null
}

export async function generateMetadata({ params }) {
  const p = await playerFrom(params)
  if (!p) return {}
  const title = `${p.nombre} ${p.apellido} · Dorsal ${p.dorsal}`
  const description = `${p.rol} de ${site.name}, ${p.edad} años, ${p.pais}. Su camiseta ${p.dorsal} en el vestuario 3D.`
  return {
    title,
    description,
    alternates: { canonical: `/dorsal/${p.dorsal}` },
    openGraph: { title, description, images: [{ url: '/og/vestuario.jpg', width: 1200, height: 630 }] },
  }
}

/** Ficha accesible del jugador. La versión visual la abre el vestuario según la URL. */
export default async function DorsalPage({ params }) {
  const p = await playerFrom(params)
  if (!p) notFound()
  const s = statsFor(p)
  return (
    <article>
      <h1>
        {p.dorsal} · {p.nombre} {p.apellido}
      </h1>
      <p>
        {p.rol}
        {p.capitan ? ', capitán' : ''}. {p.edad} años, {p.pais}. Llegó de {p.procedencia}.
      </p>
      {s ? (
        <p>
          Torneo Clausura {site.season}: {s.pj} partidos ({s.tit} de titular), {s.min} minutos, {s.goles} goles, {s.asist} asistencias.
        </p>
      ) : null}
    </article>
  )
}
