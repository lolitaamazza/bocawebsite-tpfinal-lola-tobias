// Recortes en píxeles de public/museo. Se conservan los contornos de los
// estampados con una máscara de color para quitar la tela de la foto.
export const archiveMarks = {
  1980: [
    { crop: [68, 91, 41, 37], target: [271, 334, 72, 65], ink: 'gold' },
  ],
  1996: [
    { crop: [85, 99, 36, 19], target: [266, 314, 67, 35], ink: 'light' },
    { crop: [197, 79, 39, 46], target: [478, 263, 73, 87], ink: 'crest' },
    { crop: [93, 137, 124, 58], target: [257, 431, 286, 134], ink: 'dark' },
  ],
  2000: [
    { crop: [84, 100, 36, 23], target: [266, 314, 67, 43], ink: 'light' },
    { crop: [194, 89, 38, 37], target: [479, 268, 72, 70], ink: 'crest' },
    { crop: [96, 137, 126, 55], target: [257, 423, 286, 125], ink: 'gold', clip: [[0, 0], [126, 0], [126, 31], [101, 32], [77, 38], [62, 42], [31, 46], [25, 55], [0, 55]] },
  ],
  2007: [
    { crop: [136, 57, 38, 37], target: [363, 213, 74, 72], ink: 'crest' },
    { crop: [83, 133, 144, 39], target: [261, 448, 278, 78], ink: 'dark' },
  ],
  2020: [
    { crop: [34, 91, 24, 34], target: [269, 279, 55, 78], ink: 'gold' },
    { crop: [104, 76, 49, 58], target: [472, 237, 82, 97], ink: 'crest' },
    { crop: [46, 148, 87, 58], target: [284, 430, 232, 154], ink: 'dark' },
  ],
}

const clampAlpha = (alpha) => Math.round(Math.max(0, Math.min(1, alpha)) * 255)

export function inkAlpha(ink, r, g, b) {
  if (ink === 'gold') return clampAlpha((r - b - 21) / 42)
  if (ink === 'light') return clampAlpha((Math.min(r, g, b) - 75) / 100)
  if (ink === 'dark') return clampAlpha((124 - r) / 70)
  return 255
}

export function extractMark(image, { crop, ink, clip }) {
  const [x, y, w, h] = crop
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, x, y, w, h, 0, 0, w, h)
  if (ink === 'crest') {
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    // Escudos del archivo: borde superior curvo y lados que bajan a punta.
    ctx.moveTo(w * 0.08, h * 0.13)
    ctx.quadraticCurveTo(w * 0.5, -h * 0.1, w * 0.92, h * 0.13)
    ctx.quadraticCurveTo(w * 0.86, h * 0.75, w * 0.5, h * 0.93)
    ctx.quadraticCurveTo(w * 0.14, h * 0.75, w * 0.08, h * 0.13)
    ctx.fill()
  } else {
    const pixels = ctx.getImageData(0, 0, w, h)
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i + 3] = inkAlpha(ink, ...pixels.data.subarray(i, i + 3))
      pixels.data[i] = ink === 'dark' ? 18 : 247
      pixels.data[i + 1] = ink === 'dark' ? 21 : 220
      pixels.data[i + 2] = ink === 'gold' ? 139 : ink === 'dark' ? 33 : 233
    }
    ctx.putImageData(pixels, 0, 0)
  }
  if (clip) {
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    clip.forEach(([cx, cy], i) => i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy))
    ctx.fill()
  }
  return canvas
}
