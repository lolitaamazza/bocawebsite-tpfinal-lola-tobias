import Link from 'next/link'
import { Recorrido } from './Recorrido'
import { piezas } from './piezas'
import styles from './museo.module.css'

export const metadata = {
  title: 'Museo de camisetas',
  description: 'Una editorial animada sobre las camisetas de Boca Juniors, desde 1905 hasta la actualidad.',
}

const sources = [
  ['https://www.bocajuniors.com.ar/identidad', 'Archivo de indumentaria de Boca Juniors'],
  ['https://www.bocajuniors.com.ar/historias', 'Historia oficial de Boca Juniors'],
  ['https://www.bocajuniors.com.ar/noticias/querido-brasileno', 'Foto del plantel de 1965'],
  ['https://www.bocajuniors.com.ar/noticias/la-nueva-piel-de-boca', 'Presentación oficial de la titular 2025'],
  ['https://www.adidas.com.ar/camiseta-titular-boca-juniors-26-27-version-jugador/KB4376.html', 'Fotografía de la titular 2026/27 de adidas'],
]

export default function Museo() {
  return (
    <main className={styles.museo}>
      <Recorrido />
      <footer className={styles.footer} id="creditos">
        <p className={styles.label}>Club Atlético Boca Juniors / Archivo de indumentaria</p>
        <h2>Créditos del archivo</h2>
        <ul>
          {sources.map(([url, label]) => <li key={url}><a href={url}>{label} ↗</a></li>)}
        </ul>
        <details className={styles.notes}>
          <summary>Consultar las fichas de la colección</summary>
          <dl>
            {piezas.map((piece) => (
              <div key={piece.id}>
                <dt>{piece.year} · {piece.title}</dt>
                <dd>
                  <p>{piece.season}. {piece.description}</p>
                  {piece.verified
                    ? <a href={piece.imageSource}>Fuente de la fotografía ↗</a>
                    : <a href={piece.historySource}>Fotografía pendiente · Contexto histórico ↗</a>}
                </dd>
              </div>
            ))}
          </dl>
        </details>
        <Link href="/" className={styles.returnLink}>← Volver al vestuario</Link>
      </footer>
    </main>
  )
}
