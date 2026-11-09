'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useEffect, useRef, useState } from 'react'
import { site } from '@/config/site'
import { historia } from '@/data/historia'
import { createEdgePush, stepEdgePush } from '@/engine/rail'
import { VIEW_COOLDOWN, useVestuario } from '@/store/vestuario'
import { Panel } from './Panel'
import { QuickLinks } from './QuickLinks'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const TOTAL = historia.length

/** Vuelve al vestuario y, si hace falta, abre algo ahí (personalizador, ficha) */
const backTo = (selection = null) => {
  const s = useVestuario.getState()
  if (s.view !== 'historia') return
  s.setView('vestuario')
  if (selection) setTimeout(() => useVestuario.getState().select(selection), 1100)
}

/**
 * Historia en la piel: capa a pantalla completa que entra desde abajo cuando el
 * riel del vestuario llega al final. Adentro, el scroll vertical mueve un
 * recorrido horizontal (pin + scrub) con las camisetas del museo y sus fotos
 * reales; después vienen los atajos y los créditos. Subiendo desde el principio
 * se vuelve al vestuario.
 */
export function HistoriaSection() {
  const view = useVestuario((s) => s.view)
  const layer = useRef(null)
  const pinWrap = useRef(null)
  const track = useRef(null)
  const counter = useRef(null)
  const bar = useRef(null)
  const content = useRef(null)
  const transition = useRef(null)
  const lenis = useRef(null)
  const [mounted, setMounted] = useState(false)
  const open = view === 'historia'

  // Se monta la primera vez que se pide (no carga fotos mientras nadie la ve)
  if (open && !mounted) setMounted(true)

  // Entrada y salida: el vestuario se hunde y la Historia sube desde abajo.
  // Una sola línea de tiempo viva: si cambia la vista a mitad de camino se corta
  // la anterior (si no, su final pausaba el 3D con el vestuario ya a la vista).
  useGSAP(
    () => {
      const el = layer.current
      if (!el) return
      const stage = document.getElementById('vestuario-stage')
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      const d = reduced ? 0.01 : 1.15
      transition.current?.kill()
      if (open) {
        useVestuario.setState({ stagePaused: false })
        gsap.set(el, { visibility: 'visible' })
        lenis.current?.start()
        const tl = gsap.timeline({
          onComplete: () => {
            if (useVestuario.getState().view !== 'historia') return
            useVestuario.setState({ stagePaused: true })
            ScrollTrigger.refresh()
            el.focus({ preventScroll: true })
          },
        })
        tl.to(stage, { yPercent: -18, scale: 0.94, opacity: 0.2, duration: d, ease: 'expo.inOut' }, 0)
        tl.fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: d, ease: 'expo.inOut' }, 0)
        tl.fromTo(
          '[data-intro-line]',
          { yPercent: 110 },
          { yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'power4.out' },
          d * 0.55,
        )
        transition.current = tl
      } else if (mounted) {
        useVestuario.setState({ stagePaused: false })
        lenis.current?.stop()
        const tl = gsap.timeline({
          onComplete: () => {
            if (useVestuario.getState().view === 'historia') return
            gsap.set(el, { visibility: 'hidden' })
            lenis.current?.scrollTo(0, { immediate: true, force: true })
            el.scrollTo({ top: 0 })
          },
        })
        tl.to(el, { yPercent: 100, duration: d, ease: 'expo.inOut' }, 0)
        tl.to(stage, { yPercent: 0, scale: 1, opacity: 1, duration: d, ease: 'expo.inOut', clearProps: 'transform,opacity' }, 0)
        transition.current = tl
      }
    },
    { dependencies: [open, mounted] },
  )

  // Scroll suavizado dentro de la capa (la rueda del mouse salta de a 100 px)
  useEffect(() => {
    const wrapper = layer.current
    if (!mounted || !wrapper || !content.current) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const l = new Lenis({
      wrapper,
      content: content.current,
      lerp: reduced ? 1 : 0.085,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.2,
    })
    l.on('scroll', ScrollTrigger.update)
    const raf = (t) => l.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    lenis.current = l
    if (useVestuario.getState().view !== 'historia') l.stop()
    return () => {
      gsap.ticker.remove(raf)
      l.destroy()
      lenis.current = null
    }
  }, [mounted])

  // Recorrido horizontal, paralaje de fotos y apariciones
  useGSAP(
    () => {
      const scroller = layer.current
      const strip = track.current
      if (!mounted || !scroller || !strip) return
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      const distance = () => Math.max(0, strip.scrollWidth - window.innerWidth)
      // Sin pin de GSAP: el carril es sticky y su contenedor mide lo que hay que recorrer.
      // (El pin por transform dentro de un scroller propio tiembla.)
      const fit = () => void (pinWrap.current.style.height = `${distance() + window.innerHeight}px`)
      fit()
      ScrollTrigger.addEventListener('refreshInit', fit)
      const horizontal = gsap.to(strip, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: pinWrap.current,
          scroller,
          scrub: true,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const i = Math.min(TOTAL, Math.max(1, Math.round(self.progress * (TOTAL - 1)) + 1))
            if (counter.current) counter.current.textContent = String(i).padStart(2, '0')
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`
          },
        },
      })
      if (!reduced) {
        strip.querySelectorAll('[data-parallax]').forEach((img) => {
          gsap.fromTo(
            img,
            { xPercent: -9 },
            {
              xPercent: 9,
              ease: 'none',
              scrollTrigger: {
                trigger: img.parentElement,
                scroller,
                containerAnimation: horizontal,
                start: 'left right',
                end: 'right left',
                scrub: true,
              },
            },
          )
        })
        strip.querySelectorAll('[data-ghost]').forEach((g) => {
          gsap.fromTo(
            g,
            { xPercent: 30 },
            {
              xPercent: -30,
              ease: 'none',
              scrollTrigger: {
                trigger: g.parentElement,
                scroller,
                containerAnimation: horizontal,
                start: 'left right',
                end: 'right left',
                scrub: true,
              },
            },
          )
        })
        strip.querySelectorAll('[data-panel-title]').forEach((t) => {
          gsap.from(t, {
            yPercent: 35,
            opacity: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: t,
              scroller,
              containerAnimation: horizontal,
              start: 'left 92%',
              end: 'left 60%',
              scrub: true,
            },
          })
        })
        gsap.utils.toArray('[data-reveal-up]', scroller).forEach((el) => {
          gsap.from(el, {
            y: 40,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, scroller, start: 'top 90%' },
          })
        })
      }
      ScrollTrigger.refresh()
      return () => ScrollTrigger.removeEventListener('refreshInit', fit)
    },
    { dependencies: [mounted], scope: layer },
  )

  // Volver al vestuario: rueda o gesto hacia arriba desde el principio, o Escape
  useEffect(() => {
    const el = layer.current
    if (!el || !open) return
    const push = createEdgePush()
    let touchY = null
    const atTop = () => (lenis.current ? lenis.current.scroll : el.scrollTop) <= 2
    const settled = () => performance.now() - useVestuario.getState().viewChangedAt > VIEW_COOLDOWN
    const wheel = (e) => {
      if (!atTop() || !settled()) return (push.amount = 0)
      if (stepEdgePush(push, -e.deltaY, true, performance.now())) backTo()
    }
    const touchStart = (e) => (touchY = atTop() && settled() ? e.touches[0].clientY : null)
    const touchEnd = (e) => {
      if (touchY !== null && e.changedTouches[0].clientY - touchY > 110) backTo()
      touchY = null
    }
    const key = (e) => {
      if (e.key === 'Escape') backTo()
    }
    el.addEventListener('wheel', wheel, { passive: true })
    el.addEventListener('touchstart', touchStart, { passive: true })
    el.addEventListener('touchend', touchEnd, { passive: true })
    addEventListener('keydown', key)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('touchstart', touchStart)
      el.removeEventListener('touchend', touchEnd)
      removeEventListener('keydown', key)
    }
  }, [open])

  const atajos = [
    { label: 'Volver al vestuario 3D', hint: 'El plantel 2026, una remera por jugador.', onClick: () => backTo() },
    { label: 'Personalizá tu remera', hint: 'Tu nombre y tu número, en vivo sobre la titular.', onClick: () => backTo('custom') },
    { label: 'Mis remeras', hint: 'Las que diseñaste y guardaste en tu cuenta.', href: '/mis-remeras' },
    { label: 'Mi XI ideal', hint: 'Armá el equipo que pondrías vos.', href: '/mi-xi' },
    { label: 'El museo completo', hint: 'Todas las piezas con sus fuentes.', href: '/museo' },
  ]

  return (
    <section
      ref={layer}
      tabIndex={-1}
      aria-label="Historia en la piel"
      aria-hidden={!open}
      inert={!open}
      className="invisible fixed inset-0 z-[60] overflow-x-hidden overflow-y-auto overscroll-contain bg-[#05080f] text-claro outline-none"
    >
      {mounted ? (
        <div ref={content}>
          {/* barra fija: volver, nombre de la sección y avance del recorrido */}
          <header className="pointer-events-none sticky top-0 z-20 flex items-center justify-between gap-4 bg-gradient-to-b from-[#05080f] via-[#05080f]/80 to-transparent px-[clamp(1.25rem,3vw,2.5rem)] pt-4 pb-8">
            <button
              type="button"
              onClick={() => backTo()}
              className="eyebrow pointer-events-auto flex items-center gap-2 text-claro/70 hover:text-claro"
            >
              <span aria-hidden="true">↑</span> Vestuario
            </button>
            <p className="eyebrow hidden text-oro sm:block">Historia en la piel · 1905 — {site.season}</p>
            <p className="eyebrow pointer-events-auto text-claro/70" aria-live="off">
              <span ref={counter}>01</span> / {String(TOTAL).padStart(2, '0')}
            </p>
            <span className="absolute inset-x-[clamp(1.25rem,3vw,2.5rem)] bottom-5 h-px bg-white/10">
              <span ref={bar} className="block h-full origin-left scale-x-0 bg-oro" />
            </span>
          </header>

          {/* apertura */}
          <div className="relative -mt-16 flex min-h-dvh flex-col justify-center px-[clamp(1.25rem,5vw,5rem)]">
            <p className="eyebrow overflow-hidden text-oro">
              <span data-intro-line className="block">
                Del vestuario al archivo
              </span>
            </p>
            {/* Cada línea se revela desde abajo: el recorte lleva aire arriba y abajo para no comerse comas ni acentos */}
            <h2 className="mt-4 font-display text-[clamp(3.4rem,11.5vw,12rem)] leading-[0.9] uppercase">
              <span className="-my-[0.08em] block overflow-hidden py-[0.08em]">
                <span data-intro-line className="block">
                  Cosida,
                </span>
              </span>
              <span className="-my-[0.08em] block overflow-hidden py-[0.08em]">
                <span data-intro-line className="flex flex-wrap items-baseline gap-x-[0.18em]">
                  <span className="font-serif text-[0.6em] leading-none tracking-normal text-oro normal-case italic">nunca</span>
                  <span>estampada.</span>
                </span>
              </span>
            </h2>
            <p className="mt-8 max-w-[52ch] text-[15px] leading-relaxed text-claro/70 md:text-base">
              Antes de la franja, de los sponsors y del 3D hubo una camiseta blanca con tiras negras cosidas a mano. Estas son las
              pieles que vistió Boca desde 1905, cada una con una foto real de su época.
            </p>
            <p className="eyebrow mt-12 flex items-center gap-3 text-claro/50">
              Seguí bajando <span className="animate-nudge inline-block">↓</span>
            </p>
          </div>

          {/* recorrido horizontal */}
          <div ref={pinWrap} className="relative">
            <div className="sticky top-0 h-dvh overflow-hidden">
              <div ref={track} className="flex h-full w-max items-center will-change-transform">
                {historia.map((p, i) => (
                  <Panel key={p.id} pieza={p} total={TOTAL} variant={i % 3} />
                ))}
                <div className="flex h-full w-[60vw] shrink-0 flex-col justify-center px-[6vw]">
                  <p className="eyebrow text-oro">Fin del recorrido</p>
                  <p className="mt-3 font-display text-[clamp(2.5rem,6vw,6rem)] leading-[0.9] uppercase">
                    La próxima
                    <br />
                    <span className="font-serif text-oro normal-case italic">la escribís vos.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* atajos */}
          <div className="py-[18vh]">
            <QuickLinks items={atajos} />
          </div>

          {/* créditos de fotos */}
          <footer className="border-t border-white/10 px-[clamp(1.25rem,4vw,3rem)] py-12">
            <div className="mx-auto max-w-6xl">
              <p className="eyebrow text-claro/50">Fotos de época</p>
              <p className="mt-2 max-w-[70ch] text-sm text-claro/55">
                Fotografías de Wikimedia Commons (dominio público o licencias Creative Commons, con su autor en cada epígrafe).
                Las camisetas son del archivo de indumentaria del club. Tributo no oficial.
              </p>
              <button
                type="button"
                onClick={() => backTo()}
                className="eyebrow mt-8 inline-flex h-10 items-center gap-2 rounded-full bg-oro px-5 text-fondo"
              >
                ↑ Volver al vestuario
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </section>
  )
}
