import type { PosKey } from '../types'

/**
 * Todo lo que es "de Boca" vive acá: textos, colores del vestuario y de la remera,
 * tienda. Cambiar de club = cambiar este archivo + los assets de /public.
 */
export const site = {
  id: 'boca',
  name: 'Boca Juniors',
  of: 'de Boca',
  season: '2026',
  siteName: 'El vestuario de Boca en 3D',
  competition: 'Liga Profesional',
  stadium: 'La Bombonera',
  crest: { src: '/brand/escudo.svg', alt: 'Escudo de Boca Juniors' },
  ticker: [
    'Tributo no oficial',
    'No afiliado a Boca Juniors ni a la AFA',
    'Dale Bo',
    'Plantel {season}',
    'La Bombonera · La Boca',
    'Hecho con aguante xeneize',
  ],
  credits: {
    label: 'Idea y diseño original',
    name: 'Bellostas Studio',
    href: 'https://bellostas.studio',
  },
  store: {
    label: 'BocaShop, la tienda oficial',
    domain: 'bocashop.com.ar',
    // BocaShop es VTEX y no expone un carrito con estampado por URL: se busca la titular.
    product: 'https://www.bocashop.com.ar/camiseta%20titular?_q=camiseta%20titular&map=ft',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    defaultSize: 'M',
  },
} as const

export const positions: { key: PosKey; label: string; short: string }[] = [
  { key: 'ARQ', label: 'Arqueros', short: 'ARQ' },
  { key: 'DEF', label: 'Defensores', short: 'DEF' },
  { key: 'MED', label: 'Mediocampistas', short: 'MED' },
  { key: 'DEL', label: 'Delanteros', short: 'DEL' },
]

export const positionLabel = (key: PosKey) => positions.find((p) => p.key === key)!.label

/** Vestuario: madera azul noche, luz cálida dorada, asientos azul Boca. */
export const room = {
  background: '#03060e',
  slats: {
    dark: [14, 22, 44] as const,
    mid: [24, 38, 74] as const,
    grain: ['4,8,20', '70,96,150'] as const,
    groove: '#02040a',
    tint: '#7d8bab',
  },
  glow: [
    [255, 206, 120],
    [255, 186, 90],
    [255, 160, 60],
  ] as const,
  led: [1.6, 1.15, 0.45] as const,
  trim: '#070d1e',
  bench: '#0b1530',
  seat: '#15306f',
  metal: '#d6a84e',
  floor: '#05080f',
  hemisphere: ['#fff1d6', '#08101f'] as const,
  key: '#fff4e2',
  fill: '#b9ccff',
  warm: '#ffbe62',
  dim: '#02040a',
  rail: '#d9d3c7',
  hanger: '#8f6436',
  towels: ['#ece7dc', '#f0c057', '#1d3c8f'] as const,
  tag: {
    face: ['#f3d27a', '#9a7027'] as const,
    ink: '#1a1405',
    edge: '#c0913f',
    captain: ['#ffe372', '#d9a514'] as const,
    captainInk: '#0d1c47',
  },
}

export const fonts = {
  /** Tipografía de nombre y número en la remera. Provisoria, a pedido de Tobias. */
  lettering: 'Chakra Petch',
  letteringWeight: 700,
  tag: 'Anton',
}
