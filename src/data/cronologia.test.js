import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { camisetaIndex, camisetas } from './cronologia'

describe('Cronología de camisetas', () => {
  it('selecciona diez piezas del archivo, ordenadas y con foto de respaldo', () => {
    const years = camisetas.map(({ id }) => Number(id))
    expect(years).toHaveLength(10)
    expect(years[0]).toBe(1905)
    expect(years.at(-1)).toBe(2025)
    expect(years.every((year, i) => i === 0 || year > years[i - 1])).toBe(true)
    for (const item of camisetas) {
      expect(item.verified).toBe(true)
      expect(new URL(item.imageSource).hostname).toBe('www.bocajuniors.com.ar')
      expect(existsSync(new URL(`../../public${item.image}`, import.meta.url))).toBe(true)
      expect(item.diseño.body).not.toBe(item.diseño.accent)
    }
  })

  it('abre cada enlace directo y vuelve al comienzo con un fragmento desconocido', () => {
    for (const [index, item] of camisetas.entries()) {
      expect(camisetaIndex(`#camiseta-${item.id}`)).toBe(index)
    }
    expect(camisetaIndex('')).toBe(0)
    expect(camisetaIndex('#camiseta-2002')).toBe(0)
  })
})
