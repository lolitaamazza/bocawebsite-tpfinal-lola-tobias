'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { SiteMenu } from '@/components/layout/SiteMenu'
import { site } from '@/config/site'
import { idolos } from '@/data/idolos'
import { apellido, formatEtapas, iniciales, numero, temporadas } from '@/engine/idolos'
import { Credito } from './Retrato'
import styles from './salon.module.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const total = numero(idolos.length)
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oro'

/** El scroll nativo controla la pausa, los detalles y el paso horizontal de cada retrato. */
export function Salon() {
  const root = useRef(null)
  const stage = useRef(null)
  const track = useRef(null)
  const chapters = useRef([])
  const chips = useRef(null)
  const progress = useRef(null)
  const journey = useRef(null)
  const current = useRef(-1)
  const [active, setActive] = useState(0)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const scene = stage.current
      scene.dataset.horizontal = ''
      const timeline = gsap.timeline({ defaults: { ease: 'none' } })
      const stops = []

      chapters.current.forEach((chapter, i) => {
        const label = idolos[i].slug
        timeline.addLabel(label)
        stops.push({ time: timeline.duration(), index: i })
        timeline.to({}, { duration: 0.4 })
        timeline.fromTo(chapter.querySelector('[data-details]'),
          { autoAlpha: 0, x: 36 }, { autoAlpha: 1, x: 0, duration: 0.45 })
        timeline.to(chapter.querySelector('[data-identity]'), { autoAlpha: 0, duration: 0.3 }, '<')
        timeline.fromTo(chapter.querySelectorAll('[data-fact]'),
          { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.13 }, '<0.1')
        timeline.to({}, { duration: 0.65 })
        if (i < idolos.length - 1) {
          timeline.to(track.current, { x: () => -(i + 1) * scene.clientWidth, duration: 0.65 })
        }
      })

      const update = () => {
        const time = timeline.time()
        let index = 0
        for (const stop of stops) {
          if (time >= stop.time - 0.25) index = stop.index
        }
        if (progress.current) progress.current.style.transform = `scaleX(${timeline.progress()})`
        if (index === current.current) return
        current.current = index
        chapters.current.forEach((el, i) => { el.inert = i !== index })
        setActive(index)
      }
      timeline.eventCallback('onUpdate', update)
      const trigger = ScrollTrigger.create({
        trigger: scene,
        animation: timeline,
        start: 'top top',
        end: () => `+=${Math.max(680, window.innerHeight) * idolos.length * 2.2}`,
        pin: true,
        scrub: 0.45,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      })
      journey.current = { timeline, trigger }
      update()

      // Los enlaces de las fichas individuales vuelven al lugar del recorrido.
      const syncHash = () => {
        const index = idolos.findIndex((idolo) => `#${idolo.slug}` === location.hash)
        if (index < 0) return
        const at = timeline.labels[idolos[index].slug]
        window.scrollTo({ top: trigger.start + (at / timeline.duration()) * (trigger.end - trigger.start), behavior: 'instant' })
        trigger.update()
        trigger.getTween()?.progress(1)
      }
      const refresh = () => { ScrollTrigger.refresh(); syncHash() }
      const frame = requestAnimationFrame(refresh)
      let alive = true
      document.fonts.ready.then(() => { if (alive) refresh() })
      window.addEventListener('hashchange', syncHash)
      return () => {
        alive = false
        cancelAnimationFrame(frame)
        window.removeEventListener('hashchange', syncHash)
        journey.current = null
        current.current = -1
        delete scene.dataset.horizontal
        chapters.current.forEach((el) => { el.inert = false })
        if (progress.current) progress.current.style.transform = 'scaleX(0)'
      }
    })
    return () => mm.revert()
  }, { scope: root })

  useEffect(() => {
    const strip = chips.current
    const chip = strip?.children[active]
    if (!chip) return
    strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2, behavior: 'instant' })
  }, [active])

  const goTo = (event, index, details = false) => {
    const route = journey.current
    if (!route) return // Sin animación, los enlaces de ancla siguen funcionando.
    event.preventDefault()
    const at = route.timeline.labels[idolos[index].slug] + (details ? 1 : 0)
    const top = route.trigger.start + (at / route.timeline.duration()) * (route.trigger.end - route.trigger.start)
    history.replaceState(null, '', `#${idolos[index].slug}`)
    window.scrollTo({ top, behavior: details ? 'smooth' : 'instant' })
    if (!details) {
      route.trigger.update()
      route.trigger.getTween()?.progress(1)
    }
  }

  const keyboard = (event) => {
    if (!journey.current || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.target.closest('a, button, input, select, textarea')) return
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (direction) goTo(event, Math.max(0, Math.min(active + direction, idolos.length - 1)))
  }

  return (
    <main ref={root} className={`${styles.salon} paper-grunge text-claro`}>
      <h1 className="sr-only">Salón de ídolos de Boca Juniors</h1>
      <header className={styles.header}>
        <SiteMenu />
        <Link href="/" aria-label="Volver al vestuario" className={focus}>
          <Image unoptimized src={site.crest.src} alt="" width={842} height={1000} className="h-8 w-auto" />
        </Link>
        <span className="font-display text-lg uppercase">Salón de <span className="text-oro">ídolos</span></span>
        <Link href="/journey" className={`${focus} ml-auto hidden font-mono text-[10px] uppercase sm:block`}>Journey ↗</Link>
      </header>

      <div ref={stage} className={styles.stage} onKeyDown={keyboard} tabIndex={0} aria-label="Recorrido de ídolos. Bajá para descubrir su historia y avanzar hacia la derecha.">
        <div ref={track} className={styles.track}>
          {idolos.map((idolo, i) => (
            <section key={idolo.slug} id={idolo.slug} ref={(el) => { chapters.current[i] = el }} aria-labelledby={`${idolo.slug}-nombre`} className={styles.chapter}>
              <div className={styles.identity}>
                <span aria-hidden="true" className={styles.bigNumber}>{numero(idolo.numero)}</span>
                <figure className={styles.portrait}>
                  {idolo.foto ? (
                    <>
                      <div className={styles.photo}>
                        <Image src={idolo.foto.src} alt={idolo.foto.caption} fill priority={i === 0} sizes="(min-width: 900px) 48vw, 95vw" className="object-contain object-center" />
                      </div>
                      <Credito foto={idolo.foto} className={styles.credit} />
                    </>
                  ) : <div role="img" aria-label={`${idolo.nombre}: sin foto libre`} className={styles.initials}>{iniciales(idolo.nombre)}</div>}
                </figure>
                <div data-identity className={styles.name}>
                  <p className="eyebrow text-oro">Leyenda {numero(idolo.numero)} / {total} · {idolo.rol}</p>
                  <h2 id={`${idolo.slug}-nombre`} className={styles.title}>{idolo.nombre}</h2>
                  {idolo.apodo && <p className={styles.nickname}>«{idolo.apodo}»</p>}
                  <p className={styles.quote}>{idolo.frase}</p>
                  <a href={`#${idolo.slug}-historia`} onClick={(e) => goTo(e, i, true)} className={`${focus} ${styles.discover}`}>Descubrí su historia <span aria-hidden="true">↓</span></a>
                </div>
              </div>

              <div data-details id={`${idolo.slug}-historia`} className={styles.details}>
                <div className={styles.detailsInner}>
                  <p className="eyebrow text-oro">{numero(idolo.numero)} / {total} · Su huella en Boca</p>
                  <h3 className={styles.detailTitle}>{idolo.nombre}</h3>
                  <p className={styles.years}>{formatEtapas(idolo.etapas)} <span> / {temporadas(idolo.etapas)} temporadas</span></p>
                  <ol className={styles.facts}>
                    {idolo.datos.map((dato, d) => (
                      <li data-fact key={dato}><span aria-hidden="true">{numero(d + 1)}</span><p>{dato}</p></li>
                    ))}
                  </ol>
                  <div className={styles.links}>
                    <Link href={`/idolos/${idolo.slug}`} className={`${focus} ${styles.fullProfile}`}>Ficha completa ↗</Link>
                    {idolo.fuentes.map((fuente) => <a key={fuente.url} href={fuente.url} target="_blank" rel="noopener" className={`${focus} ${styles.source}`}>Fuente: {fuente.label} ↗</a>)}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <footer className={styles.navigation}>
          <div className={styles.guide}>
            <span className="eyebrow">{numero(active + 1)} / {total} <span className="text-claro/50">· {apellido(idolos[active].nombre)}</span></span>
            <p className="font-mono text-[9px] tracking-wider text-claro/65">Bajá para descubrir <span aria-hidden="true">↓</span> <span className="text-oro">El recorrido sigue →</span></p>
          </div>
          <div className={styles.progress} aria-hidden="true"><span ref={progress} /></div>
          <nav aria-label="Ídolos">
            <ol ref={chips}>
              {idolos.map((idolo, i) => (
                <li key={idolo.slug}><a href={`#${idolo.slug}`} onClick={(e) => goTo(e, i)} aria-current={i === active ? 'true' : undefined} className={focus}><span>{numero(idolo.numero)}</span> {apellido(idolo.nombre)}</a></li>
              ))}
            </ol>
          </nav>
        </footer>
      </div>

      <section className={styles.ending}>
        <p className="eyebrow text-oro">El salón sigue abierto</p>
        <p className="max-w-[28ch] font-serif text-4xl italic md:text-6xl">El próximo nombre lo escribe el plantel que cuelga en el vestuario.</p>
        <div className="flex flex-wrap justify-center gap-6 font-mono text-xs text-oro uppercase">
          <Link href="/" className={focus}>Volver al vestuario ↗</Link>
          <Link href="/journey" className={focus}>Journey 2000–2026 ↗</Link>
        </div>
      </section>
    </main>
  )
}
