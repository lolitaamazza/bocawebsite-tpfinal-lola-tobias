'use client'

import Image from 'next/image'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'
import { site } from '../../config/site'
/**
 * Telón de entrada: escudo, nombre y barra de carga. Cuando la escena está lista,
 * la barra se completa y el telón sube (GSAP) dejando ver el vestuario.
 */
export function Loader({ progress, done }) {
  const root = useRef(null)
  const bar = useRef(null)
  useGSAP(
    () => {
      gsap.from('[data-loader-item]', { y: 18, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' })
    },
    { scope: root },
  )
  useGSAP(
    () => {
      gsap.to(bar.current, { scaleX: Math.max(0.04, progress), duration: 0.5, ease: 'power2.out' })
    },
    { dependencies: [progress] },
  )
  useGSAP(
    () => {
      if (!done) return
      gsap
        .timeline()
        .to(bar.current, { scaleX: 1, duration: 0.3, ease: 'power2.out' })
        .to('[data-loader-item]', { y: -14, opacity: 0, duration: 0.45, stagger: 0.05, ease: 'power2.in' })
        .to(root.current, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '-=0.1')
        .set(root.current, { display: 'none' })
    },
    { dependencies: [done], scope: root },
  )
  return (
    <div ref={root} className="absolute inset-0 z-50 grid place-items-center bg-fondo" aria-hidden={done}>
      <div className="flex flex-col items-center">
        <Image unoptimized priority data-loader-item src={site.crest.src} alt="" width={842} height={1000} className="h-24 w-auto md:h-28" />
        <p data-loader-item className="mt-6 font-display text-3xl tracking-[0.02em] uppercase md:text-4xl">
          Boca <span className="text-oro">Juniors</span>
        </p>
        <p data-loader-item className="eyebrow mt-3 text-claro/60">
          El vestuario · {site.season}
        </p>
        <div data-loader-item className="mt-6 h-px w-40 overflow-hidden bg-white/15">
          <div ref={bar} className="h-full origin-left scale-x-0 bg-oro" />
        </div>
      </div>
    </div>
  )
}
