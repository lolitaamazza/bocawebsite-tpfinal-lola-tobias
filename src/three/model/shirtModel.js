import * as THREE from 'three'
import { buildShirtArrays } from './shirtGeometry'

/**
 * Modelo propio: remera inflada + percha de madera + gancho de alambre, todo por
 * código. Reemplaza al GLB de referencia (que no tiene licencia) y respeta sus
 * convenciones: metros, origen donde el gancho apoya en el riel, la espalda a +Z.
 */

export function createShirtGeometry() {
  const a = buildShirtArrays()
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(a.position, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(a.uv, 2))
  g.setAttribute('color', new THREE.BufferAttribute(a.color, 3))
  g.setIndex(new THREE.BufferAttribute(a.index, 1))
  g.computeVertexNormals()
  g.computeBoundingBox()
  return g
}

/** Percha: arco de madera de hombro a hombro, un poco aplanado de frente */
export function createHangerGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.205, -0.104, 0),
    new THREE.Vector3(-0.15, -0.072, 0),
    new THREE.Vector3(-0.07, -0.035, 0),
    new THREE.Vector3(0, -0.022, 0),
    new THREE.Vector3(0.07, -0.035, 0),
    new THREE.Vector3(0.15, -0.072, 0),
    new THREE.Vector3(0.205, -0.104, 0),
  ])
  const g = new THREE.TubeGeometry(curve, 64, 0.0105, 12, false)
  g.scale(1, 1, 1.45)
  // Tapas redondeadas en las puntas
  for (const end of [curve.getPoint(0), curve.getPoint(1)]) {
    const cap = new THREE.SphereGeometry(0.0105, 12, 8)
    cap.scale(1, 1, 1.45)
    cap.translate(end.x, end.y, end.z)
    g.copy(mergeTwo(g, cap))
  }
  return g
}

/**
 * Gancho: sube desde la percha por delante del riel, lo abraza por arriba y baja
 * un poco del otro lado. Se dibuja en el plano XY; la escena lo gira 90° para
 * que la curva quede perpendicular al riel.
 */
export function createHookGeometry() {
  const r = 0.017
  const pts = [new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0.004, -0.008, 0), new THREE.Vector3(r, 0, 0)]
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0))
  }
  pts.push(new THREE.Vector3(-r * 0.92, -0.008, 0))
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0018, 8, false)
  return g
}

/** Une dos geometrías no indexadas o indexadas en una sola (sin depender de BufferGeometryUtils) */
function mergeTwo(a, b) {
  const A = a.index ? a.toNonIndexed() : a
  const B = b.index ? b.toNonIndexed() : b
  const out = new THREE.BufferGeometry()
  for (const name of ['position', 'normal', 'uv']) {
    const x = A.getAttribute(name)
    const y = B.getAttribute(name)
    if (!x || !y) continue
    const arr = new Float32Array(x.array.length + y.array.length)
    arr.set(x.array)
    arr.set(y.array, x.array.length)
    out.setAttribute(name, new THREE.BufferAttribute(arr, x.itemSize))
  }
  return out
}
