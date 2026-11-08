'use client'

import dynamic from 'next/dynamic'

/** El riel 3D solo existe en el navegador: se carga sin SSR */
export const PersonalRackClient = dynamic(() => import('./PersonalRack').then((m) => m.PersonalRack), {
  ssr: false,
  loading: () => <div className="h-[min(72dvh,640px)] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />,
})
