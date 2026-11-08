import { fonts } from '../../config/site'
/**
 * La titular de Boca 2025/26 (adidas), descripta como datos.
 * Colores medidos sobre las fotos de referencia; posiciones en px de plantilla
 * (ver uvMap.ts) o en metros del modelo cuando tienen que coincidir adelante y atrás.
 */
export const kit = {
  colors: {
    // La foto da #273868 con luz de estudio; con la luz del vestuario se baja un punto
    navy: '#1e2b59',
    navyDeep: '#172249',
    navyLight: '#24346a',
    gold: '#f0c057',
    goldDeep: '#d9a63c',
    royal: '#2b4fc4',
    lining: '#16224a',
    print: '#f7f5ee',
  },
  /** Franja horizontal: amarillo con un filete azul rey arriba y abajo (metros del modelo) */
  band: { centre: -0.31, half: 0.047, royal: 0.011 },
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
  /** Vivos amarillos que bajan del cuello por el hombro hasta el puño */
  piping: {
    width: 9,
    front: {
      left: [
        [298, 46],
        [250, 72],
        [190, 104],
        [125, 140],
        [88, 172],
        [70, 215],
        [63, 300],
        [57, 418],
      ],
      right: [
        [492, 42],
        [552, 74],
        [622, 106],
        [690, 140],
        [716, 172],
        [735, 220],
        [746, 300],
        [754, 420],
      ],
    },
    back: {
      left: [
        [288, 40],
        [220, 64],
        [150, 98],
        [86, 146],
        [48, 210],
        [32, 300],
        [24, 420],
      ],
      right: [
        [506, 38],
        [580, 62],
        [650, 96],
        [716, 146],
        [756, 214],
        [768, 300],
        [774, 418],
      ],
    },
  },
  /** Puños: borde de la manga */
  cuffs: {
    width: 8,
    front: [
      [
        [55, 421],
        [196, 433],
      ],
      [
        [622, 442],
        [757, 426],
      ],
    ],
    back: [
      [
        [20, 431],
        [142, 461],
      ],
      [
        [650, 441],
        [776, 421],
      ],
    ],
  },
  /** Logos del frente: x/y = centro, w o h en px de plantilla */
  logos: {
    adidas: { x: 300, y: 212, w: 64 },
    crest: { x: 500, y: 214, h: 96 },
    betsson: { w: 330 },
    cetrogar: [
      { x: 88, y: 300, w: 150, rot: -Math.PI / 2 },
      { x: 714, y: 300, w: 150, rot: Math.PI / 2 },
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
    // Como en la foto de espalda: la franja cruza el número entre el 45 % y el 80 % de su alto
    numberCentre: 412,
    numberCap: 225,
    numberGap: 10,
    /** alto de mayúscula / tamaño de fuente de Chakra Petch */
    capRatio: 0.7,
  },
}
