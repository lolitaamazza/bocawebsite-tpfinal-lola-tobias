import { useEffect, useState } from 'react'
import { site } from '@/config/site'
import { EXPORT_SCALE } from './cardArt'
import { FONT_FACES, renderCard } from './drawCarnet'

/**
 * Lo que necesita el navegador para dibujar y sacar el carnet: tipografías, imágenes,
 * PNG, descarga y Web Share. Solo cliente.
 */

let fontsPromise = null
/** Carga las cuatro tipografías del carnet (una vez). Si falla, se dibuja con las de respaldo. */
export function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve(false)
  fontsPromise ??= Promise.all(FONT_FACES.map((face) => document.fonts.load(face, 'AÁÑ09«»“”·'))).then(
    () => true,
    () => false,
  )
  return fontsPromise
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    img.src = src
  })
}

/** Imagen cargada para `src` (o null mientras carga / si falla) y si falló */
export function useLoadedImage(src) {
  const [loaded, setLoaded] = useState({ src: null, img: null, error: false })
  useEffect(() => {
    if (!src) return
    let alive = true
    loadImage(src).then(
      (img) => alive && setLoaded({ src, img, error: false }),
      () => alive && setLoaded({ src, img: null, error: true }),
    )
    return () => {
      alive = false
    }
  }, [src])
  const current = src && loaded.src === src
  return { img: current ? loaded.img : null, error: Boolean(current && loaded.error) }
}

export function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    ensureFonts().then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])
  return ready
}

/** PNG de una cara a 1712 × 1080, dibujado en un canvas aparte (no el de la vista previa) */
export async function carnetBlob(model, { crest = null, photo = null, side = 'front' } = {}) {
  const [, crestImg] = await Promise.all([ensureFonts(), crest ?? loadImage(site.crest.src).catch(() => null)])
  const canvas = document.createElement('canvas')
  if (!renderCard(canvas, side, model, { crest: crestImg, photo }, EXPORT_SCALE)) throw new Error('Tu navegador no puede dibujar el carnet.')
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen.'))), 'image/png')
  })
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  // Safari necesita la URL viva un momento después del clic
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** ¿El navegador puede compartir archivos (hoja nativa)? */
export function canShareFiles() {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'carnet.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

/**
 * Comparte el PNG. `blocked` = el navegador pidió un clic nuevo (pasó mucho desde el
 * toque mientras se generaba la imagen); la imagen ya queda lista para el segundo.
 * @returns {Promise<'shared' | 'cancelled' | 'blocked' | 'unsupported'>}
 */
export async function shareBlob(blob, fileName, text) {
  const file = new File([blob], fileName, { type: 'image/png' })
  if (!navigator.canShare?.({ files: [file] })) return 'unsupported'
  try {
    await navigator.share({ files: [file], title: 'Mi carnet de hincha', text })
    return 'shared'
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled'
    if (e?.name === 'NotAllowedError') return 'blocked'
    throw e
  }
}
