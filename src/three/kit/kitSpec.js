import { fonts } from '../../config/site'
/**
 * La titular de Boca 2026/27 (adidas), descripta como datos.
 * Colores medidos sobre las fotos de referencia; posiciones en px de plantilla
 * (ver uvMap.js) o en metros del modelo cuando tienen que coincidir adelante y atrás.
 */
export const kit = {
  colors: {
    // La foto da #273868 con luz de estudio; con la luz del vestuario se baja un punto
    navy: '#1e2b59',
    navyDeep: '#172249',
    navyLight: '#24346a',
    gold: '#f5cd45',
    goldDeep: '#e3b533',
    royal: '#2b4fc4',
    lining: '#16224a',
    print: '#f7f5ee',
  },
  /** Franja horizontal: amarillo con un filete azul rey arriba y abajo (metros del modelo) */
  band: {
    centre: -0.35,
    half: 0.063,
    royal: 0.011,
    // Silueta del torso a la altura de las sisas, en px de cada mitad del atlas.
    torso: {
      front: [[201, 365], [603, 365], [607, 431], [800, 465], [800, 650], [0, 650], [0, 465], [196, 431]],
      back: [[188, 365], [616, 365], [624, 429], [800, 463], [800, 650], [0, 650], [0, 470], [182, 449]],
    },
  },
  /** Cuello en V del frente */
  collar: {
    left: [298, 44],
    right: [492, 40],
    notch: [395, 100],
    vTip: [395, 168],
    band: 16,
    edge: 5,
    inner: 3,
  },
  /** Cuello de la espalda (borde alto de la mitad derecha) */
  backCollar: [
    [286, 40],
    [340, 28],
    [397, 24],
    [455, 27],
    [508, 38],
  ],
  /** Las tres tiras terminan en la parte alta de la manga. */
  shoulders: {
    width: 5,
    spacing: 8,
    front: [
      [[296, 52], [251, 78], [191, 110], [128, 146], [92, 180]],
      [[494, 48], [550, 82], [618, 114], [686, 148], [711, 182]],
    ],
    back: [
      [[299, 58], [242, 96], [175, 129], [110, 164], [84, 196]],
      [[499, 57], [544, 82], [606, 111], [666, 145], [704, 174]],
    ],
  },
  cuffs: {
    width: 7,
    front: [[[56, 417], [196, 429]], [[607, 438], [757, 423]]],
    back: [[[43, 433], [194, 444]], [[605, 422], [743, 405]]],
  },
  backMarks: {
    neck: { text: 'XENEIZE', x: 397, baseline: 77, size: 19 },
    directv: { x: 397, y: 642, w: 292 },
  },
  /** Logos del frente: x/y = centro, w o h en px de plantilla */
  logos: {
    adidas: { x: 300, y: 212, w: 64 },
    crest: { x: 500, y: 214, h: 96 },
    betsson: { w: 330 },
    cetrogar: [
      { x: 111, y: 365, w: 87, rot: 0.13 },
      { x: 698, y: 367, w: 87, rot: -0.13 },
    ],
  },
  /** Estampado de la espalda */
  lettering: {
    font: fonts.lettering,
    weight: fonts.letteringWeight,
    cx: 397,
    nameBaseline: 262,
    nameCap: 34,
    nameTracking: 0.1,
    nameMaxWidth: 440,
    // El dorsal ocupa el centro de la espalda y termina antes del sponsor.
    numberCentre: 430,
    numberCap: 225,
    numberGap: 10,
    /** alto de mayúscula / tamaño de fuente de Chakra Petch */
    capRatio: 0.7,
  },
}
