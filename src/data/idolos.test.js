import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import fotos from './idolos-fotos.json'
import { idoloBySlug, idolos } from './idolos'

// Las mismas licencias libres que acepta scripts/fetch_idolos.py
const LICENCIA_LIBRE = /^(Public domain|CC0( 1\.0)?|CC BY(-SA)? \d\.\d( [a-z]{2})?)$/
const HOY = new Date().getFullYear()

describe('salón de ídolos', () => {
  it('entre 8 y 10 ídolos con slug único y legible en URL', () => {
    expect(idolos.length).toBeGreaterThanOrEqual(8)
    expect(idolos.length).toBeLessThanOrEqual(10)
    const slugs = idolos.map((i) => i.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/)
  })

  it('cada ídolo tiene los campos que muestra la página', () => {
    for (const i of idolos) {
      for (const k of ['nombre', 'rol', 'frase']) expect(i[k], `${i.slug}.${k}`).toMatch(/\S/)
      expect(i.apodo === null || (typeof i.apodo === 'string' && i.apodo.trim().length > 0), `${i.slug}.apodo`).toBe(true)
      expect(i.datos.length, `${i.slug}.datos`).toBeGreaterThanOrEqual(2)
      expect(i.datos.length, `${i.slug}.datos`).toBeLessThanOrEqual(3)
      for (const d of i.datos) expect(d.trim().length).toBeGreaterThan(10)
    }
  })

  it('numerados 1..n en orden', () => {
    expect(idolos.map((i) => i.numero)).toEqual(idolos.map((_, n) => n + 1))
  })

  it('cada ídolo cita al menos una fuente de Wikipedia por https', () => {
    for (const i of idolos) {
      expect(i.fuentes.length, i.slug).toBeGreaterThanOrEqual(1)
      for (const f of i.fuentes) {
        const u = new URL(f.url)
        expect(u.protocol).toBe('https:')
        expect(f.label).toMatch(/\S/)
      }
      expect(
        i.fuentes.some((f) => /(^|\.)wikipedia\.org$/.test(new URL(f.url).hostname)),
        `${i.slug} sin Wikipedia`,
      ).toBe(true)
    }
  })

  it('etapas en Boca válidas: ordenadas, sin solaparse y dentro de la historia del club', () => {
    for (const i of idolos) {
      expect(i.etapas.length, i.slug).toBeGreaterThanOrEqual(1)
      let fin = 1904
      for (const [desde, hasta] of i.etapas) {
        expect(Number.isInteger(desde) && Number.isInteger(hasta), i.slug).toBe(true)
        expect(desde, i.slug).toBeGreaterThan(fin) // Boca nace en 1905 y las etapas no se pisan
        expect(hasta, i.slug).toBeGreaterThanOrEqual(desde)
        expect(hasta, i.slug).toBeLessThanOrEqual(HOY)
        fin = hasta
      }
    }
  })

  it('el salón va en orden de llegada al club', () => {
    const llegadas = idolos.map((i) => i.etapas[0][0])
    expect([...llegadas].sort((a, b) => a - b)).toEqual(llegadas)
  })

  it('idoloBySlug', () => {
    expect(idoloBySlug('palermo')?.nombre).toBe('Martín Palermo')
    expect(idoloBySlug('no-existe')).toBeNull()
  })
})

describe('fotos de los ídolos', () => {
  it('solo hay fotos de ídolos que existen', () => {
    for (const slug of Object.keys(fotos)) expect(idoloBySlug(slug), slug).not.toBeNull()
  })

  it('cada foto tiene autor, licencia libre, ficha en Commons y archivo', () => {
    for (const [slug, f] of Object.entries(fotos)) {
      expect(f.author, slug).toMatch(/\S/)
      expect(f.license, slug).toMatch(LICENCIA_LIBRE)
      expect(f.page, slug).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
      expect(f.caption, slug).toMatch(/\S/)
      expect(f.src, slug).toBe(`/idolos/${slug}.webp`)
      expect(f.width > 0 && f.height > 0, slug).toBe(true)
      expect(existsSync(resolve(import.meta.dirname, '../../public', f.src.slice(1))), f.src).toBe(true)
    }
  })

  it('la lista blanca rechaza licencias no libres', () => {
    for (const l of ['CC BY-NC 2.0', 'CC BY-ND 4.0', 'Fair use', 'All rights reserved']) expect(l).not.toMatch(LICENCIA_LIBRE)
    for (const l of ['Public domain', 'CC BY 4.0', 'CC BY-SA 3.0 de', 'CC0']) expect(l).toMatch(LICENCIA_LIBRE)
  })
})
