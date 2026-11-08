import { VestuarioClient } from '@/components/three/VestuarioClient'

/**
 * Las rutas públicas del vestuario (/, /dorsal/[dorsal], /personaliza) comparten
 * este layout: el canvas 3D se monta una vez y no se recarga al abrir fichas.
 * Las páginas solo aportan metadata y un texto accesible para buscadores.
 */
export default function VestuarioLayout({ children }) {
  return (
    <>
      <VestuarioClient />
      <div className="sr-only">{children}</div>
    </>
  )
}
