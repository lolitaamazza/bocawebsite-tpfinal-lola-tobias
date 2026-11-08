import { describe, expect, it } from 'vitest'
import { squad } from '../data'
import { MAX_NAME, cleanName, cleanNumber, fold, searchPlayers } from './text'

describe('cleanName', () => {
  it('pasa a mayúsculas, deja tildes y Ñ, corta en el máximo', () => {
    expect(cleanName('palermo')).toBe('PALERMO')
    expect(cleanName('Muñoz')).toBe('MUÑOZ')
    expect(cleanName('Martín')).toBe('MARTÍN')
    expect(cleanName('abcdefghijklmnop')).toHaveLength(MAX_NAME)
  })

  it('saca lo que la remera no puede estampar', () => {
    expect(cleanName('<script>😀#')).toBe('SCRIPT')
    expect(cleanName("d'onofrio-j.")).toBe("D'ONOFRIO-")
  })
})

describe('cleanNumber', () => {
  it('solo cifras, hasta dos (regresión: "1x0" debe dar "10")', () => {
    expect(cleanNumber('1x0')).toBe('10')
    expect(cleanNumber('123')).toBe('12')
    expect(cleanNumber('ab')).toBe('')
  })
})

describe('searchPlayers', () => {
  it('por dorsal busca por prefijo', () => {
    const r = searchPlayers(squad, '1')
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((p) => String(p.dorsal).startsWith('1'))).toBe(true)
  })

  it('por nombre ignora tildes y mayúsculas', () => {
    expect(searchPlayers(squad, 'ascacibar').map((p) => p.dorsal)).toEqual([25])
    expect(searchPlayers(squad, 'GIMÉNEZ').map((p) => p.dorsal)).toEqual([9])
  })

  it('vacío devuelve todo el plantel', () => {
    expect(searchPlayers(squad, '  ')).toHaveLength(squad.length)
  })

  it('fold saca diacríticos', () => {
    expect(fold('Alarcón Ñandú')).toBe('alarcon nandu')
  })
})
