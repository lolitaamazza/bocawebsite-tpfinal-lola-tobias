'use client'

import dynamic from 'next/dynamic'

/**
 * El vestuario es 100 % cliente (WebGL, ventana, audio): se carga sin SSR.
 * Mientras baja el bundle se ve el mismo fondo que el telón de carga.
 */
const VestuarioContainer = dynamic(() => import('@/containers/VestuarioContainer').then((m) => m.VestuarioContainer), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-fondo" aria-hidden="true" />,
})

export function VestuarioClient() {
  return <VestuarioContainer />
}
