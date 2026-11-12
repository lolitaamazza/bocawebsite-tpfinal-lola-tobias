import { site } from '../../config/site'
import { squad } from '../../data'
import { SiteMenu } from './SiteMenu'
/** Versión accesible / sin WebGL: el plantel como lista con enlaces a cada ficha */
export function Fallback({ reason }) {
  return (
    <section className="absolute inset-0 z-50 overflow-auto bg-fondo p-8 text-claro">
      <div className="flex items-center gap-4">
        <SiteMenu />
        <h2 className="font-display text-3xl uppercase">
          Plantel {site.name} {site.season}
        </h2>
      </div>
      {reason ? <p className="mt-2 text-sm text-claro/60">{reason}</p> : null}
      <ul className="mt-6 columns-1 gap-8 md:columns-2">
        {squad.map((p) => (
          <li key={p.id} className="py-1">
            <a href={`/dorsal/${p.dorsal}`} className="underline decoration-white/30 underline-offset-4 hover:decoration-oro">
              {p.dorsal}. {p.nombre} {p.apellido} — {p.rol} ({p.pais})
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
