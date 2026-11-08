import { describe, expect, it } from 'vitest'
import { squad } from '../../data'
import { jerseyAsPlayer, parseJersey } from './jerseys'
import { FORMATIONS, FORMATION_KEYS, lineupFromForm, parseLineup } from './lineups'

describe('parseJersey', () => {
  it('acepta una remera válida y normaliza nombre y número', () => {
    const r = parseJersey({ name: 'riquelme', number: '07', size: 'M', note: '  la del 2000  ' })
    expect(r.errors).toEqual({})
    expect(r.data).toEqual({ name: 'RIQUELME', number: '7', size: 'M', note: 'la del 2000' })
  })

  it('marca cada campo inválido con su mensaje', () => {
    const r = parseJersey({ name: '###', number: '0', size: 'XXXL', note: 'x'.repeat(141) })
    expect(r.data).toBeNull()
    expect(Object.keys(r.errors).sort()).toEqual(['name', 'note', 'number', 'size'])
  })

  it('devuelve los valores para volver a pintar el formulario', () => {
    expect(parseJersey({ name: 'tobi', number: '', size: 'L' }).values).toMatchObject({ name: 'TOBI', size: 'L' })
  })

  it('una remera guardada se puede colgar en el riel', () => {
    const p = jerseyAsPlayer({ id: 'abc', name: 'TOBI', number: '10', size: 'M', note: '' }, 0)
    expect(p).toMatchObject({ id: 'abc', dorsal: 10, shirt: 'TOBI', pos: 'DEL' })
  })
})

const keeper = squad.find((p) => p.pos === 'ARQ')
const outfield = squad.filter((p) => p.pos !== 'ARQ')
const validInput = (formation = '4-3-3') => ({
  name: 'El de la final',
  formation,
  slots: [keeper.dorsal, ...outfield.slice(0, 10).map((p) => p.dorsal)],
  captain: outfield[0].dorsal,
})

describe('FORMATIONS', () => {
  it('todos los esquemas tienen 11 puestos y el primero es el arco', () => {
    for (const key of FORMATION_KEYS) {
      expect(FORMATIONS[key]).toHaveLength(11)
      expect(FORMATIONS[key][0].role).toBe('ARQ')
      expect(FORMATIONS[key].filter((s) => s.role === 'ARQ')).toHaveLength(1)
    }
  })

  it('la suma de líneas coincide con el nombre del esquema', () => {
    for (const key of FORMATION_KEYS) {
      const outfieldSlots = FORMATIONS[key].length - 1
      expect(key.split('-').reduce((a, n) => a + Number(n), 0)).toBe(outfieldSlots)
    }
  })
})

describe('parseLineup', () => {
  it('acepta un XI válido en cada esquema', () => {
    for (const key of FORMATION_KEYS) expect(parseLineup(validInput(key), squad).errors).toEqual({})
  })

  it('no deja repetir jugadores', () => {
    const input = validInput()
    input.slots[2] = input.slots[1]
    expect(parseLineup(input, squad).errors.slots[2]).toBe('Repetido.')
  })

  it('el arco es para arqueros y los arqueros van al arco', () => {
    const input = validInput()
    ;[input.slots[0], input.slots[1]] = [input.slots[1], input.slots[0]]
    const { errors } = parseLineup(input, squad)
    expect(errors.slots[0]).toBe('Al arco va un arquero.')
    expect(errors.slots[1]).toBe('Los arqueros van al arco.')
  })

  it('el capitán tiene que jugar', () => {
    const input = validInput()
    input.captain = outfield[20].dorsal
    expect(parseLineup(input, squad).errors.captain).toMatch(/tiene que estar/)
  })

  it('dorsales que no existen o faltan se marcan por puesto', () => {
    const input = validInput()
    input.slots[3] = 99
    input.slots[4] = ''
    const { errors, data } = parseLineup(input, squad)
    expect(data).toBeNull()
    expect(errors.slots[3]).toBe('No está en el plantel.')
    expect(errors.slots[4]).toBe('Falta elegir.')
  })

  it('lee el FormData del formulario', () => {
    const fd = new FormData()
    fd.set('name', 'Mi equipo')
    fd.set('formation', '4-4-2')
    fd.set('captain', '5')
    for (let i = 0; i < 11; i++) fd.set(`slot-${i}`, String(i + 1))
    expect(lineupFromForm(fd)).toMatchObject({ name: 'Mi equipo', formation: '4-4-2', captain: '5', slots: Array.from({ length: 11 }, (_, i) => String(i + 1)) })
  })
})
