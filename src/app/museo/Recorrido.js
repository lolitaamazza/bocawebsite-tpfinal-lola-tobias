'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { SiteMenu } from '@/components/layout/SiteMenu'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { capitulos, piezas } from './piezas'
import styles from './museo.module.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const archive = new Map(piezas.map((piece) => [piece.id, piece]))
// Medidas en anchos de pantalla, compartidas con las columnas de la banda.
const openingWidth = 0.67
const chapterWidth = 0.89
const exit = 0.65
const travel = openingWidth + (capitulos.length - 1) * chapterWidth - 0.07
const duration = travel + exit
const photoOffsets = [[3, 12, -12], [-4, -14, 14], [7, 18, -18]]

function Photograph({ piece, index, chapter }) {
  const [open, setOpen] = useState(false)
  const captionId = `ficha-${piece.id}`

  return (
    <figure className={styles.photo} data-photo={index}>
      <div className={styles.print}>
        <div className={styles.mask} data-mask>
          <Image
            src={piece.image}
            alt={piece.id === '1965' ? 'Plantel de Boca con la camiseta azul y oro en 1965' : `Camiseta de Boca Juniors, ${piece.year}`}
            fill
            unoptimized
            loading={chapter === 0 ? 'eager' : 'lazy'}
          />
        </div>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={captionId}
          aria-label={`Ver ficha: ${piece.year}, ${piece.title}`}
          onClick={() => setOpen((current) => !current)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
        >
          <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        <div id={captionId} className={styles.caption} data-open={open}>
          <p className={styles.label}>{piece.year} / {piece.season}</p>
          <p className={styles.captionTitle}>{piece.title}</p>
          <p>{piece.description}</p>
        </div>
      </div>
      <span className={styles.photoYear} aria-hidden="true">{piece.year}</span>
    </figure>
  )
}

function TitleLines({ lines }) {
  return lines.map((line) => (
    <span key={line} className={styles.line}><span data-line>{line}</span></span>
  ))
}

export function Recorrido() {
  const root = useRef(null)
  const stage = useRef(null)
  const track = useRef(null)
  const timeline = useRef(null)

  useGSAP(() => {
    const media = gsap.matchMedia()

    media.add('(min-width: 821px) and (min-height: 540px) and (prefers-reduced-motion: no-preference)', () => {
      const container = root.current
      const strip = track.current
      container.dataset.cinema = 'true'
      const sequence = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: container, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
      })
      timeline.current = sequence
      sequence.to(strip, { x: () => stage.current.clientWidth * -travel, duration: travel }, 0)
      sequence.to('[data-progress]', { scaleX: 1, duration }, 0)
      sequence.to(strip, { yPercent: -12, opacity: 0, duration: exit }, travel)
      sequence.to('[data-scroll-cue]', { opacity: 0, duration: exit }, travel)

      const titleLines = strip.querySelectorAll('[data-opening] [data-line]')
      sequence.fromTo(titleLines, { yPercent: 11 }, {
        yPercent: 0, duration: 0.24, stagger: 0.05, ease: 'power2.out',
      }, 0)
      sequence.to(titleLines, { yPercent: -36, duration: 0.5, stagger: 0.04 }, 0.3)

      strip.querySelectorAll('[data-scene]').forEach((scene, index) => {
        const left = openingWidth + index * chapterWidth
        const start = Math.max(0, left - 0.84)
        const centre = Math.min(travel, left - 0.11)
        const lines = scene.querySelectorAll('[data-line]')

        sequence.fromTo(lines, { yPercent: 95 }, {
          yPercent: 0, duration: 0.42, stagger: 0.05, ease: 'power2.out', immediateRender: true,
        }, Math.max(0, left - 0.52))

        scene.querySelectorAll('[data-photo]').forEach((photo, slot) => {
          const mask = photo.querySelector('[data-mask]')
          const [opening, incoming, outgoing] = photoOffsets[slot]
          const slotStart = start + slot * 0.21
          const clip = slot % 2 === 0 ? 'inset(0 0 100% 0)' : 'inset(100% 0 0 0)'

          sequence.fromTo(mask, { clipPath: index === 0 && slot === 0 ? 'inset(6% 0 9% 0)' : clip }, {
            clipPath: 'inset(0% 0 0% 0)', duration: 0.45, ease: 'power2.out', immediateRender: true,
          }, slotStart)
          sequence.fromTo(photo, { yPercent: index === 0 ? opening : incoming }, {
            yPercent: 0, duration: 0.48, immediateRender: true,
          }, slotStart)
          sequence.to(photo, { yPercent: outgoing, duration: 0.62 }, Math.max(centre, slotStart + 0.48))
        })
      })

      return () => {
        delete container.dataset.cinema
        timeline.current = null
      }
    })

    media.add('(max-width: 820px) and (prefers-reduced-motion: no-preference), (max-height: 539px) and (prefers-reduced-motion: no-preference)', () => {
      track.current.querySelectorAll('[data-photo]').forEach((photo) => {
        const slot = Number(photo.dataset.photo)
        const sequence = gsap.timeline({
          scrollTrigger: { trigger: photo, start: 'top 98%', end: 'top 63%', scrub: true },
        })
        sequence.from(photo, { y: 12 + 10 * slot, ease: 'none' }, 0)
        sequence.from(photo.querySelector('[data-mask]'), { clipPath: 'inset(0 0 24% 0)', ease: 'none' }, 0)
      })
    })

    return () => media.revert()
  }, { scope: root })

  function revealFocusedScene(event) {
    const sequence = timeline.current
    if (!sequence || !event.target.matches(':focus-visible')) return
    const scene = event.target.closest('[data-scene]')
    const bounds = event.target.getBoundingClientRect()
    if (!scene || (bounds.left >= 0 && bounds.right <= stage.current.clientWidth)) return

    const { start, end } = sequence.scrollTrigger
    const time = Math.min(travel, openingWidth + Number(scene.dataset.scene) * chapterWidth - 0.07)
    window.scrollTo({ top: start + (end - start) * time / duration, behavior: 'instant' })
  }

  return (
    <section ref={root} className={styles.recorrido} style={{ '--duration': duration }} aria-label="Editorial de camisetas">
      <div ref={stage} className={styles.stage}>
        <header className={styles.masthead}>
          <SiteMenu />
          <span>Archivo de indumentaria / CABJ</span>
          <a href="#creditos" className={styles.creditLink}>Créditos ↘</a>
        </header>

        <div ref={track} className={styles.track} onFocusCapture={revealFocusedScene}>
          <header className={styles.opening} data-opening>
            <div className={styles.copy}>
              <p className={styles.label}>Club Atlético Boca Juniors</p>
              <h1 lang="en" aria-label="A History in Blue & Gold">
                <TitleLines lines={['A HISTORY', 'IN BLUE & GOLD']} />
              </h1>
              <p className={styles.date} lang="en">1905 — Present</p>
              <p className={styles.text} lang="en">More than a jersey. A century of identity, passion and glory.</p>
            </div>
          </header>
          {capitulos.map((chapter, index) => {
            const [lead, ...small] = chapter.photos.map((id) => archive.get(id))
            const pending = archive.get(chapter.pending)
            return (
              <section
                key={chapter.label}
                data-scene={index}
                className={styles.scene}
                aria-labelledby={`editorial-${index}`}
              >
                <Photograph piece={lead} index={0} chapter={index} />
                <div className={styles.copy}>
                  <p className={styles.label} lang="en">{chapter.label}</p>
                  <h2 id={`editorial-${index}`} aria-label={chapter.title.replace('\n', ' ')}>
                    <TitleLines lines={chapter.title.split('\n')} />
                  </h2>
                  <p className={styles.date}>{chapter.range}</p>
                  <p className={styles.text}>{chapter.text}</p>
                  <a className={styles.source} href={lead.imageSource}>Ver en el archivo ↗</a>
                  {pending && (
                    <p className={styles.pending}><span>{pending.year} / {pending.title}</span> Fotografía de la camiseta pendiente de verificación.</p>
                  )}
                </div>
                <div className={styles.stack}>
                  {small.map((piece, slot) => <Photograph key={piece.id} piece={piece} index={slot + 1} chapter={index} />)}
                </div>
              </section>
            )
          })}
        </div>

        <div className={styles.scrollCue} data-scroll-cue aria-hidden="true">
          <span>Deslizá para recorrer</span>
          <span className={styles.progress}><i data-progress /></span>
          <span>↓</span>
        </div>
      </div>
    </section>
  )
}
