import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { room } from '../config/site'
import { seeded } from '../engine/math'
/** Altura del riel (donde apoyan los ganchos) */
export const RAIL_Y = 1.8
const LENGTH = 34
/** Madera de listones azul noche con veta, más un bump para las ranuras */
function slatTextures() {
  const size = 1024
  const rnd = seeded(7)
  const color = document.createElement('canvas')
  const bump = document.createElement('canvas')
  color.width = color.height = bump.width = bump.height = size
  const c = color.getContext('2d')
  const b = bump.getContext('2d')
  b.fillStyle = '#fff'
  b.fillRect(0, 0, size, size)
  const { dark, mid, grain, groove } = room.slats
  for (let i = 0; i < 8; i++) {
    const x0 = i * 128
    const k = 0.82 + rnd() * 0.36
    const rgb = (v, f = 1) => `rgb(${v[0] * k * f},${v[1] * k * f},${v[2] * k * f})`
    const g = c.createLinearGradient(x0, 0, x0 + 128, 0)
    g.addColorStop(0, rgb(dark))
    g.addColorStop(0.5, rgb(mid))
    g.addColorStop(1, rgb(dark, 0.88))
    c.fillStyle = g
    c.fillRect(x0, 0, 128, size)
    for (let n = 0; n < 46; n++) {
      const x = x0 + rnd() * 128
      const wob = (rnd() - 0.5) * 10
      c.strokeStyle = `rgba(${rnd() > 0.5 ? grain[0] : grain[1]},${0.05 + rnd() * 0.12})`
      c.lineWidth = 0.6 + rnd() * 1.6
      c.beginPath()
      c.moveTo(x, 0)
      c.bezierCurveTo(x + wob, size * 0.33, x - wob, size * 0.66, x, size)
      c.stroke()
    }
    c.fillStyle = groove
    c.fillRect(x0, 0, 12, size)
    const gb = b.createLinearGradient(x0, 0, x0 + 22, 0)
    gb.addColorStop(0, '#000')
    gb.addColorStop(0.55, '#000')
    gb.addColorStop(1, '#fff')
    b.fillStyle = gb
    b.fillRect(x0, 0, 22, size)
  }
  const map = new THREE.CanvasTexture(color)
  map.colorSpace = THREE.SRGBColorSpace
  const bumpMap = new THREE.CanvasTexture(bump)
  for (const t of [map, bumpMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(LENGTH / 0.9, 1)
  }
  return { map, bumpMap }
}
/** Halo de la tira LED sobre los listones */
function glowTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  const [a, b, d] = room.glow
  g.addColorStop(0, `rgba(${a.join(',')},1)`)
  g.addColorStop(0.25, `rgba(${b.join(',')},0.45)`)
  g.addColorStop(1, `rgba(${d.join(',')},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
/**
 * Arma el vestuario: pared de listones, cornisa con LED, banco con asiento,
 * zócalo, separadores, el riel y las luces. Devuelve el velo que oscurece la
 * escena cuando hay una remera en primer plano.
 */
export function buildRoom(scene, anisotropy, mobile) {
  const group = new THREE.Group()
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    m.receiveShadow = true
    group.add(m)
    return m
  }
  const { map, bumpMap } = slatTextures()
  map.anisotropy = anisotropy
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(LENGTH, 3.4),
    new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 2.5, roughness: 0.7, metalness: 0.05, color: room.slats.tint }),
  )
  wall.position.set(0, 1.7, -0.5)
  wall.receiveShadow = true
  group.add(wall)
  const trim = new THREE.MeshStandardMaterial({ color: room.trim, roughness: 0.5, metalness: 0.1 })
  const bench = new THREE.MeshStandardMaterial({ color: room.bench, roughness: 0.55 })
  const seat = new THREE.MeshStandardMaterial({ color: room.seat, roughness: 0.5 })
  const metal = new THREE.MeshStandardMaterial({ color: room.metal, roughness: 0.28, metalness: 1 })
  box(LENGTH, 1.6, 0.9, trim, 0, 3, -0.1) // cornisa
  const led = new THREE.Mesh(
    new THREE.BoxGeometry(LENGTH, 0.006, 0.03),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(...room.led), toneMapped: false }),
  )
  led.position.set(0, 2.194, -0.4)
  group.add(led)
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(LENGTH, 1.5),
    new THREE.MeshBasicMaterial({
      map: glowTexture(),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  glow.position.set(0, 2.2 - 0.75, -0.495)
  group.add(glow)
  box(LENGTH, 0.07, 0.95, bench, 0, 0.52, -0.05) // banco
  box(LENGTH, 0.06, 0.8, seat, 0, 0.585, -0.08) // asiento amarillo
  box(LENGTH, 0.5, 0.05, trim, 0, 0.25, 0.38) // frente del banco
  const kick = box(LENGTH, 0.012, 0.01, metal, 0, 0.5, 0.41)
  kick.receiveShadow = false
  for (let x = -16; x < LENGTH / 2; x += 1.9) {
    const divider = box(0.03, 1.66, 0.36, bench, x, 1.38, -0.32)
    divider.castShadow = true
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.39, 10), metal)
    post.position.set(x, 1.995, 0)
    group.add(post)
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, LENGTH, 16), metal)
  rail.rotation.z = Math.PI / 2
  rail.position.set(0, RAIL_Y, 0)
  rail.castShadow = true
  group.add(rail)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(LENGTH, 10),
    new THREE.MeshStandardMaterial({ color: room.floor, roughness: 0.35, metalness: 0.2 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.z = 3
  floor.receiveShadow = true
  group.add(floor)
  // Luces
  scene.add(new THREE.HemisphereLight(room.hemisphere[0], room.hemisphere[1], 0.2))
  const key = new THREE.DirectionalLight(room.key, 3.4)
  key.position.set(3.1, 4.6, 2.6)
  key.target.position.set(0, 1.2, 0)
  key.castShadow = true
  key.shadow.mapSize.setScalar(mobile ? 1024 : 2048)
  Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 2.2, bottom: -2.2, near: 1, far: 12 })
  key.shadow.bias = -0.0005
  key.shadow.normalBias = 0.009
  key.shadow.radius = 4
  scene.add(key, key.target)
  const fill = new THREE.DirectionalLight(room.fill, 0.55)
  fill.position.set(-3.5, 2.2, 3)
  scene.add(fill)
  const warm = new THREE.PointLight(room.warm, 2.2, 5, 1.6)
  warm.position.set(0, 2.1, 0.5)
  scene.add(warm)
  // Velo: oscurece el vestuario detrás de la remera seleccionada
  const dim = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 20),
    new THREE.MeshBasicMaterial({ color: room.dim, transparent: true, opacity: 0, depthWrite: false }),
  )
  dim.position.set(0, 1.3, 0.85)
  dim.visible = false
  scene.add(dim)
  scene.add(group)
  return { dim: dim, group }
}
/** Pelota: esfera con gajos pintados (blanca, azul y oro) */
function ballTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f2efe6'
  ctx.fillRect(0, 0, 1024, 512)
  const rnd = seeded(3)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * 128 + (row % 2) * 64 + 64
      const y = row * 128 + 64
      ctx.fillStyle = (row * 8 + col) % 5 === 0 ? '#f0c057' : '#14244f'
      ctx.beginPath()
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + rnd() * 0.2
        ctx.lineTo(x + Math.cos(a) * 34, y + Math.sin(a) * 26)
      }
      ctx.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
/** Toallas dobladas en pilas y pelotas sobre el banco */
export function buildProps(scene) {
  const group = new THREE.Group()
  const towel = new RoundedBoxGeometry(0.34, 0.042, 0.25, 4, 0.019)
  const [white, gold, blue] = room.towels.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }))
  const stack = (x, mats) =>
    mats.forEach((m, i) => {
      const t = new THREE.Mesh(towel, m)
      t.position.set(x + (i % 2 ? 0.008 : -0.006), 0.636 + i * 0.043, 0.06)
      t.rotation.y = (i - 1) * 0.07
      t.castShadow = t.receiveShadow = true
      group.add(t)
    })
  stack(-3.55, [white, blue, white])
  stack(-0.42, [white, gold, white])
  stack(3.45, [gold, white, blue])
  const ballGeo = new THREE.SphereGeometry(0.11, 48, 32)
  const ballMat = new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.45 })
  for (const [x, z, r] of [
    [-2.2, 0.02, 0.4],
    [1.52, 0.06, 1.7],
    [1.76, -0.12, 3.1],
    [4.3, 0, 2.6],
  ]) {
    const ball = new THREE.Mesh(ballGeo, ballMat)
    ball.position.set(x, 0.725, z)
    ball.rotation.set(r, r * 2.3, r * 0.7)
    ball.castShadow = ball.receiveShadow = true
    group.add(ball)
  }
  scene.add(group)
  return group
}
