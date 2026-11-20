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
import { SiteMenu } from '@/components/layout/SiteMenu'
import { Vitrina } from './Vitrina'
import { BomboneraSection, CarnetSection, IdolosSection, TriviaSection } from './LandingSections'

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
      lerp: reduced ? 1 : 0.12,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.5,
      gestureOrientation: 'both',
      syncTouch: true,
    })
    l.on('scroll', ScrollTrigger.update)
    const raf = (t) => l.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    lenis.current = l
    wrapper.__lenis = l
    if (typeof window !== 'undefined') window.__bocaLenis = l
    if (useVestuario.getState().view !== 'historia') l.stop()
    return () => {
      gsap.ticker.remove(raf)
      l.destroy()
      lenis.current = null
      delete wrapper.__lenis
      if (typeof window !== 'undefined') delete window.__bocaLenis
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
        // Todo atado al avance horizontal (containerAnimation) y con scrub: se puede ir y volver
        const along = (trigger, start, end) => ({
          trigger,
          scroller,
          containerAnimation: horizontal,
          start,
          end,
          scrub: true,
        })
        // la imagen se desliza adentro de su recorte rasgado
        strip.querySelectorAll('[data-parallax]').forEach((img) => {
          gsap.fromTo(
            img,
            { xPercent: -8 },
            { xPercent: 8, ease: 'none', scrollTrigger: along(img.parentElement, 'left right', 'right left') },
          )
        })
        // collage: cada foto y cada etiqueta derivan a su velocidad y giran un poco
        strip.querySelectorAll('[data-drift]').forEach((el) => {
          const s = Number(el.dataset.drift) || 1
          const spin = Number(el.dataset.spin) || 0
          gsap.fromTo(
            el,
            { x: 70 * s, y: -12 * s, rotation: -spin },
            {
              x: -70 * s,
              y: 12 * s,
              rotation: spin,
              ease: 'none',
              scrollTrigger: along(el.closest('article'), 'left right', 'right left'),
            },
          )
        })
        // el año gigante entra deslizándose
        strip.querySelectorAll('[data-year]').forEach((y) => {
          gsap.fromTo(
            y,
            { xPercent: 28, opacity: 0 },
            { xPercent: 0, opacity: 1, ease: 'power2.out', scrollTrigger: along(y, 'left 98%', 'left 62%') },
          )
        })
        // el título entra con transform + opacidad (evita re-rasterizar la máscara SVG print-ink con clip-path por frame)
        strip.querySelectorAll('[data-panel-title]').forEach((t) => {
          gsap.fromTo(
            t,
            { yPercent: 26, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              ease: 'power2.out',
              scrollTrigger: along(t, 'left 92%', 'left 58%'),
            },
          )
        })
        strip.querySelectorAll('[data-copy]').forEach((c) => {
          gsap.fromTo(
            c,
            { y: 18, opacity: 0 },
            { y: 0, opacity: 1, ease: 'power2.out', scrollTrigger: along(c, 'left 90%', 'left 60%') },
          )
        })
        // las marcas de la línea de tiempo crecen al pasar
        strip.querySelectorAll('[data-tick]').forEach((t) => {
          gsap.fromTo(t, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: along(t, 'left 96%', 'left 75%') })
        })
        // Vitrina: líneas de la cuadrícula que se dibujan, tarjetas a distinta velocidad,
        // fotos con paralaje vertical y números que cuentan hasta su valor
        gsap.utils.toArray('[data-gridline]', scroller).forEach((line, i) => {
          gsap.fromTo(
            line,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: { trigger: line.parentElement, scroller, start: 'top 85%', end: 'top 15%', scrub: true },
              delay: i * 0.02,
            },
          )
        })
        gsap.utils.toArray('[data-speed]', scroller).forEach((card) => {
          const speed = Number(card.dataset.speed) || 1
          gsap.fromTo(
            card,
            { y: 140 * speed },
            {
              y: -140 * speed,
              ease: 'none',
              scrollTrigger: { trigger: card, scroller, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          )
        })
        gsap.utils.toArray('[data-vparallax]', scroller).forEach((img) => {
          gsap.fromTo(
            img,
            { yPercent: -10 },
            {
              yPercent: 10,
              ease: 'none',
              scrollTrigger: { trigger: img.parentElement, scroller, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          )
        })
        gsap.utils.toArray('[data-count]', scroller).forEach((el) => {
          const to = Number(el.dataset.count)
          const n = { v: 0 }
          gsap.to(n, {
            v: to,
            duration: 1.4,
            ease: 'power3.out',
            onUpdate: () => (el.textContent = String(Math.round(n.v))),
            scrollTrigger: { trigger: el, scroller, start: 'top 85%', once: true },
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
      if (e.key === 'Escape' && !e.target?.closest?.('input, select, textarea')) backTo()
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

  const scrollToSection = (selector) => {
    const el = layer.current
    if (!el) return
    const target = el.querySelector(selector)
    if (!target) return
    if (lenis.current) lenis.current.scrollTo(target, { offset: -20 })
    else target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const chapters = [
    { id: '#sec-historia', num: '01', label: 'Historia' },
    { id: '#sec-vitrina', num: '02', label: 'Vitrina' },
    { id: '#sec-idolos', num: '03', label: 'Ídolos' },
    { id: '#sec-bombonera', num: '04', label: 'Bombonera' },
    { id: '#sec-carnet', num: '05', label: 'Carnet' },
    { id: '#sec-trivia', num: '06', label: 'Trivia' },
  ]

  const atajos = [
    { label: 'Volver al vestuario 3D', hint: 'El plantel 2026, una remera por jugador.', onClick: () => backTo() },
    { label: 'Personalizá tu remera', hint: 'Tu nombre y tu número, en vivo sobre la titular.', onClick: () => backTo('custom') },
    { label: 'Vitrina de trofeos 3D', hint: 'Las 51 copas modeladas en 3D, estante por estante.', onClick: () => scrollToSection('#sec-vitrina') },
    { label: 'Salón de ídolos', hint: 'Las diez leyendas que marcaron la historia de Boca.', onClick: () => scrollToSection('#sec-idolos') },
    { label: 'La Bombonera 3D', hint: 'Recorré las bandejas y palcos del Alberto J. Armando.', onClick: () => scrollToSection('#sec-bombonera') },
    { label: 'Tu carnet de hincha', hint: 'Estampá tu credencial xeneize y descargala en PNG.', onClick: () => scrollToSection('#sec-carnet') },
    { label: 'Trivia xeneize', hint: 'Diez preguntas con reloj y tabla de posiciones.', onClick: () => scrollToSection('#sec-trivia') },
    { label: 'Cronología de camisetas 3D', hint: 'Diez camisetas históricas colgadas en su propio riel.', href: '/cronologia' },
    { label: 'El museo completo', hint: 'Todas las piezas con sus fuentes de archivo.', href: '/museo' },
  ]

  return (
    <section
      ref={layer}
      tabIndex={-1}
      aria-label="Experiencia Boca Juniors"
      aria-hidden={!open}
      inert={!open}
      className="invisible fixed inset-0 z-[60] overflow-x-hidden overflow-y-auto overscroll-contain bg-[#05080f] text-claro outline-none"
    >
      {mounted ? (
        <div ref={content}>
          {/* barra fija unificada: volver al vestuario, capítulos de la landing y avance */}
          <header className="pointer-events-none sticky top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-[#05080f] via-[#05080f]/90 to-transparent px-[clamp(1.25rem,3vw,2.5rem)] pt-4 pb-8">
            <div className="flex items-center gap-3">
              <SiteMenu />
              <button
                type="button"
                onClick={() => backTo()}
                className="eyebrow pointer-events-auto flex h-9 items-center gap-2 rounded-full border border-oro/40 bg-fondo/80 px-3.5 text-oro transition-colors hover:bg-oro hover:text-fondo"
              >
                <span aria-hidden="true">↑</span> Vestuario 3D
              </button>
            </div>

            <nav aria-label="Capítulos de la página" className="pointer-events-auto hidden items-center gap-1 lg:flex">
              {chapters.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => scrollToSection(ch.id)}
                  className="eyebrow rounded-full px-3 py-1.5 text-[9px] text-claro/70 transition-colors hover:bg-white/10 hover:text-oro"
                >
                  <span className="mr-1 text-oro/70">{ch.num}</span>
                  {ch.label}
                </button>
              ))}
            </nav>

            <p className="eyebrow pointer-events-auto text-claro/70" aria-live="off">
              <span ref={counter}>01</span> / {String(TOTAL).padStart(2, '0')}
            </p>
            <span className="absolute inset-x-[clamp(1.25rem,3vw,2.5rem)] bottom-5 h-px bg-white/10">
              <span ref={bar} className="block h-full origin-left scale-x-0 bg-oro" />
            </span>
          </header>

          {/* apertura: afiche impreso (titular en oro gastado, bajada chica, escudo arriba a la derecha) */}
          <div id="sec-historia" className="paper-grunge relative -mt-16 flex min-h-dvh flex-col justify-center overflow-hidden px-[clamp(1.25rem,5vw,5rem)] pt-28 pb-24">
            <div className="absolute top-[clamp(5rem,12vh,7.5rem)] right-[clamp(1.25rem,5vw,5rem)] flex items-center gap-3">
              <span className="hidden text-right font-mono text-[9px] leading-tight tracking-[0.2em] text-oro/80 uppercase sm:block">
                Club Atlético
                <br />
                Boca Juniors
                <br />
                desde 1905
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element -- svg chico, sin optimizar */}
              <img src={site.crest.src} alt={site.crest.alt} width={842} height={1000} className="h-[clamp(2.4rem,6vh,3.6rem)] w-auto" />
            </div>

            <p className="eyebrow overflow-hidden text-oro/90">
              <span data-intro-line className="block">
                Del vestuario al archivo · 1905 — {site.season}
              </span>
            </p>
            {/* Cada línea se revela desde abajo: el recorte lleva aire arriba y abajo para no comerse acentos */}
            <h2 className="print-ink mt-4 font-display text-[clamp(3.6rem,12.5vw,13.5rem)] leading-[0.86] text-oro uppercase">
              <span className="-my-[0.08em] block overflow-hidden py-[0.08em]">
                <span data-intro-line className="block">
                  Historia en
                </span>
              </span>
              <span className="-my-[0.08em] block overflow-hidden py-[0.08em]">
                <span data-intro-line className="block">
                  la piel
                </span>
              </span>
            </h2>
            <p className="mt-6 max-w-[58ch] text-[clamp(11px,1.15vw,14px)] leading-[1.3] font-bold tracking-[0.04em] text-claro/85 uppercase">
              Hay hitos enormes, pero cada camiseta cuenta una historia cosida a mano. Desde las tiras negras de 1905 hasta la de{' '}
              {site.season}, estas son las pieles que vistió Boca, cada una con una foto real de su época.
            </p>
            <p className="eyebrow mt-12 flex items-center gap-3 text-claro/60">
              Seguí bajando <span className="animate-nudge inline-block">↓</span>
            </p>
            {/* filete al pie, como en el afiche */}
            <span aria-hidden="true" className="absolute inset-x-[clamp(1.25rem,5vw,5rem)] bottom-8 h-px bg-oro/70" />
          </div>

          {/* recorrido horizontal: un collage sobre papel, con la línea de tiempo al pie */}
          <div ref={pinWrap} className="relative">
            <div className="paper-grunge sticky top-0 h-dvh overflow-hidden">
              <div ref={track} className="relative flex h-full w-max pl-[6vw] will-change-transform">
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[7%] h-px bg-oro/55" />
                {historia.map((p, i) => (
                  <Panel key={p.id} pieza={p} index={i} total={TOTAL} />
                ))}
                <div className="relative flex h-full w-[min(44rem,92vw)] shrink-0 flex-col justify-center pr-[6vw] pl-[8vw]">
                  <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-oro/90 uppercase">Fin del recorrido</p>
                  <p data-panel-title className="print-ink mt-3 font-display text-[clamp(3rem,7vw,7rem)] leading-[0.88] text-oro uppercase">
                    La próxima
                  </p>
                  <p data-year className="font-serif text-[clamp(2.4rem,5.5vw,5.5rem)] leading-[0.9] text-claro italic">
                    la escribís vos.
                  </p>
                  <span aria-hidden="true" data-tick className="absolute bottom-[7%] left-[8vw] h-4 w-px translate-y-1/2 bg-oro" />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-[calc(7%-1.6rem)] left-[8vw] font-mono text-[9px] tracking-[0.18em] text-oro/70"
                  >
                    Vos
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Vitrina />
          <IdolosSection />
          <BomboneraSection />
          <CarnetSection />
          <TriviaSection />

          {/* atajos */}
          <div className="border-t border-white/10 py-[14vh]">
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
