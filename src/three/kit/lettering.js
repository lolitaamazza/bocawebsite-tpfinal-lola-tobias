/**
 * Ubicación del nombre y el número de la espalda. Pura: recibe anchos medidos y
 * devuelve posiciones, para poder testearla sin canvas.
 */
/**
 * Nombre en línea recta, centrado, con interletrado. Si no entra en `maxWidth`
 * se comprime en horizontal (como se estampa de verdad) en vez de achicar el alto.
 */
export function layoutName(widths, cx, tracking, maxWidth) {
  const gap = tracking
  const natural = widths.reduce((a, w) => a + w, 0) + gap * Math.max(0, widths.length - 1)
  const squeeze = natural > maxWidth ? maxWidth / natural : 1
  let x = cx - (natural * squeeze) / 2
  const glyphs = widths.map((w) => {
    const box = { x: x + (w * squeeze) / 2, width: w * squeeze }
    x += (w + gap) * squeeze
    return box
  })
  return { glyphs, squeeze, width: natural * squeeze }
}
/** Número centrado: devuelve el centro de cada cifra */
export function layoutNumber(widths, cx, gap) {
  const total = widths.reduce((a, w) => a + w, 0) + gap * Math.max(0, widths.length - 1)
  let x = cx - total / 2
  return widths.map((w) => {
    const centre = x + w / 2
    x += w + gap
    return centre
  })
}
