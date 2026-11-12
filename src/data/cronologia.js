import { piezas } from '@/app/museo/piezas'

const gold = '#efbf3a'

// Cada diseño se coteja con la foto de su ficha. Los estampados del archivo se
// trasladan al atlas UV conservando su forma, en lugar de reescribirlos.
const diseños = {
  1905: { body: '#ece9dd', accent: '#24232a', pattern: 'stripes', longSleeves: true, stripe: [54, 7], collar: 'button' },
  1908: { body: '#15354e', accent: '#e9bc39', pattern: 'diagonal', longSleeves: true, collar: 'button' },
  1916: { body: '#18517a', accent: '#e9b638', pattern: 'band', band: [18, 63], collar: 'laces' },
  1940: { body: '#142849', accent: '#e4ae31', pattern: 'band', band: [-46, 57], collar: 'button', longSleeves: true },
  1980: { body: '#174287', accent: gold, pattern: 'band', band: [1, 86], shoulders: 'full', collar: 'gold', cuff: true },
  1996: { body: '#18396e', accent: gold, pattern: 'band', band: [0, 85], edging: '#fff4dc', cuff: true, collar: 'gold' },
  2000: { body: '#121f43', accent: '#edbb2c', pattern: 'hoops', collar: 'gold' },
  2007: { body: '#eceae1', accent: '#1d2532', pattern: 'stripes', stripe: [13, 4], collar: 'dark', cuff: true, panel: true },
  2020: { body: '#152f72', accent: '#f8c62f', pattern: 'band', band: [9, 90], shoulders: 'short', cuff: true },
  2025: { body: '#141e3a', accent: '#d6aa4b', pattern: 'band', band: [22, 73], shoulders: 'short', collar: 'gold' },
}

export const camisetas = piezas.flatMap((pieza) => {
  const diseño = diseños[pieza.id]
  return diseño ? [{ ...pieza, diseño }] : []
})

export const perchasHistoricas = camisetas.map(({ id }) => ({ id, tag: id, dorsal: Number(id), pos: 'historia' }))

export function camisetaId(hash) {
  return camisetas.find(({ id }) => hash === `#camiseta-${id}`)?.id ?? null
}
