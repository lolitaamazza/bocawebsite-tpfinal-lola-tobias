import Link from 'next/link'
import { positions, site } from '@/config/site'
import { squad } from '@/data'

/** Home: el vestuario completo. Para lectores de pantalla y buscadores, el plantel como lista. */
export default function Home() {
  return (
    <article>
      <h1>
        {site.siteName} · Plantel {site.season}
      </h1>
      {positions.map((p) => (
        <section key={p.key}>
          <h2>{p.label}</h2>
          <ul>
            {squad
              .filter((s) => s.pos === p.key)
              .map((s) => (
                <li key={s.id}>
                  <Link href={`/dorsal/${s.dorsal}/`}>
                    {s.dorsal}. {s.nombre} {s.apellido}, {s.rol}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </article>
  )
}
