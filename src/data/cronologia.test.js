import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { camisetaId, camisetas, perchasHistoricas } from './cronologia'
import { archiveMarks, inkAlpha } from '@/components/cronologia/archiveMarks'

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

  it('mantiene el orden en el riel y conserva la entrada libre sin un año en la URL', () => {
    expect(perchasHistoricas.map(({ id }) => id)).toEqual(camisetas.map(({ id }) => id))
    for (const item of camisetas) {
      expect(camisetaId(`#camiseta-${item.id}`)).toBe(item.id)
    }
    expect(camisetaId('')).toBeNull()
    expect(camisetaId('#camiseta-2002')).toBeNull()
  })

  it('separa la tinta de archivo de la tela azul, oro o blanca que la rodea', () => {
    expect(inkAlpha('gold', 226, 171, 38)).toBe(255)
    expect(inkAlpha('gold', 20, 45, 95)).toBe(0)
    expect(inkAlpha('light', 235, 229, 220)).toBe(255)
    expect(inkAlpha('light', 20, 45, 95)).toBe(0)
    expect(inkAlpha('dark', 25, 27, 35)).toBe(255)
    expect(inkAlpha('dark', 219, 168, 34)).toBe(0)
    expect(Object.keys(archiveMarks)).toEqual(['1980', '1996', '2000', '2007', '2020'])
  })
})
