const SCROLLS = new Set(['auto', 'scroll', 'overlay'])

/**
 * El contenedor que de verdad scrollea a `el`: el ancestro más cercano con
 * overflow-y auto/scroll (la Historia es una capa fija con scroll propio).
 * null = la ventana. `styleOf` se puede reemplazar en las pruebas.
 */
export function findScroller(el, styleOf = (node) => getComputedStyle(node)) {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    if (node.tagName === 'BODY' || node.tagName === 'HTML') return null
    if (SCROLLS.has(styleOf(node).overflowY)) return node
  }
  return null
}
