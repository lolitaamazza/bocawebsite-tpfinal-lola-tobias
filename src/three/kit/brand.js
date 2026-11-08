/**
 * Logos oficiales (SVG bajados de bocajuniors.com.ar) recoloreados para la remera.
 * Los de sponsors vienen en blanco: se pintan del color que lleva cada uno en la titular.
 */
/** Cambia los rellenos blancos por `color` y saca máscaras de recorte (son solo el rectángulo del logo) */
export function recolorSvg(svg, color) {
  return svg
    .replace(/<mask[\s\S]*?<\/mask>/g, '')
    .replace(/\smask="url\([^)]*\)"/g, '')
    .replace(/fill="(white|#fff|#FFF|#ffffff|#FFFFFF)"/g, `fill="${color}"`)
}
/** Medidas intrínsecas del SVG para que el canvas lo dibuje nítido a cualquier escala */
export function svgSize(svg) {
  const vb = svg.match(/viewBox="([\d.\s-]+)"/)
  if (vb) {
    const [, , w, h] = vb[1].trim().split(/\s+/).map(Number)
    return { w, h }
  }
  return { w: Number(svg.match(/width="([\d.]+)"/)?.[1] ?? 100), h: Number(svg.match(/height="([\d.]+)"/)?.[1] ?? 100) }
}
function loadSvg(svg, scale = 8) {
  // Se rasteriza grande una sola vez; el canvas de la remera la escala hacia abajo
  const { w, h } = svgSize(svg)
  const sized = svg.replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1')
  const withSize = sized.replace('<svg', `<svg width="${w * scale}" height="${h * scale}"`)
  const url = URL.createObjectURL(new Blob([withSize], { type: 'image/svg+xml' }))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar un logo de la remera'))
    img.src = url
  })
}
const text = (path) =>
  fetch(path).then((r) => {
    if (!r.ok) throw new Error(`Falta ${path}`)
    return r.text()
  })
export async function loadBrand(colors) {
  const [crest, adidas, betsson, cetrogar] = await Promise.all(
    ['/brand/escudo.svg', '/brand/adidas.svg', '/brand/betsson.svg', '/brand/cetrogar.svg'].map(text),
  )
  const [a, b, c, d] = await Promise.all([
    loadSvg(crest, 2),
    loadSvg(recolorSvg(adidas, colors.gold), 6),
    loadSvg(recolorSvg(betsson, colors.navy), 12),
    loadSvg(recolorSvg(cetrogar, colors.gold), 6),
  ])
  return { crest: a, adidas: b, betsson: c, cetrogar: d }
}
