import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { bodyProfile, handlePlacement, plinthHeight, plinthProfile, plinthTrim, sharpen } from './profiles'

const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y))

/**
 * Cuerpo dorado de un trofeo (la parte que gira): silueta torneada + asas +
 * pelota, ya apoyado sobre su base. Una sola geometría: un InstancedMesh por tipo.
 */
export function goldGeometry(trophy) {
  const parts = [new THREE.LatheGeometry(v2(sharpen(bodyProfile(trophy))), trophy.segments ?? 48)]
  if (trophy.handles) {
    const h = handlePlacement(trophy)
    const arc = new THREE.TorusGeometry(h.R, h.tube, 10, 40, h.arc)
    arc.rotateZ(h.angle - h.arc / 2)
    arc.translate(h.center[0], h.center[1], 0)
    // el toro abierto deja ver el caño hueco en las puntas: un remache en cada una
    const rivets = h.ends.map(([x, y]) => new THREE.SphereGeometry(h.rivet, 14, 10).translate(x, y, 0))
    const right = mergeGeometries([arc, ...rivets])
    for (const g of [arc, ...rivets]) g.dispose()
    // el asa de la izquierda es el espejo (media vuelta sobre el eje)
    parts.push(right, right.clone().rotateY(Math.PI))
  }
  if (trophy.finial) parts.push(new THREE.SphereGeometry(trophy.finial.r, 28, 18).translate(0, trophy.finial.y, 0))
  const gold = mergeGeometries(parts)
  for (const p of parts) p.dispose()
  gold.translate(0, plinthHeight(trophy), 0)
  return gold
}

/**
 * Base laqueada (no gira) con su filete dorado. Dos grupos para usar dos
 * materiales en el mismo InstancedMesh: 0 = laca, 1 = oro.
 * La cuadrada es un torno de 4 lados a 45° con normales planas.
 */
export function plinthGeometry(trophy) {
  const square = trophy.plinth.shape === 'square'
  const pts = plinthProfile(trophy.plinth.steps)
  let base
  if (square) {
    // el torno de 4 lados tiene las esquinas en r: las caras quedan a r/√2
    base = new THREE.LatheGeometry(v2(pts.map(([x, y]) => [x * Math.SQRT2, y])), 4, Math.PI / 4)
    const flat = base.toNonIndexed()
    base.dispose()
    flat.computeVertexNormals()
    base = flat
  } else {
    const lathe = new THREE.LatheGeometry(v2(sharpen(pts)), trophy.segments ?? 48)
    base = lathe.toNonIndexed()
    lathe.dispose()
  }
  const t = plinthTrim(trophy)
  const raw =
    t.kind === 'plaque'
      ? new THREE.BoxGeometry(t.w, t.h, 0.003).translate(0, t.y, t.z)
      : new THREE.LatheGeometry(v2([[t.r, t.y0], [t.r, t.y1]]), trophy.segments ?? 48)
  const trim = raw.toNonIndexed()
  raw.dispose()
  const merged = mergeGeometries([base, trim], true)
  base.dispose()
  trim.dispose()
  return merged
}
