/**
 * Silueta de la remera colgada, en px de plantilla del FRENTE (ver uvMap.js).
 * Cada tramo dice si es una costura (frente y espalda se unen) o una abertura
 * (cuello, puños, bajo: ahí la tela queda separada y se ve el forro).
 *
 * Se recorre en sentido horario empezando por la punta izquierda del cuello.
 * Los valores son propios: proporciones de una remera de fútbol talle M colgada.
 */
export const OUTLINE = [
  // hombro izquierdo y manga (costura de arriba)
  { kind: 'seam', pts: [[298, 44], [250, 70], [190, 102], [125, 138], [88, 170], [70, 215], [63, 300], [57, 420]] },
  // puño izquierdo
  { kind: 'open', pts: [[57, 420], [126, 427], [196, 433]] },
  // sisa y costado izquierdo
  { kind: 'seam', pts: [[196, 433], [204, 450], [201, 560], [194, 700], [184, 850], [174, 978]] },
  // bajo
  { kind: 'open', pts: [[174, 978], [290, 994], [400, 999], [510, 994], [630, 978]] },
  // costado derecho y sisa
  { kind: 'seam', pts: [[630, 978], [620, 850], [610, 700], [603, 560], [600, 450], [607, 442]] },
  // puño derecho
  { kind: 'open', pts: [[607, 442], [682, 434], [757, 426]] },
  // manga y hombro derecho
  { kind: 'seam', pts: [[757, 426], [746, 300], [735, 220], [716, 172], [690, 140], [622, 106], [552, 74], [492, 40]] },
  // escote del frente (abertura)
  { kind: 'open', pts: [[492, 40], [470, 68], [432, 90], [395, 98], [358, 90], [320, 68], [298, 44]] },
]

/**
 * Escote de la espalda, en px de plantilla de la ESPALDA: más alto que el del frente.
 * Reemplaza al tramo del escote cuando se arma la cara de atrás.
 */
export const BACK_NECK = [[506, 40], [455, 29], [397, 26], [340, 30], [288, 42]]
