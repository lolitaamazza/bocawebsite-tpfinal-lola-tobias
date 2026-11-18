import { describe, expect, it } from 'vitest'
import {
  ASPECT_MAX,
  ASPECT_MIN,
  PHOTO_TILT,
  SLOTS,
  STICKER_TILT,
  clamp,
  collageLayout,
  rng,
  tornClip,
} from './collage'

const TOTAL = 17
const all = Array.from({ length: TOTAL }, (_, i) => collageLayout(i, TOTAL, 1.5))

/** "polygon(1% 2%, ...)" → [[1,2], ...] */
const points = (clip) =>
  clip
    .replace(/^polygon\(|\)$/g, '')
    .split(', ')
    .map((p) => p.split(' ').map((v) => Number(v.replace('%', ''))))

describe('rng', () => {
  it('es determinista por semilla y queda en [0, 1)', () => {
    const a = rng(5)
    const b = rng(5)
    for (let k = 0; k < 50; k++) {
      const v = a()
      expect(v).toBe(b())
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('semillas distintas dan secuencias distintas', () => {
    expect(rng(1)()).not.toBe(rng(2)())
  })
})

describe('tornClip', () => {
  it('arma un polígono de 4 × steps puntos dentro del 0–100', () => {
    const pts = points(tornClip(3, { steps: 6 }))
    expect(pts).toHaveLength(24)
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(100)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(100)
    }
  })
  it('los bordes se meten como mucho `jitter` %', () => {
    const pts = points(tornClip(9, { jitter: 2, steps: 5 }))
    const top = pts.slice(0, 5)
    const right = pts.slice(5, 10)
    top.forEach(([, y]) => expect(y).toBeLessThanOrEqual(2))
    right.forEach(([x]) => expect(x).toBeGreaterThanOrEqual(98))
  })
  it('es determinista y cambia con la semilla', () => {
    expect(tornClip(4)).toBe(tornClip(4))
    expect(tornClip(4)).not.toBe(tornClip(5))
  })
})

describe('collageLayout', () => {
  it('es determinista (mismo índice, misma disposición)', () => {
    expect(collageLayout(7, TOTAL, 1.2)).toEqual(collageLayout(7, TOTAL, 1.2))
  })

  it('zigzag: nunca dos hitos seguidos a la misma altura', () => {
    for (let i = 1; i < all.length; i++) expect(all[i].slot).not.toBe(all[i - 1].slot)
    // y el ciclo se cierra sin repetir al volver a empezar
    expect(SLOTS[0]).not.toBe(SLOTS[SLOTS.length - 1])
  })

  it('usa las tres alturas', () => {
    expect(new Set(all.map((l) => l.slot))).toEqual(new Set(['top', 'middle', 'bottom']))
  })

  it('rotaciones dentro de los límites', () => {
    for (const l of all) {
      expect(Math.abs(l.photo.rotate)).toBeLessThanOrEqual(PHOTO_TILT)
      expect(Math.abs(l.photo.rotate)).toBeGreaterThan(0)
      expect(Math.abs(l.sticker.rotate)).toBeLessThanOrEqual(STICKER_TILT)
    }
  })

  it('las fotos vecinas se inclinan para lados opuestos', () => {
    for (let i = 1; i < all.length; i++) {
      expect(Math.sign(all[i].photo.rotate)).toBe(-Math.sign(all[i - 1].photo.rotate))
    }
  })

  it('solo la última foto va en color (el clímax)', () => {
    expect(all.filter((l) => l.color)).toHaveLength(1)
    expect(all[TOTAL - 1].color).toBe(true)
  })

  it('acota la proporción de la foto', () => {
    expect(collageLayout(0, TOTAL, 0.3).photo.aspect).toBe(ASPECT_MIN)
    expect(collageLayout(0, TOTAL, 9).photo.aspect).toBe(ASPECT_MAX)
    expect(collageLayout(0, TOTAL, undefined).photo.aspect).toBe(1.4)
    expect(collageLayout(0, TOTAL, Number.NaN).photo.aspect).toBe(1.4)
  })

  it('el ancho en CSS respeta el tope en vw y sale de alto × proporción', () => {
    const l = collageLayout(2, TOTAL, 1.5)
    const dvh = Math.round(l.photo.height * l.photo.aspect * 100) / 100
    expect(l.photo.width).toBe(`min(${dvh}dvh, 80vw)`)
  })

  it('la foto entra en la pantalla y deja aire para la línea de tiempo (93 %)', () => {
    for (const l of all) {
      expect(l.photo.top).toBeGreaterThanOrEqual(9)
      expect(l.photo.top + l.photo.height).toBeLessThanOrEqual(90)
    }
  })

  it('hito arriba → foto abajo y etiqueta abajo; si no, al revés', () => {
    for (const l of all) {
      if (l.slot === 'top') {
        expect(l.text.anchor).toBe('top')
        expect(l.photo.top).toBeGreaterThan(30)
        expect(l.sticker.corner).toBe('bottom')
      } else {
        expect(l.photo.top).toBeLessThan(20)
        expect(l.sticker.corner).toBe('top')
      }
    }
  })

  it('velocidades de paralaje distintas para foto y etiqueta', () => {
    for (const l of all) {
      expect(l.photo.speed).toBeGreaterThanOrEqual(0.6)
      expect(l.photo.speed).toBeLessThanOrEqual(1.4)
      expect(l.sticker.speed).toBeGreaterThan(l.photo.speed)
    }
  })

  it('el hito pisa la foto entre el 45 y el 62 % de su ancho', () => {
    for (const l of all) {
      expect(l.text.over).toBeGreaterThanOrEqual(0.45)
      expect(l.text.over).toBeLessThanOrEqual(0.62)
    }
  })
})

describe('clamp', () => {
  it('acota', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-5, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
})
