import { describe, expect, it } from 'vitest'
import { squad } from '../data'
import { customFromSearch, pathToSelection, selectionToPath } from './route'
describe('rutas', () => {
  it('ida y vuelta para cada jugador', () => {
    for (const p of squad) {
      const path = selectionToPath(p.id, squad)
      expect(path).toBe(`/dorsal/${p.dorsal}`)
      expect(pathToSelection(path, squad)).toBe(p.id)
    }
  })
  it('acepta /dorsal/5 sin barra final', () => {
    expect(pathToSelection('/dorsal/5', squad)).toBe('d5')
  })
  it('un dorsal que no existe no abre nada', () => {
    expect(pathToSelection('/dorsal/99/', squad)).toBeNull()
  })
  it('personalizador con y sin parámetros', () => {
    expect(selectionToPath('custom', squad)).toBe('/personaliza')
    const path = selectionToPath('custom', squad, { nombre: 'TOBI', dorsal: '10' })
    expect(path).toBe('/personaliza?nombre=TOBI&dorsal=10')
    expect(pathToSelection('/personaliza', squad)).toBe('custom')
    expect(customFromSearch('?nombre=TOBI&dorsal=10')).toEqual({ nombre: 'TOBI', dorsal: '10' })
  })
  it('nada seleccionado es la home', () => {
    expect(selectionToPath(null, squad)).toBe('/')
    expect(pathToSelection('/', squad)).toBeNull()
  })
})
