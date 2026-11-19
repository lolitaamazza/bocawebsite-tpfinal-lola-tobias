import { describe, expect, it } from 'vitest'
import { apellido, formatEtapas, iniciales, numero, temporadas, vecinos } from './idolos'

describe('formatEtapas', () => {
  it('una etapa', () => expect(formatEtapas([[1956, 1970]])).toBe('1956–1970'))
  it('varias etapas separadas por punto medio', () =>
    expect(
      formatEtapas([
        [2001, 2004],
        [2015, 2016],
        [2018, 2021],
      ]),
    ).toBe('2001–2004 · 2015–2016 · 2018–2021'))
  it('un solo año no se repite', () => expect(formatEtapas([[2007, 2007]])).toBe('2007'))
})

describe('temporadas', () => {
  it('cuenta ambos extremos', () => expect(temporadas([[1956, 1970]])).toBe(15))
  it('suma etapas', () =>
    expect(
      temporadas([
        [1997, 2000],
        [2004, 2011],
      ]),
    ).toBe(12))
})

describe('iniciales y apellido', () => {
  it('dos letras, con tilde', () => {
    expect(iniciales('Juan Román Riquelme')).toBe('JR')
    expect(iniciales('Ángel Clemente Rojas')).toBe('ÁC')
    expect(iniciales('  hugo   gatti ')).toBe('HG')
  })
  it('apellido = última palabra', () => {
    expect(apellido('Diego Armando Maradona')).toBe('Maradona')
    expect(apellido('Gatti')).toBe('Gatti')
  })
})

describe('vecinos', () => {
  const l = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }]
  it('en el medio', () => expect(vecinos(l, 'b')).toEqual({ prev: l[0], next: l[2] }))
  it('en los extremos no da la vuelta', () => {
    expect(vecinos(l, 'a').prev).toBeNull()
    expect(vecinos(l, 'c').next).toBeNull()
  })
  it('slug desconocido', () => expect(vecinos(l, 'z')).toEqual({ prev: null, next: null }))
})

it('numero con dos cifras', () => {
  expect(numero(3)).toBe('03')
  expect(numero(10)).toBe('10')
})
