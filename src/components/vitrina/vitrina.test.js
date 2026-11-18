import { describe, expect, it } from 'vitest'
import { itemState, shelfFocus, togglePin } from './focus'
import { findScroller } from './scroller'

/** Árbol falso de nodos con su overflow-y (para no depender de un DOM) */
function chain(...specs) {
  let parent = null
  const nodes = []
  for (const [tagName, overflowY] of specs) {
    const node = { tagName, overflowY, parentElement: parent }
    nodes.push(node)
    parent = node
  }
  return { leaf: { tagName: 'DIV', parentElement: parent }, nodes, styleOf: (n) => ({ overflowY: n.overflowY }) }
}

describe('findScroller', () => {
  it('encuentra la capa de la Historia (overflow-y auto) aunque haya ancestros sin scroll en el medio', () => {
    const { leaf, nodes, styleOf } = chain(['HTML', 'visible'], ['BODY', 'visible'], ['SECTION', 'auto'], ['DIV', 'visible'], ['SECTION', 'visible'])
    expect(findScroller(leaf, styleOf)).toBe(nodes[2])
  })

  it('overflow hidden o clip no cuentan (no scrollean)', () => {
    const { leaf, styleOf } = chain(['HTML', 'visible'], ['BODY', 'visible'], ['DIV', 'hidden'], ['SECTION', 'clip'])
    expect(findScroller(leaf, styleOf)).toBe(null)
  })

  it('scroll y overlay también valen; el más cercano gana', () => {
    const { leaf, nodes, styleOf } = chain(['HTML', 'visible'], ['BODY', 'visible'], ['DIV', 'scroll'], ['DIV', 'overlay'])
    expect(findScroller(leaf, styleOf)).toBe(nodes[3])
  })

  it('el body y el html no cuentan: ahí scrollea la ventana (null)', () => {
    const { leaf, styleOf } = chain(['HTML', 'auto'], ['BODY', 'auto'])
    expect(findScroller(leaf, styleOf)).toBe(null)
    expect(findScroller(null, styleOf)).toBe(null)
    expect(findScroller({ tagName: 'DIV', parentElement: null }, styleOf)).toBe(null)
  })
})

describe('qué estante se enciende', () => {
  it('manda el mouse sobre el 3D, después la lista, después el fijado', () => {
    expect(shelfFocus({ hover3d: 1, hoverList: 2, pinned: 3 }).highlight).toBe(1)
    expect(shelfFocus({ hoverList: 2, pinned: 3 }).highlight).toBe(2)
    expect(shelfFocus({ pinned: 3 }).highlight).toBe(3)
    expect(shelfFocus({}).highlight).toBe(null)
    // el estante 0 es un valor válido (no se confunde con "nada")
    expect(shelfFocus({ hover3d: 0, pinned: 3 }).highlight).toBe(0)
  })

  it('la placa acompaña a la cámara solo con la lista abajo (celular)', () => {
    expect(shelfFocus({ active: 2, stacked: true }).label).toBe(2)
    expect(shelfFocus({ active: 2, stacked: false }).label).toBe(null)
    expect(shelfFocus({ active: 2, stacked: true, hover3d: 4 }).label).toBe(4)
  })

  it('tocar fija; tocar el mismo o fuera lo suelta', () => {
    expect(togglePin(null, 2)).toBe(2)
    expect(togglePin(2, 2)).toBe(null)
    expect(togglePin(2, 3)).toBe(3)
    expect(togglePin(2, null)).toBe(null)
    expect(togglePin(null, 0)).toBe(0)
    expect(togglePin(0, 0)).toBe(null)
  })

  it('la lista se apaga fuera del estante de la cámara, salvo lo encendido a mano', () => {
    expect(itemState(1, { active: 1 })).toEqual({ dim: false, lit: true, pinned: false })
    expect(itemState(2, { active: 1 })).toEqual({ dim: true, lit: false, pinned: false })
    expect(itemState(2, { active: 1, highlight: 2, pinned: 2 })).toEqual({ dim: false, lit: true, pinned: true })
    // sin recorrido (movimiento reducido) no se apaga nada
    expect(itemState(3, {})).toEqual({ dim: false, lit: false, pinned: false })
  })
})
