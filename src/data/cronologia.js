import { piezas } from '@/app/museo/piezas'

const azul = '#183966'
const oro = '#edbc36'

// Rasgos reconocibles del frente. Las fotos del museo son la referencia de época.
const diseños = {
  1905: { body: '#eee9de', accent: '#22242b', pattern: 'stripes', longSleeves: true, stripe: [55, 9] },
  1908: { body: azul, accent: oro, pattern: 'diagonal', longSleeves: true },
  1916: { body: azul, accent: oro, pattern: 'band', collar: 'laces' },
  1940: { body: '#183355', accent: '#e3ae36', pattern: 'band', collar: 'button', longSleeves: true },
  1980: { body: '#254783', accent: oro, pattern: 'band', shoulders: true },
  1996: { body: '#152c63', accent: oro, pattern: 'band', edging: '#fff4dc', sponsor: 'Quilmes', crest: 'shield' },
  2000: { body: '#163870', accent: '#f4be22', pattern: 'hoops', sponsor: 'Quilmes', crest: 'shield' },
  2007: { body: '#f2efe6', accent: '#1b2945', pattern: 'stripes', stripe: [25, 6], sponsor: 'Megatone', crest: 'shield' },
  2020: { body: '#172954', accent: '#f8c62f', pattern: 'band', shoulders: true, sponsor: 'QATAR AIRWAYS', crest: 'shield' },
  2025: { body: '#121d3c', accent: '#d6ad53', pattern: 'band', shoulders: true, sponsor: 'Betsson', crest: 'anniversary' },
}

export const camisetas = piezas.flatMap((pieza) => {
  const diseño = diseños[pieza.id]
  return diseño ? [{ ...pieza, diseño }] : []
})

export function camisetaIndex(hash) {
  const index = camisetas.findIndex(({ id }) => hash === `#camiseta-${id}`)
  return index < 0 ? 0 : index
}
