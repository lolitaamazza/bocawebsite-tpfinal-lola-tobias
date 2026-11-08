/**
 * Cómo cae el mundo del modelo (metros, ejes del GLB) sobre la plantilla de textura.
 *
 * La textura es un atlas de dos mitades de TEMPLATE_W × TEMPLATE_H "px de plantilla":
 * izquierda = frente, derecha = espalda. El GLB trae UVs que son una proyección
 * plana de frente y otra de espalda; estos coeficientes salen de un ajuste por
 * mínimos cuadrados sobre sus vértices (error p95 < 1.4 % del ancho), así que
 * sirven para ubicar la franja a la misma altura real adelante y atrás.
 *
 * Si se cambia el modelo por uno propio hay que recalcularlos (ver docs/MODELO-3D.md).
 */
export const TEMPLATE_W = 800
export const TEMPLATE_H = 1035

const FRONT = { u: [-0.80594465, -0.00557228, 0.24786359], v: [0.0224259, -1.26351485, 0.03301157] }
const BACK = { u: [0.80594351, -0.00936688, 0.74807229], v: [-0.01834312, -1.23058564, 0.04232367] }

export type Side = 'front' | 'back'

/** Punto del modelo (x, y) a px de plantilla dentro de su mitad (0..800, 0..1035) */
export function worldToTemplate(side: Side, x: number, y: number) {
  const c = side === 'front' ? FRONT : BACK
  const u = c.u[0] * x + c.u[1] * y + c.u[2]
  const v = c.v[0] * x + c.v[1] * y + c.v[2]
  return { x: u * 2 * TEMPLATE_W - (side === 'back' ? TEMPLATE_W : 0), y: v * TEMPLATE_H }
}

/** Altura del modelo (y, metros) a fila de plantilla en el eje de la remera (x = 0) */
export const rowAt = (side: Side, y: number) => worldToTemplate(side, 0, y).y

/** Cuántos px de plantilla mide un metro vertical en cada cara */
export const pxPerMetre = (side: Side) => Math.abs((side === 'front' ? FRONT : BACK).v[1]) * TEMPLATE_H
