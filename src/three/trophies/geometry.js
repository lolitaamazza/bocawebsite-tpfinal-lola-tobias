import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { bodyProfile, handlePlacement, plinthHeight, plinthProfile, plinthTrim, sharpen } from './profiles'

const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y))

/**
 * Escultura del futbolista pateando sobre el globo superior de la Copa Libertadores.
 * Todo queda contenido dentro de la esfera de radio `finial.r` centrada en `finial.y`.
 */
function buildLibertadoresFigurine(finial) {
  const { y: cy, r } = finial
  const base = cy - r
  const parts = [
    // Mundo / esfera chica sobre la tapa
    new THREE.SphereGeometry(r * 0.42, 18, 12).translate(0, base + r * 0.42, 0),
    // Pierna de apoyo y pierna que patea
    new THREE.CylinderGeometry(r * 0.07, r * 0.055, r * 0.48, 8)
      .rotateZ(0.14)
      .translate(-r * 0.06, base + r * 0.96, 0),
    new THREE.CylinderGeometry(r * 0.065, r * 0.05, r * 0.44, 8)
      .rotateZ(-0.62)
      .translate(r * 0.14, base + r * 1.05, r * 0.04),
    // Torso inclinado y brazos en equilibrio
    new THREE.CylinderGeometry(r * 0.12, r * 0.09, r * 0.46, 10)
      .rotateZ(0.18)
      .translate(-r * 0.05, base + r * 1.38, 0),
    new THREE.CylinderGeometry(r * 0.048, r * 0.04, r * 0.42, 8)
      .rotateZ(0.85)
      .translate(-r * 0.24, base + r * 1.46, 0),
    new THREE.CylinderGeometry(r * 0.048, r * 0.04, r * 0.4, 8)
      .rotateZ(-0.75)
      .translate(r * 0.16, base + r * 1.48, 0),
    // Cabeza
    new THREE.SphereGeometry(r * 0.13, 12, 10).translate(-r * 0.08, base + r * 1.76, 0),
  ]
  const fig = mergeGeometries(parts)
  for (const p of parts) p.dispose()
  return fig
}

/**
 * Cuerpo metálico de un trofeo (la parte que gira): silueta torneada + asas +
 * detalles icónicos de cada copa real (futbolista de la Libertadores, pelota y
 * nervaduras de la Intercontinental, anillo inclinado de la Sudamericana,
 * aletas y pelota de la Copa Argentina, asas de la Liga).
 */
export function goldGeometry(trophy) {
  const parts = [new THREE.LatheGeometry(v2(sharpen(bodyProfile(trophy))), trophy.segments ?? 48)]

  if (trophy.handles) {
    const h = handlePlacement(trophy)
    const arc = new THREE.TorusGeometry(h.R, h.tube, 10, 40, h.arc)
    arc.rotateZ(h.angle - h.arc / 2)
    arc.translate(h.center[0], h.center[1], 0)
    const rivets = h.ends.map(([x, y]) => new THREE.SphereGeometry(h.rivet, 14, 10).translate(x, y, 0))
    const right = mergeGeometries([arc, ...rivets])
    for (const g of [arc, ...rivets]) g.dispose()
    parts.push(right, right.clone().rotateY(Math.PI))
  }

  // Libertadores: mundo chico + figura del jugador pateando en la cima
  if (trophy.finial) {
    if (trophy.figurine) {
      parts.push(buildLibertadoresFigurine(trophy.finial))
    } else {
      parts.push(new THREE.SphereGeometry(trophy.finial.r, 28, 18).translate(0, trophy.finial.y, 0))
    }
  }

  // Intercontinental: pelota sostenida en el centro de la boca de la copa
  if (trophy.crownBall) {
    const { y, r } = trophy.crownBall
    parts.push(new THREE.SphereGeometry(r, 22, 16).translate(0, y, 0))
  }

  // Sudamericana: anillo inclinado que abraza el globo superior + nervaduras del fuste
  if (trophy.halo) {
    const { y, R, tube, tilt } = trophy.halo
    const ring = new THREE.TorusGeometry(R, tube, 12, 44)
    ring.rotateX(Math.PI / 2)
    ring.rotateZ(tilt)
    ring.translate(0, y, 0)
    parts.push(ring)
  }
  if (trophy.ribs) {
    const { count, y0, y1, r, tube } = trophy.ribs
    const h = y1 - y0
    const ym = (y0 + y1) / 2
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count
      const rib = new THREE.CylinderGeometry(tube, tube * 1.15, h, 6)
      rib.translate(Math.cos(a) * r, ym, Math.sin(a) * r)
      parts.push(rib)
    }
  }

  // Copa Argentina: aletas verticales facetadas que suben abriéndose + pelota adentro
  if (trophy.flutes) {
    const { count, y0, y1, r0, r1, tube } = trophy.flutes
    const dy = y1 - y0
    const dr = r1 - r0
    const len = Math.hypot(dr, dy)
    const tilt = Math.atan2(dr, dy)
    const rm = (r0 + r1) / 2
    const ym = (y0 + y1) / 2
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count
      const fin = new THREE.CylinderGeometry(tube * 0.85, tube * 0.6, len, 6)
      fin.rotateZ(-tilt)
      fin.translate(rm, ym, 0)
      fin.rotateY(a)
      parts.push(fin)
    }
  }
  if (trophy.innerBall) {
    const { y, r } = trophy.innerBall
    parts.push(new THREE.SphereGeometry(r, 22, 16).translate(0, y, 0))
  }

  // Primera División: asas laterales chicas dentro de la huella de la copa
  if (trophy.ears) {
    const { y, R, tube } = trophy.ears
    for (const s of [-1, 1]) {
      const ear = new THREE.TorusGeometry(R, tube, 8, 20, Math.PI * 1.1)
      ear.rotateZ(s * (-Math.PI / 2))
      ear.translate(s * 0.032, y, 0)
      parts.push(ear)
    }
  }

  const gold = mergeGeometries(parts)
  for (const p of parts) p.dispose()
  gold.translate(0, plinthHeight(trophy), 0)
  return gold
}

/**
 * Base de madera o mármol (no gira) con su aro y las chapitas metálicas de los
 * campeones alrededor del pedestal. Dos grupos para usar dos materiales en el
 * mismo InstancedMesh: 0 = madera/mármol, 1 = metal (chapitas y aros).
 */
export function plinthGeometry(trophy) {
  const square = trophy.plinth.shape === 'square'
  const pts = plinthProfile(trophy.plinth.steps)
  let base
  if (square) {
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
  const trimParts = []
  if (t.kind === 'plaque') {
    trimParts.push(new THREE.BoxGeometry(t.w, t.h, 0.003).translate(0, t.y, t.z).toNonIndexed())
  } else {
    const band = new THREE.LatheGeometry(v2([[t.r, t.y0], [t.r, t.y1]]), trophy.segments ?? 48)
    trimParts.push(band.toNonIndexed())
    band.dispose()

    // Chapitas metálicas de los campeones alrededor del cilindro de la base (p. ej. Libertadores)
    if (t.plaques) {
      const { rows, cols } = t.plaques
      const r = t.tierR - 0.0005
      const hSpan = t.tierH * 0.76
      const yStart = t.tierY + (t.tierH - hSpan) / 2
      const ph = Math.min(0.016, (hSpan / rows) * 0.68)
      const pw = Math.min(0.024, ((2 * Math.PI * r) / cols) * 0.58)
      for (let row = 0; row < rows; row++) {
        const py = yStart + ((row + 0.5) / rows) * hSpan
        for (let col = 0; col < cols; col++) {
          const a = ((col + (row % 2) * 0.5) * Math.PI * 2) / cols
          const plate = new THREE.BoxGeometry(pw, ph, 0.0024)
          plate.translate(0, py, r)
          plate.rotateY(a)
          trimParts.push(plate.toNonIndexed())
          plate.dispose()
        }
      }
    }
  }

  const trim = mergeGeometries(trimParts)
  for (const p of trimParts) p.dispose()
  const merged = mergeGeometries([base, trim], true)
  base.dispose()
  trim.dispose()
  return merged
}
